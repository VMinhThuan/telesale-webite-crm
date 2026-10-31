import * as JsSIP from 'jssip'
import type { RTCSession } from 'jssip/lib/RTCSession'
import type { UAConfiguration, CallOptions } from 'jssip/lib/UA'
import { notify } from '../utils/notify'

export interface SipAccountConfig {
  impi: string // Extension máy nhánh được cấp từ ERP
  impu: string // SIP AOR URI (sip:<extension>@<domain>)
  password: string // Mật khẩu SIP được cấp từ ERP
  websocketProxyUrl: string // Địa chỉ WebSocket WSS tổng đài
  iceServerUrl?: string // STUN / TURN server
  realm?: string // SIP authentication realm
  displayName?: string // Tên hiển thị caller ID
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
  lineId: number
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
 * Hỗ trợ mô hình Call Center nhiều line (Line Pool Session Registry)
 * Tương thích chuẩn RFC 7118 (JsSIP) kết nối tổng đài Grandstream / Asterisk / FreeSWITCH PBX
 */
class SipService {
  private ua: JsSIP.UA | null = null
  // Map quản lý từng RTCSession độc lập theo lineId (1, 2, 3...)
  private sessions: Map<number, RTCSession> = new Map()
  // Map quản lý trạng thái đàm thoại của từng line
  private lineStatuses: Map<number, SipCallStatus> = new Map()
  // Line hiện tại đang được nhân viên tương tác/nghe nói
  private activeLineId: number = 1
  // Map quản lý Audio Element riêng cho từng line
  private audioElements: Map<number, HTMLAudioElement> = new Map()

  private currentConfig: SipAccountConfig | null = null
  private ringToneAudioContext: AudioContext | null = null
  private ringOscillatorNode: OscillatorNode | null = null
  private ringGainNode: GainNode | null = null

  private registrationStatus: SipRegistrationStatus = 'disconnected'

  private registrationListeners: Set<RegistrationListener> = new Set()
  private callStateListeners: Set<CallStateListener> = new Set()

  /**
   * Đặt line đang active
   */
  public setActiveLineId(lineId: number): void {
    this.activeLineId = lineId
  }

  public getActiveLineId(): number {
    return this.activeLineId
  }

  /**
   * Tạo hoặc lấy thẻ <audio> phát âm thanh cuộc gọi riêng biệt cho từng line
   */
  private getOrCreateAudioElement(lineId: number): HTMLAudioElement {
    const existingAudio = this.audioElements.get(lineId)
    if (existingAudio && document.body.contains(existingAudio)) {
      return existingAudio
    }

    const elementId = `sip-remote-audio-line-${lineId}`
    let existing = document.getElementById(elementId) as HTMLAudioElement | null
    if (!existing) {
      existing = document.createElement('audio')
      existing.id = elementId
      existing.autoplay = true
      existing.style.display = 'none'
      document.body.appendChild(existing)
    }

    this.audioElements.set(lineId, existing)
    return existing
  }

  /**
   * Dọn dẹp luồng audio của line chỉ định
   */
  private cleanupAudio(lineId: number): void {
    const audio = this.audioElements.get(lineId)
    if (audio) {
      audio.srcObject = null
    }
  }

