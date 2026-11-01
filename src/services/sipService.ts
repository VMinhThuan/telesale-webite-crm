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
  // Map quản lý các lượt khởi tạo cuộc gọi đang chuẩn bị (in-flight preparation) theo lineId để hỗ trợ hủy giữa chừng
  private pendingCallAttempts: Map<number, { attemptId: number; aborted: boolean }> = new Map()

  private currentConfig: SipAccountConfig | null = null
  private ringToneAudioContext: AudioContext | null = null
  private ringOscillatorNode: OscillatorNode | null = null
  private ringGainNode: GainNode | null = null

  private registrationStatus: SipRegistrationStatus = 'disconnected'

  // Quản lý tự động thử lại đăng ký khi mạng chập chờn / timeout
  private registrationRetryTimer: ReturnType<typeof setTimeout> | null = null
  private registrationRetryAttempts: number = 0
  // Watchdog phát hiện WebSocket rớt kết nối kéo dài để tái tạo kết nối mới
  private disconnectWatchdogTimer: ReturnType<typeof setTimeout> | null = null

  private registrationListeners: Set<RegistrationListener> = new Set()
  private callStateListeners: Set<CallStateListener> = new Set()

  /**
   * Đặt line đang active và kích hoạt điều phối Audio Focus
   */
  public setActiveLineId(lineId: number): void {
    this.activeLineId = lineId
    this.applyAudioFocus(lineId)
  }

  public getActiveLineId(): number {
    return this.activeLineId
  }

  /**
   * Bộ điều phối Audio Focus tập trung (Audio Focus Manager):
   * Đảm bảo bất biến (Invariant): Tại một thời điểm, chỉ một line duy nhất được mở mic và phát âm thanh ra loa.
   * Tất cả các line còn lại bị ngắt tiếng cục bộ lập tức (0ms) và được chuyển sang trạng thái giữ máy (Hold).
   */
  public applyAudioFocus(targetLineId: number): void {
    this.activeLineId = targetLineId

    // 1. Điều phối thẻ <audio> phát âm thanh ra loa/tai nghe (0ms delay)
    this.audioElements.forEach((audio, lineId) => {
      const isTarget = lineId === targetLineId
      audio.muted = !isTarget
      audio.volume = isTarget ? 1.0 : 0.0
      if (isTarget && audio.paused && audio.srcObject) {
        audio.play().catch(() => { })
      }
    })

    // 2. Điều phối Microphone và lệnh Giữ máy (SIP Hold/Unhold) giữa các phiên đàm thoại
    this.sessions.forEach((session, lineId) => {
      if (session.isEnded()) return

      if (lineId === targetLineId) {
        // Line được focus: Mở microphone
        if (session.isMuted().audio) {
          session.unmute({ audio: true })
        }
        // Nếu line này đang bị hold, gửi lệnh unhold để tiếp tục đàm thoại
        if (session.isOnHold().local) {
          session.unhold()
        }
      } else {
        // Line không được focus: Ngắt microphone lập tức để không lọt tiếng sang khách hàng
        if (!session.isMuted().audio) {
          session.mute({ audio: true })
        }
        // Nếu line này đang đàm thoại (connected) và chưa hold, tự động gửi lệnh giữ máy
        if (!session.isOnHold().local) {
          session.hold()
        }
      }
    })
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
      try {
        audio.pause()
      } catch {
        // ignore
      }
      audio.srcObject = null
    }
  }

  /**
   * Dọn dẹp toàn bộ luồng audio
   */
  private cleanupAllAudio(): void {
    this.audioElements.forEach((audio) => {
      try {
        audio.pause()
      } catch {
        // ignore
      }
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

  private clearRegistrationRetry(): void {
    if (this.registrationRetryTimer) {
      clearTimeout(this.registrationRetryTimer)
      this.registrationRetryTimer = null
    }
    this.registrationRetryAttempts = 0
  }

  private clearDisconnectWatchdog(): void {
    if (this.disconnectWatchdogTimer) {
      clearTimeout(this.disconnectWatchdogTimer)
      this.disconnectWatchdogTimer = null
    }
  }

  private startDisconnectWatchdog(): void {
    if (this.disconnectWatchdogTimer) return
    this.disconnectWatchdogTimer = setTimeout(() => {
      this.disconnectWatchdogTimer = null
      if (this.hasActiveCalls()) return
      if (this.currentConfig && (!this.ua || !this.ua.isConnected())) {
        console.warn('[SIP Watchdog] WebSocket mất kết nối kéo dài > 20s. Tự động tái tạo UA mới.')
        const savedConfig = this.currentConfig
        this.destroy()
        this.init(savedConfig)
      }
    }, 20000)
  }

  private scheduleRegistrationRetry(cause?: string): void {
    if (this.registrationRetryTimer) return
    if (this.hasActiveCalls()) return
    if (!this.currentConfig) return

    // Không thử lại nếu lỗi xác thực sai mật khẩu hoặc tài khoản không tồn tại
    if (cause === 'Invalid Credentials' || cause === 'User Not Found') {
      console.warn('[SIP] Sai thông tin tài khoản máy nhánh. Dừng thử lại tự động.')
      return
    }

    const delay = Math.min(3000 * Math.pow(2, this.registrationRetryAttempts), 30000)
    this.registrationRetryAttempts++

    console.log(
      `[SIP] Lập lịch thử đăng ký lại lần ${this.registrationRetryAttempts} sau ${delay / 1000}s (nguyên nhân: ${cause || 'Lỗi mạng'})...`,
    )

    this.registrationRetryTimer = setTimeout(() => {
      this.registrationRetryTimer = null
      if (!this.currentConfig) return
      if (this.hasActiveCalls()) return

      if (this.ua && this.ua.isConnected()) {
        try {
          this.updateRegistrationStatus('connecting')
          this.ua.register()
        } catch (err) {
          console.warn('[SIP] Lỗi khi thử lại ua.register():', err)
          this.scheduleRegistrationRetry('Retry Exception')
        }
      } else {
        // Tái tạo lại UA để mở kết nối WebSocket mới
        this.init(this.currentConfig)
      }
    }, delay)
  }

  /**
   * Khởi tạo và đăng ký kết nối SIP UA tới tổng đài qua WebSocket WSS
   */
  public init(config: SipAccountConfig): void {
    const isSameConfig =
      this.currentConfig &&
      this.currentConfig.impi === config.impi &&
      this.currentConfig.websocketProxyUrl === config.websocketProxyUrl &&
      this.currentConfig.password === config.password

    // 1. Nếu đã có UA với cùng cấu hình tài khoản
    if (this.ua && isSameConfig) {
      // Bảo vệ: Nếu đang có cuộc gọi hoạt động trên bất kỳ line nào -> TUYỆT ĐỐI KHÔNG destroy!
      if (this.hasActiveCalls()) {
        if (!this.ua.isRegistered() && this.ua.isConnected()) {
          try {
            this.ua.register()
          } catch (e) {
            console.warn('[SIP] Lỗi re-register khi đang có cuộc gọi:', e)
          }
        }
        return
      }

      // Nếu đã đăng ký thành công hoặc đang trong tiến trình kết nối -> Không làm gì cả
      if (
        this.registrationStatus === 'registered' ||
        this.registrationStatus === 'connecting'
      ) {
        return
      }

      // Nếu socket transport vẫn đang mở (connected) -> Thử gọi ua.register()
      if (this.ua.isConnected()) {
        try {
          this.updateRegistrationStatus('connecting')
          this.ua.register()
          return
        } catch (e) {
          console.warn('[SIP] Lỗi re-register khi socket đang mở:', e)
        }
      }

      // Nếu socket transport bị ngắt hoặc register thất bại, tiếp tục xuống dưới để tái tạo UA mới
    }

    // 2. Chỉ destroy khi tài khoản thực sự thay đổi (đổi user khác) hoặc chưa từng có UA / socket đã hỏng
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
        this.clearDisconnectWatchdog()
        this.updateRegistrationStatus('connected')
      })

      this.ua.on('disconnected', (e: any) => {
        this.updateRegistrationStatus('disconnected', {
          cause: e?.error ? 'Lỗi mạng WebSocket' : undefined,
        })
        this.startDisconnectWatchdog()
      })

      this.ua.on('registered', () => {
        this.clearRegistrationRetry()
        this.clearDisconnectWatchdog()
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
        this.scheduleRegistrationRetry(e?.cause)
      })

      // 4. Lắng nghe cuộc gọi đến (nếu có) -> Gán vào line rảnh đầu tiên hoặc từ chối 486 Busy Here khi cả 3 line bận
      this.ua.on('newRTCSession', (data: any) => {
        const session: RTCSession = data.session
        if (data.originator === 'remote') {
          let freeLineId: number | null = null
          for (let i = 1; i <= 3; i++) {
            if (!this.sessions.has(i)) {
              freeLineId = i
              break
            }
          }

          // Phòng thủ: Khi cả 3 line đều đang bận, từ chối cuộc gọi đến với mã chuẩn SIP 486 Busy Here
          if (freeLineId === null) {
            console.warn(
              '[SIP] Cả 3 line đều đang bận. Từ chối cuộc gọi đến (486 Busy Here) từ:',
              session.remote_identity?.uri?.user,
            )
            try {
              session.terminate({
                status_code: 486,
                reason_phrase: 'Busy Here',
              })
            } catch (err) {
              console.warn('[SIP] Lỗi khi gửi 486 Busy Here:', err)
            }
            return
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
   * Thiết lập và lắng nghe luồng âm thanh (Remote Audio Track) từ WebRTC RTCPeerConnection
   */
  private attachPeerConnection(pc: RTCPeerConnection, lineId: number): void {
    // Tránh đăng ký trùng lặp nhiều lần trên cùng một RTCPeerConnection instance
    const pcKey = `__attached_line_${lineId}`
    if ((pc as any)[pcKey]) return
      ; (pc as any)[pcKey] = true

    pc.addEventListener('track', (e: RTCTrackEvent) => {
      const audio = this.getOrCreateAudioElement(lineId)
      if (e.streams && e.streams[0]) {
        audio.srcObject = e.streams[0]
      } else if (e.track) {
        audio.srcObject = new MediaStream([e.track])
      }

      // Áp dụng Audio Focus Invariant:
      // Chỉ mở tiếng nếu lineId này đúng là activeLineId, ngược lại mute ngay lập tức (0ms delay)
      const isTarget = lineId === this.activeLineId
      audio.muted = !isTarget
      audio.volume = isTarget ? 1.0 : 0.0

      audio.play().catch((err) => {
        console.warn(`[SIP Line ${lineId}] Lỗi tự động phát âm thanh cuộc gọi:`, err)
      })
    })
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

    // Helper kiểm tra xem session hiện tại trên lineId có đúng là session này không
    // (Bảo vệ chống race condition: event cũ kích hoạt sau khi line đã được tái sử dụng cho session mới)
    const isCurrentSession = () => this.sessions.get(lineId) === session

    // 1. Gắn luồng âm thanh ngay lập tức nếu RTCPeerConnection đã được khởi tạo sẵn
    // (Đặc biệt quan trọng với cuộc gọi đi outgoing vì ua.call() tạo PeerConnection trước khi trả về session)
    if (session.connection) {
      this.attachPeerConnection(session.connection, lineId)
    }

    // 2. Lắng nghe sự kiện 'peerconnection' (cuộc gọi đến incoming sau khi answer, hoặc khi tái thương lượng SDP)
    session.on('peerconnection', (data: any) => {
      if (!isCurrentSession()) return
      const pc: RTCPeerConnection = data?.peerconnection || session.connection
      if (pc) {
        this.attachPeerConnection(pc, lineId)
      }
    })

    // Khi cuộc gọi bắt đầu kết nối
    session.on('connecting', () => {
      if (!isCurrentSession()) return
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
      if (!isCurrentSession()) return
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
      if (!isCurrentSession()) return
      this.stopRingbackTone()

      // Kiểm tra Audio Focus khi có khách hàng nhấc máy:
      // Nếu line active hiện tại khác lineId và đang đàm thoại (connected và không hold)
      const currentActiveId = this.activeLineId
      const currentActiveSession = this.sessions.get(currentActiveId)
      const isAnotherLineTalking =
        currentActiveId !== lineId &&
        currentActiveSession &&
        !currentActiveSession.isEnded() &&
        !currentActiveSession.isOnHold().local &&
        this.lineStatuses.get(currentActiveId) === 'connected'

      if (isAnotherLineTalking) {
        // Line khác đang đàm thoại: Line này nghe máy sau -> Tự động giữ máy và mute loa/mic line này (0ms)
        console.log(
          `[SIP Audio Manager] Line ${lineId} nhấc máy khi Line ${currentActiveId} đang đàm thoại. Tự động giữ máy Line ${lineId}.`,
        )
        const audio = this.getOrCreateAudioElement(lineId)
        audio.muted = true
        audio.volume = 0.0
        session.mute({ audio: true })

        setTimeout(() => {
          if (isCurrentSession()) {
            session.hold()
          }
        }, 50)

        this.updateCallStatus({
          lineId,
          status: 'paused',
          session,
          direction,
          remoteNumber: session.remote_identity?.uri?.user,
        })
      } else {
        // Chưa có line nào đang đàm thoại: Trao Audio Focus cho line vừa nhấc máy này!
        this.setActiveLineId(lineId)
        this.updateCallStatus({
          lineId,
          status: 'connected',
          session,
          direction,
          remoteNumber: session.remote_identity?.uri?.user,
        })
      }
    })

    // Đang giữ máy
    session.on('hold', () => {
      if (!isCurrentSession()) return
      const audio = this.getOrCreateAudioElement(lineId)
      audio.muted = true
      audio.volume = 0.0

      this.updateCallStatus({
        lineId,
        status: 'paused',
        session,
        direction,
      })
    })

    // Tiếp tục đàm thoại sau khi giữ máy
    session.on('unhold', () => {
      if (!isCurrentSession()) return
      const audio = this.getOrCreateAudioElement(lineId)
      const isTarget = lineId === this.activeLineId
      audio.muted = !isTarget
      audio.volume = isTarget ? 1.0 : 0.0

      this.updateCallStatus({
        lineId,
        status: 'connected',
        session,
        direction,
      })
    })

    // Kết thúc cuộc gọi bình thường
    session.on('ended', (e: any) => {
      if (!isCurrentSession()) {
        console.warn(`[SIP] Bỏ qua event 'ended' của session cũ trên Line ${lineId}`)
        return
      }
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

      // Tự động phục hồi Audio Focus sang line còn lại (nếu có)
      if (lineId === this.activeLineId) {
        let nextFocusLine: number | null = null
        for (const [otherLineId, otherSession] of this.sessions.entries()) {
          if (otherLineId !== lineId && otherSession && !otherSession.isEnded()) {
            nextFocusLine = otherLineId
            break
          }
        }
        if (nextFocusLine !== null) {
          console.log(
            `[SIP Audio Manager] Line ${lineId} kết thúc. Tự động chuyển Audio Focus sang Line ${nextFocusLine}.`,
          )
          this.setActiveLineId(nextFocusLine)
        }
      }
    })

    // Cuộc gọi thất bại (bận, từ chối, sai số)
    session.on('failed', (e: any) => {
      if (!isCurrentSession()) {
        console.warn(`[SIP] Bỏ qua event 'failed' của session cũ trên Line ${lineId}`)
        return
      }
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

      // Tự động phục hồi Audio Focus sang line còn lại (nếu có)
      if (lineId === this.activeLineId) {
        let nextFocusLine: number | null = null
        for (const [otherLineId, otherSession] of this.sessions.entries()) {
          if (otherLineId !== lineId && otherSession && !otherSession.isEnded()) {
            nextFocusLine = otherLineId
            break
          }
        }
        if (nextFocusLine !== null) {
          console.log(
            `[SIP Audio Manager] Line ${lineId} thất bại. Tự động chuyển Audio Focus sang Line ${nextFocusLine}.`,
          )
          this.setActiveLineId(nextFocusLine)
        }
      }
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

    // 0. Tạo và đánh dấu attemptId mới cho line này nhằm hỗ trợ hủy giữa chừng
    const attemptId = Date.now() + Math.random()
    this.pendingCallAttempts.set(targetLineId, { attemptId, aborted: false })

    const isAttemptAborted = () => {
      const current = this.pendingCallAttempts.get(targetLineId)
      return !current || current.attemptId !== attemptId || current.aborted
    }

    if (!this.ua) {
      this.pendingCallAttempts.delete(targetLineId)
      throw new Error('Softphone SIP chưa được khởi tạo. Vui lòng kiểm tra lại cấu hình.')
    }

    if (!this.ua.isRegistered()) {
      this.pendingCallAttempts.delete(targetLineId)
      notify('Máy nhánh SIP đang kết nối lại tới tổng đài. Vui lòng đợi trong giây lát...')
      this.ua.register()
      throw new Error('Máy nhánh SIP chưa hoàn tất đăng ký với tổng đài. Vui lòng thử lại sau giây lát.')
    }

    // Kiểm tra hủy trước khi xin quyền mic
    if (isAttemptAborted()) {
      this.pendingCallAttempts.delete(targetLineId)
      throw new Error(`Cuộc gọi Line ${targetLineId} đã bị hủy trước khi bắt đầu.`)
    }

    // 1. Yêu cầu cấp quyền Microphone từ trình duyệt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Dừng stream xin quyền tạm thời vì JsSIP sẽ tự mở stream thật khi gọi
      stream.getTracks().forEach((t) => t.stop())
    } catch (micErr: any) {
      this.pendingCallAttempts.delete(targetLineId)
      notify('Trình duyệt chưa được cấp quyền Microphone để thực hiện cuộc gọi.')
      const err = new Error('Chưa cấp quyền Microphone: ' + (micErr?.message || micErr))
        ; (err as any).cause = micErr
      throw err
    }

    // Kiểm tra hủy ngay sau khi getUserMedia hoàn tất (nhân viên có thể bấm gác máy trong lúc chờ mic)
    if (isAttemptAborted()) {
      this.pendingCallAttempts.delete(targetLineId)
      throw new Error(`Cuộc gọi Line ${targetLineId} đã bị hủy trong quá trình xin quyền microphone.`)
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
      eventHandlers: {
        peerconnection: (data: any) => {
          const pc: RTCPeerConnection = data?.peerconnection
          if (pc) {
            this.attachPeerConnection(pc, targetLineId)
          }
        },
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

    // Kiểm tra hủy lần cuối trước khi gọi SIP INVITE
    if (isAttemptAborted()) {
      this.pendingCallAttempts.delete(targetLineId)
      throw new Error(`Cuộc gọi Line ${targetLineId} đã bị hủy trước khi gửi INVITE.`)
    }

    // 4. Thực hiện quay số qua SIP INVITE
    const targetUri = `sip:${dialNumber}@${sipDomain}`
    const session = this.ua.call(targetUri, callOptions)

    // Nếu xảy ra race condition bị hủy ngay khoảnh khắc tạo session, terminate lập tức
    if (isAttemptAborted()) {
      try {
        session.terminate()
      } catch {
        // ignore
      }
      this.pendingCallAttempts.delete(targetLineId)
      throw new Error(`Cuộc gọi Line ${targetLineId} đã bị hủy ngay khi tạo session.`)
    }

    this.pendingCallAttempts.delete(targetLineId)

    // Đảm bảo gắn kết nối audio ngay khi session được trả về
    if (session.connection) {
      this.attachPeerConnection(session.connection, targetLineId)
    }

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
   * @returns boolean (true: đang hold, false: đang unhold/connected) nếu thao tác thành công, hoặc null nếu thao tác thất bại / session chưa sẵn sàng
   */
  public toggleHold(lineId?: number): boolean | null {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (!session) return null
    const isOnHold = session.isOnHold().local
    if (isOnHold) {
      const ok = session.unhold()
      if (!ok) {
        console.warn(`[SIP] session.unhold() thất bại trên line ${targetLineId} (session chưa sẵn sàng re-offer)`)
        return null
      }
      return false
    } else {
      const ok = session.hold()
      if (!ok) {
        console.warn(`[SIP] session.hold() thất bại trên line ${targetLineId} (session chưa sẵn sàng re-offer hoặc chưa confirmed)`)
        return null
      }
      return true
    }
  }

  /**
   * Giữ máy (Hold) theo lineId
   * @returns boolean - true nếu gửi yêu cầu hold thành công, false nếu thất bại hoặc không có session
   */
  public hold(lineId?: number): boolean {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && !session.isOnHold().local) {
      const ok = session.hold()
      if (!ok) {
        console.warn(`[SIP] session.hold() thất bại trên line ${targetLineId}`)
        return false
      }
      return true
    }
    return false
  }

  /**
   * Tiếp tục cuộc gọi sau khi giữ máy (Unhold) theo lineId
   * @returns boolean - true nếu gửi yêu cầu unhold thành công, false nếu thất bại hoặc không có session
   */
  public unhold(lineId?: number): boolean {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (session && session.isOnHold().local) {
      const ok = session.unhold()
      if (!ok) {
        console.warn(`[SIP] session.unhold() thất bại trên line ${targetLineId}`)
        return false
      }
      return true
    }
    return false
  }

  /**
   * Trả lời cuộc gọi đến (theo lineId chỉ định hoặc line active)
   */
  public answer(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId
    const session = this.sessions.get(targetLineId)
    if (!session) return

    const iceServers = this.currentConfig?.iceServerUrl
      ? [{ urls: this.currentConfig.iceServerUrl }]
      : [{ urls: 'stun:stun.l.google.com:19302' }]

    try {
      session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers },
      })
      if (session.connection) {
        this.attachPeerConnection(session.connection, targetLineId)
      }
    } catch (err) {
      console.warn(`[SIP Line ${targetLineId}] Lỗi khi trả lời cuộc gọi:`, err)
    }
  }

  /**
   * Kết thúc cuộc gọi theo lineId (Gác máy - BYE)
   */
  public hangup(lineId?: number): void {
    const targetLineId = lineId ?? this.activeLineId

    // Đánh dấu hủy bất kỳ attempt in-flight nào đang trong quá trình chuẩn bị / getUserMedia
    const pending = this.pendingCallAttempts.get(targetLineId)
    if (pending) {
      pending.aborted = true
      this.pendingCallAttempts.delete(targetLineId)
    }

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
    this.pendingCallAttempts.forEach((pending) => {
      pending.aborted = true
    })
    this.pendingCallAttempts.clear()

    this.sessions.forEach((session, lineId) => {
      try {
        session.terminate()
      } catch (e) {
        console.warn(`[SIP Line ${lineId}] Lỗi khi gác máy:`, e)
      }
      this.cleanupAudio(lineId)
      this.updateCallStatus({ lineId, status: 'ended', session: null })
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
   * Kiểm tra xem hiện tại có cuộc gọi nào đang hoạt động trên bất kỳ line nào không
   */
  public hasActiveCalls(): boolean {
    for (const session of this.sessions.values()) {
      if (session && !session.isEnded()) {
        return true
      }
    }
    return false
  }

  /**
   * Kiểm tra xem WebSocket WSS có đang duy trì kết nối hay không
   */
  public isConnected(): boolean {
    return this.ua ? this.ua.isConnected() : false
  }

  /**
   * Hủy kết nối và dọn dẹp toàn bộ tài nguyên
   */
  public destroy(): void {
    this.clearRegistrationRetry()
    this.clearDisconnectWatchdog()
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
