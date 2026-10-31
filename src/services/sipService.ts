import * as JsSIP from 'jssip'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { UAConfiguration, CallOptions } from 'jssip/lib/UA'
import { notify } from '../utils/notify'

export interface SipAccountConfig {
  impi: string // e.g. "1126" (Extension máy nhánh)
  impu: string // e.g. "sip:1126@tongdai.zozin.vn"
  password: string // e.g. "locnuoc365"
  websocketProxyUrl: string // e.g. "wss://tongdai.zozin.vn:7443/ws"
  iceServerUrl?: string // e.g. "stun:stun.l.google.com:19302"
  realm?: string // e.g. "grandstream"
  displayName?: string // e.g. "1126"
}

export type SipRegistrationStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'registered'
  | 'unregistered'
  | 'registrationFailed'

export type SipCallStatus =
  | 'idle'
  | 'calling'
  | 'progress' // Đang đổ chuông máy khách (180 Ringing)
  | 'connected' // Khách đã nhấc máy (200 OK)
  | 'paused' // Giữ máy (Hold)
  | 'ended' // Kết thúc (BYE)
  | 'failed' // Bận máy, từ chối, lỗi mạng

export interface SipCallStateEvent {
  status: SipCallStatus
  session?: RTCSession | null
  direction?: 'incoming' | 'outgoing'
  remoteNumber?: string
  cause?: string
}

type RegistrationListener = (
  status: SipRegistrationStatus,
  details?: { cause?: string; response?: any },
) => void
type CallStateListener = (event: SipCallStateEvent) => void

/**
 * Service quản lý Softphone SIP WebRTC trên trình duyệt
 * Tương thích chuẩn RFC 7118 (JsSIP) kết nối tổng đài Grandstream / Asterisk PBX
 */
class SipService {
  private ua: JsSIP.UA | null = null
  private currentSession: RTCSession | null = null
  private audioElement: HTMLAudioElement | null = null
  private currentConfig: SipAccountConfig | null = null
  private ringToneAudioContext: AudioContext | null = null
  private ringOscillatorNode: OscillatorNode | null = null
  private ringGainNode: GainNode | null = null

  private registrationStatus: SipRegistrationStatus = 'disconnected'
  private callStatus: SipCallStatus = 'idle'

  private registrationListeners: Set<RegistrationListener> = new Set()
  private callStateListeners: Set<CallStateListener> = new Set()

  /**
   * Tạo hoặc lấy thẻ <audio> phát âm thanh cuộc gọi từ khách hàng
   */
  private getOrCreateAudioElement(): HTMLAudioElement {
    if (this.audioElement && document.body.contains(this.audioElement)) {
      return this.audioElement
    }

    let existing = document.getElementById(
      'sip-remote-audio',
    ) as HTMLAudioElement | null
    if (!existing) {
      existing = document.createElement('audio')
      existing.id = 'sip-remote-audio'
      existing.autoplay = true
      existing.style.display = 'none'
      document.body.appendChild(existing)
    }

    this.audioElement = existing
    return existing
  }

  /**
   * Phát âm thanh chuông chờ (Ringback tone) khi đang gọi đi
   */
  private startRingbackTone() {
    try {
      if (this.ringToneAudioContext) return
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return

      this.ringToneAudioContext = new AudioCtx()
      const ctx = this.ringToneAudioContext

      // Tạo âm bip chuông thoại tần số 425Hz (tiêu chuẩn viễn thông)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(425, ctx.currentTime)

      // Chu kỳ chuông: kêu 1s, nghỉ 2s
      const now = ctx.currentTime
      gain.gain.setValueAtTime(0, now)

      for (let i = 0; i < 20; i++) {
        const start = now + i * 3
        gain.gain.setValueAtTime(0.08, start)
        gain.gain.setValueAtTime(0, start + 1)
      }

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()

      this.ringOscillatorNode = osc
      this.ringGainNode = gain
    } catch (e) {
      console.warn('Không thể khởi tạo âm thanh chuông chờ:', e)
    }
  }