  /**
   * Dọn dẹp toàn bộ luồng audio
   */
  private cleanupAllAudio(): void {
    this.audioElements.forEach((audio) => {
      audio.srcObject = null
    })
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

      // 2. Cấu hình User Agent (UA) chuẩn Grandstream / Asterisk / FreeSWITCH
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

      // 4. Lắng nghe cuộc gọi đến (nếu có) -> Gán vào line rảnh đầu tiên
      this.ua.on('newRTCSession', (data: any) => {
        const session: RTCSession = data.session
        if (data.originator === 'remote') {
          let freeLineId = 1
          for (let i = 1; i <= 3; i++) {
            if (!this.sessions.has(i)) {
              freeLineId = i
              break
            }
          }
          this.bindSessionEvents(session, freeLineId, 'incoming')
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
    listener({
      lineId: this.activeLineId,
      status: this.getCallStatus(this.activeLineId),
      session: this.getCurrentSession(),
    })
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
    this.lineStatuses.set(event.lineId, event.status)
    this.callStateListeners.forEach((l) => l(event))
  }

  /**
   * Gắn các sự kiện WebRTC của một phiên đàm thoại RTCSession theo lineId
   */
  private bindSessionEvents(
    session: RTCSession,
    lineId: number,
    direction: 'incoming' | 'outgoing',
  ) {
    this.sessions.set(lineId, session)

    // Gắn luồng âm thanh từ khách hàng khi kết nối WebRTC PeerConnection được thiết lập
    session.on('peerconnection', (data: any) => {
      const pc: RTCPeerConnection = data.peerconnection
      pc.addEventListener('track', (e: RTCTrackEvent) => {
        if (e.streams && e.streams[0]) {
          const audio = this.getOrCreateAudioElement(lineId)
          audio.srcObject = e.streams[0]
          audio.play().catch((err) => {
            console.warn(`[SIP Line ${lineId}] Lỗi tự động phát âm thanh cuộc gọi:`, err)
          })
        }
      })
    })

    // Khi cuộc gọi bắt đầu kết nối
    session.on('connecting', () => {
      this.updateCallStatus({
        lineId,
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
        lineId,
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
        lineId,
        status: 'connected',
        session,
        direction,
        remoteNumber: session.remote_identity?.uri?.user,
      })
    })

    // Đang giữ máy
    session.on('hold', () => {
      this.updateCallStatus({
        lineId,
        status: 'paused',
        session,
        direction,
      })
    })

    // Tiếp tục đàm thoại sau khi giữ máy
    session.on('unhold', () => {
      this.updateCallStatus({
        lineId,
        status: 'connected',
        session,
        direction,
      })
    })

    // Kết thúc cuộc gọi bình thường
    session.on('ended', (e: any) => {
      this.stopRingbackTone()
      this.cleanupAudio(lineId)
      this.sessions.delete(lineId)
      this.updateCallStatus({
        lineId,
        status: 'ended',
        session: null,
        direction,
        cause: e?.cause,
      })
    })

    // Cuộc gọi thất bại (bận, từ chối, sai số)
    session.on('failed', (e: any) => {
      this.stopRingbackTone()
      this.cleanupAudio(lineId)
      this.sessions.delete(lineId)
      this.updateCallStatus({
        lineId,
        status: 'failed',
        session: null,
        direction,
        cause: e?.cause || 'Cuộc gọi không thành công',
      })
    })
  }

  /**
   * Thực hiện cuộc gọi tới chuỗi số dialNumber gắn với lineId chỉ định
   */
  public async call(lineId: number, dialNumber: string): Promise<RTCSession>
  public async call(dialNumber: string): Promise<RTCSession>
  public async call(arg1: number | string, arg2?: string): Promise<RTCSession> {
    const targetLineId = typeof arg1 === 'number' ? arg1 : this.activeLineId
    const dialNumber = typeof arg1 === 'number' ? (arg2 || '') : arg1

    if (!this.ua) {
      throw new Error('Softphone SIP chưa được khởi tạo. Vui lòng kiểm tra lại cấu hình.')
    }

    if (!this.ua.isRegistered()) {
      notify('Máy nhánh SIP đang kết nối lại tới tổng đài. Vui lòng đợi trong giây lát...')
      this.ua.register()
      throw new Error('Máy nhánh SIP chưa hoàn tất đăng ký với tổng đài. Vui lòng thử lại sau giây lát.')
    }

    // 1. Yêu cầu cấp quyền Microphone từ trình duyệt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Dừng stream xin quyền tạm thời vì JsSIP sẽ tự mở stream thật khi gọi
      stream.getTracks().forEach((t) => t.stop())
    } catch (micErr: any) {
      notify('Trình duyệt chưa được cấp quyền Microphone để thực hiện cuộc gọi.')
      const err = new Error('Chưa cấp quyền Microphone: ' + (micErr?.message || micErr))
        ; (err as any).cause = micErr
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

    // 3. Trích xuất SIP Domain chuẩn từ impu nếu có (e.g. sip:1126@tongdai.zozin.vn -> tongdai.zozin.vn)
    let sipDomain = this.currentConfig?.realm || 'grandstream'
    if (this.currentConfig?.impu) {
      const match = this.currentConfig.impu.match(/@([^:;\s>]+)/)
      if (match && match[1]) {
        sipDomain = match[1]
      }
    }

    // 4. Thực hiện quay số qua SIP INVITE
    const targetUri = `sip:${dialNumber}@${sipDomain}`
    const session = this.ua.call(targetUri, callOptions)

    this.bindSessionEvents(session, targetLineId, 'outgoing')
    this.startRingbackTone()

    return session
  }

  /**
   * Bật/Tắt Mic của cuộc gọi (theo lineId hoặc line active)
   */
  public toggleMute(lineId?: number): boolean {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (!session) return false
    const isMuted = session.isMuted().audio
    if (isMuted) {
      session.unmute({ audio: true })
      return false
    } else {
      session.mute({ audio: true })
      return true
    }
  }

  /**
   * Tắt Micro (Mute) theo lineId
   */
  public mute(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && !session.isMuted().audio) {
      session.mute({ audio: true })
    }
  }

  /**
   * Bật lại Micro (Unmute) theo lineId
   */
  public unmute(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && session.isMuted().audio) {
      session.unmute({ audio: true })
    }
  }

  /**
   * Bật/Tắt Giữ máy (Hold / Unhold) theo lineId
   */
  public toggleHold(lineId?: number): boolean {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (!session) return false
    const isOnHold = session.isOnHold().local
    if (isOnHold) {
      session.unhold()
      return false
    } else {
      session.hold()
      return true
    }
  }

  /**
   * Giữ máy (Hold) theo lineId
   */
  public hold(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && !session.isOnHold().local) {
      session.hold()
    }
  }