  /**
   * Dừng âm thanh chuông chờ
   */
  private stopRingbackTone() {
    try {
      if (this.ringOscillatorNode) {
        this.ringOscillatorNode.stop()
        this.ringOscillatorNode.disconnect()
        this.ringOscillatorNode = null
      }
      if (this.ringGainNode) {
        this.ringGainNode.disconnect()
        this.ringGainNode = null
      }
      if (this.ringToneAudioContext) {
        this.ringToneAudioContext.close()
        this.ringToneAudioContext = null
      }
    } catch {
      // ignore
    }
  }

  /**
   * Khởi tạo và đăng ký kết nối SIP UA tới tổng đài qua WebSocket WSS
   */
  public init(config: SipAccountConfig): void {
    if (
      this.ua &&
      this.currentConfig &&
      this.currentConfig.impi === config.impi &&
      this.currentConfig.websocketProxyUrl === config.websocketProxyUrl &&
      this.registrationStatus === 'registered'
    ) {
      return // Đã đăng ký với cấu hình này
    }

    // Nếu đang có UA cũ, dừng trước khi tạo mới
    if (this.ua) {
      this.destroy()
    }

    this.currentConfig = config
    this.updateRegistrationStatus('connecting')

    try {
      // 1. Khởi tạo WebSocket Interface
      const socket = new JsSIP.WebSocketInterface(config.websocketProxyUrl)

      // 2. Cấu hình User Agent (UA) chuẩn Grandstream / Asterisk
      const configuration: UAConfiguration = {
        sockets: [socket],
        uri: config.impu,
        password: config.password,
        authorization_user: config.impi,
        display_name: config.displayName || config.impi,
        realm: config.realm || 'grandstream',
        register: true,
        register_expires: 300,
        session_timers: false,
        use_preloaded_route: false,
      }

      this.ua = new JsSIP.UA(configuration)

      // 3. Lắng nghe sự kiện vòng đời UA
      this.ua.on('connected', () => {
        this.updateRegistrationStatus('connected')
      })

      this.ua.on('disconnected', (e: any) => {
        this.updateRegistrationStatus('disconnected', { cause: e?.error ? 'Lỗi mạng WebSocket' : undefined })
      })

      this.ua.on('registered', () => {
        this.updateRegistrationStatus('registered')
      })

      this.ua.on('unregistered', () => {
        this.updateRegistrationStatus('unregistered')
      })

      this.ua.on('registrationFailed', (e: any) => {
        this.updateRegistrationStatus('registrationFailed', {
          cause: e?.cause || 'Sai tài khoản hoặc máy chủ từ chối',
          response: e?.response,
        })
      })

      // 4. Lắng nghe cuộc gọi (cuộc gọi đến nếu có)
      this.ua.on('newRTCSession', (data: any) => {
        const session: RTCSession = data.session
        // Nếu là cuộc gọi đến (remote), gắn lắng nghe
        if (data.originator === 'remote') {
          this.bindSessionEvents(session, 'incoming')
        }
      })

      // Khởi động UA
      this.ua.start()
    } catch (err: any) {
      console.error('Lỗi khởi tạo SIP UA:', err)
      this.updateRegistrationStatus('registrationFailed', { cause: err?.message || 'Lỗi khởi tạo' })
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện đăng ký máy nhánh
   */
  public onRegistrationStatusChange(listener: RegistrationListener): () => void {
    this.registrationListeners.add(listener)
    listener(this.registrationStatus)
    return () => this.registrationListeners.delete(listener)
  }

  /**
   * Đăng ký lắng nghe sự kiện trạng thái cuộc gọi
   */
  public onCallStateChange(listener: CallStateListener): () => void {
    this.callStateListeners.add(listener)
    listener({ status: this.callStatus, session: this.currentSession })
    return () => this.callStateListeners.delete(listener)
  }

  private updateRegistrationStatus(
    status: SipRegistrationStatus,
    details?: { cause?: string; response?: any },
  ) {
    this.registrationStatus = status
    this.registrationListeners.forEach((l) => l(status, details))
  }

  private updateCallStatus(event: SipCallStateEvent) {
    this.callStatus = event.status
    this.callStateListeners.forEach((l) => l(event))
  }

  /**
   * Gắn các sự kiện WebRTC của một phiên đàm thoại RTCSession
   */
  private bindSessionEvents(
    session: RTCSession,
    direction: 'incoming' | 'outgoing',
  ) {
    this.currentSession = session

    // Gắn luồng âm thanh từ khách hàng khi kết nối WebRTC PeerConnection được thiết lập
    session.on('peerconnection', (data: any) => {
      const pc: RTCPeerConnection = data.peerconnection
      pc.addEventListener('track', (e: RTCTrackEvent) => {
        if (e.streams && e.streams[0]) {
          const audio = this.getOrCreateAudioElement()
          audio.srcObject = e.streams[0]
          audio.play().catch((err) => {
            console.warn('Lỗi tự động phát âm thanh cuộc gọi:', err)
          })
        }
      })
    })

    // Khi cuộc gọi bắt đầu kết nối
    session.on('connecting', () => {
      this.updateCallStatus({
        status: 'calling',
        session,
        direction,
        remoteNumber: session.remote_identity?.uri?.user,
      })
    })

    // Đang đổ chuông (180 Ringing)
    session.on('progress', () => {
      this.startRingbackTone()
      this.updateCallStatus({
        status: 'progress',
        session,
        direction,
        remoteNumber: session.remote_identity?.uri?.user,
      })
    })

    // Khách hàng nhấc máy (200 OK Confirmed)
    session.on('confirmed', () => {
      this.stopRingbackTone()
      this.updateCallStatus({
        status: 'connected',
        session,
        direction,
        remoteNumber: session.remote_identity?.uri?.user,
      })
    })

    // Đang giữ máy
    session.on('hold', () => {
      this.updateCallStatus({
        status: 'paused',
        session,
        direction,
      })
    })

    // Tiếp tục đàm thoại sau khi giữ máy
    session.on('unhold', () => {
      this.updateCallStatus({
        status: 'connected',
        session,
        direction,
      })
    })

    // Kết thúc cuộc gọi bình thường
    session.on('ended', (e: any) => {
      this.stopRingbackTone()
      this.cleanupAudio()
      this.currentSession = null
      this.updateCallStatus({
        status: 'ended',
        session: null,
        direction,
        cause: e?.cause,
      })
    })

    // Cuộc gọi thất bại (bận, từ chối, sai số)
    session.on('failed', (e: any) => {
      this.stopRingbackTone()
      this.cleanupAudio()
      this.currentSession = null
      this.updateCallStatus({
        status: 'failed',
        session: null,
        direction,
        cause: e?.cause || 'Cuộc gọi không thành công',
      })
    })
  }

  private cleanupAudio() {
    if (this.audioElement) {
      this.audioElement.srcObject = null
    }
  }

  /**
   * Thực hiện cuộc gọi tới chuỗi số dial_number (đã có đầu số nhà mạng 15/17)
   */
  public async call(dialNumber: string): Promise<RTCSession> {
    if (!this.ua) {
      throw new Error('Softphone SIP chưa được khởi tạo. Vui lòng kiểm tra lại cấu hình.')
    }

    if (!this.ua.isRegistered()) {
      notify('Máy nhánh SIP đang kết nối lại, vui lòng thử lại sau giây lát...')
      this.ua.register()
    }

    // 1. Yêu cầu cấp quyền Microphone từ trình duyệt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Dừng stream xin quyền tạm thời vì JsSIP sẽ tự mở stream thật khi gọi
      stream.getTracks().forEach((t) => t.stop())
    } catch (micErr: any) {
      notify('Trình duyệt chưa được cấp quyền Microphone để thực hiện cuộc gọi.')
      const err = new Error('Chưa cấp quyền Microphone: ' + (micErr?.message || micErr))
      ;(err as any).cause = micErr
      throw err
    }

    // 2. Cấu hình WebRTC Call Options
    const iceServers = this.currentConfig?.iceServerUrl
      ? [{ urls: this.currentConfig.iceServerUrl }]
      : [{ urls: 'stun:stun.l.google.com:19302' }]

    const callOptions: CallOptions = {
      mediaConstraints: { audio: true, video: false },
      pcConfig: { iceServers },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      },
    }

    // 3. Thực hiện quay số qua SIP INVITE
    const targetUri = `sip:${dialNumber}@${this.currentConfig?.realm || 'grandstream'}`
    const session = this.ua.call(targetUri, callOptions)

    this.bindSessionEvents(session, 'outgoing')
    this.startRingbackTone()

    return session
  }

  /**
   * Bật/Tắt Mic của cuộc gọi hiện tại
   */
  public toggleMute(): boolean {
    if (!this.currentSession) return false
    const isMuted = this.currentSession.isMuted().audio
    if (isMuted) {
      this.currentSession.unmute({ audio: true })
      return false
    } else {
      this.currentSession.mute({ audio: true })
      return true
    }
  }

  /**
   * Tắt Micro (Mute)
   */
  public mute(): void {
    if (this.currentSession && !this.currentSession.isMuted().audio) {
      this.currentSession.mute({ audio: true })
    }
  }

  /**
   * Bật lại Micro (Unmute)
   */
  public unmute(): void {
    if (this.currentSession && this.currentSession.isMuted().audio) {
      this.currentSession.unmute({ audio: true })
    }
  }

  /**
   * Bật/Tắt Giữ máy (Hold / Unhold)
   */
  public toggleHold(): boolean {
    if (!this.currentSession) return false
    const isOnHold = this.currentSession.isOnHold().local
    if (isOnHold) {
      this.currentSession.unhold()
      return false
    } else {
      this.currentSession.hold()
      return true
    }
  }

  /**
   * Giữ máy (Hold)
   */
  public hold(): void {
    if (this.currentSession && !this.currentSession.isOnHold().local) {
      this.currentSession.hold()
    }
  }