  /**
   * Tiếp tục cuộc gọi sau khi giữ máy (Unhold) theo lineId
   */
  public unhold(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && session.isOnHold().local) {
      session.unhold()
    }
  }

  /**
   * Kết thúc cuộc gọi theo lineId (Gác máy - BYE)
   */
  public hangup(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    this.stopRingbackTone()
    if (session) {
      try {
        session.terminate()
      } catch (e) {
        console.warn(`[SIP Line ${targetLineId}] Lỗi khi kết thúc cuộc gọi:`, e)
      }
      this.sessions.delete(targetLineId)
    }
    this.cleanupAudio(targetLineId)
    this.updateCallStatus({ lineId: targetLineId, status: 'ended', session: null })
  }

  /**
   * Kết thúc toàn bộ cuộc gọi trên tất cả các line (Dùng khi logout hoặc đóng app)
   */
  public hangupAll(): void {
    this.stopRingbackTone()
    this.sessions.forEach((session, lineId) => {
      try {
        session.terminate()
      } catch (e) {
        console.warn(`[SIP Line ${lineId}] Lỗi khi gác máy:`, e)
      }
      this.cleanupAudio(lineId)
    })
    this.sessions.clear()
    this.lineStatuses.clear()
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

  public getCallStatus(lineId?: number): SipCallStatus {
    const targetLineId = lineId ?? this.activeLineId
    return this.lineStatuses.get(targetLineId) || 'idle'
  }

  public getCurrentSession(lineId?: number): RTCSession | null {
    const targetLineId = lineId ?? this.activeLineId
    return this.sessions.get(targetLineId) || null
  }

  public getAllSessions(): Map<number, RTCSession> {
    return this.sessions
  }

  /**
   * Hủy kết nối và dọn dẹp toàn bộ tài nguyên
   */
  public destroy(): void {
    this.hangupAll()
    if (this.ua) {
      try {
        this.ua.stop()
      } catch {
        // ignore
      }
      this.ua = null
    }
    this.currentConfig = null
    this.cleanupAllAudio()
    this.updateRegistrationStatus('disconnected')
  }
}

// Xuất singleton instance để dùng xuyên suốt ứng dụng
export const sipService = new SipService()
export default sipService