  /**
   * Tiếp tục cuộc gọi sau khi giữ máy (Unhold)
   */
  public unhold(): void {
    if (this.currentSession && this.currentSession.isOnHold().local) {
      this.currentSession.unhold()
    }
  }

  /**
   * Kết thúc cuộc gọi (Gác máy - BYE)
   */
  public hangup(): void {
    this.stopRingbackTone()
    if (this.currentSession) {
      try {
        this.currentSession.terminate()
      } catch (e) {
        console.warn('Lỗi khi kết thúc cuộc gọi:', e)
      }
      this.currentSession = null
    }
    this.cleanupAudio()
    this.updateCallStatus({ status: 'ended', session: null })
  }

  /**
   * Kiểm tra trạng thái đăng ký máy nhánh
   */
  public isRegistered(): boolean {
    return this.ua ? this.ua.isRegistered() : false
  }

  public getRegistrationStatus(): SipRegistrationStatus {
    return this.registrationStatus
  }

  public getCallStatus(): SipCallStatus {
    return this.callStatus
  }

  public getCurrentSession(): RTCSession | null {
    return this.currentSession
  }

  /**
   * Hủy kết nối và dọn dẹp tài nguyên
   */
  public destroy(): void {
    this.hangup()
    if (this.ua) {
      try {
        this.ua.stop()
      } catch {
        // ignore
      }
      this.ua = null
    }
    this.currentConfig = null
    this.updateRegistrationStatus('disconnected')
  }
}

// Xuất singleton instance để dùng xuyên suốt ứng dụng
export const sipService = new SipService()
export default sipService
