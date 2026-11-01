/**
 * Service quản lý quyền sở hữu SIP giữa nhiều Browser Tabs (Master Tab / Leader Election Pattern)
 * Sử dụng BroadcastChannel API để điều phối 1 tab duy nhất được phép đăng ký SIP UA tới tổng đài.
 */

export type LeaderMessage =
  | { type: 'WHO_IS_MASTER'; fromTabId: string }
  | { type: 'I_AM_MASTER'; masterTabId: string }
  | { type: 'HEARTBEAT'; masterTabId: string }
  | { type: 'CLAIM_MASTER'; newMasterTabId: string }
  | { type: 'REQUEST_TAKEOVER'; requesterTabId: string; requestId: string; force?: boolean }
  | { type: 'TAKEOVER_ACCEPTED'; requesterTabId: string; requestId: string }
  | { type: 'TAKEOVER_REJECTED'; requesterTabId: string; requestId: string; reason: string }
  | { type: 'RELEASE_MASTER'; oldMasterTabId: string }

type LeaderChangeListener = (isMaster: boolean) => void

const CHANNEL_NAME = 'salesflow_telesale_sip_leader_v1'
const HEARTBEAT_INTERVAL_MS = 1000
const HEARTBEAT_TIMEOUT_MS = 3000
const DISCOVERY_TIMEOUT_MS = 300
const TAKEOVER_TIMEOUT_MS = 1200

class TabLeaderService {
  private tabId: string
  private channel: BroadcastChannel | null = null
  private isMaster: boolean = false
  private masterTabId: string | null = null
  private lastHeartbeatAt: number = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private watchdogTimer: ReturnType<typeof setInterval> | null = null
  private discoveryTimer: ReturnType<typeof setTimeout> | null = null
  private listeners: Set<LeaderChangeListener> = new Set()
  private initialized: boolean = false

  // Kiểm tra cuộc gọi đang diễn ra trước khi bàn giao quyền Master
  private activeCallsCheckFn: (() => boolean) | null = null

  // Hàng đợi các yêu cầu takeover đang chờ phản hồi
  private pendingTakeoverRequests: Map<
    string,
    { resolve: (res: { success: boolean; reason?: string }) => void; timer: ReturnType<typeof setTimeout> }
  > = new Map()

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  public getTabId(): string {
    return this.tabId
  }

  public isLeader(): boolean {
    return this.isMaster
  }

  public getMasterTabId(): string | null {
    return this.masterTabId
  }

  /**
   * Đăng ký hàm kiểm tra cuộc gọi đang diễn ra trên tab này
   */
  public setActiveCallsChecker(fn: () => boolean): void {
    this.activeCallsCheckFn = fn
  }

  /**
   * Khởi tạo kênh điều phối giữa các tab
   */
  public init(): void {
    if (this.initialized) return
    this.initialized = true

    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      // Môi trường không hỗ trợ BroadcastChannel (SSR / Test mock): mặc định tự là master
      this.setMasterState(true, this.tabId)
      return
    }

    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.onmessage = (event: MessageEvent<LeaderMessage>) => {
        this.handleMessage(event.data)
      }

      // Đăng ký dọn dẹp khi đóng tab hoặc tải lại trang
      window.addEventListener('beforeunload', this.handleBeforeUnload)

      // Hỏi xem hiện tại đã có Master Tab nào chưa
      this.postMessage({ type: 'WHO_IS_MASTER', fromTabId: this.tabId })

      // Nếu không có tab nào phản hồi trong DISCOVERY_TIMEOUT_MS -> Tab này tự phong làm Master
      this.discoveryTimer = setTimeout(() => {
        if (!this.masterTabId) {
          console.log(`[TabLeader] Không có master tab nào đang active. Tab ${this.tabId} trở thành Master.`)
          this.becomeMaster()
        }
      }, DISCOVERY_TIMEOUT_MS)

      // Bắt đầu watchdog kiểm tra heartbeat của master
      this.startWatchdog()
    } catch (err) {
      console.warn('[TabLeader] Không thể khởi tạo BroadcastChannel, mặc định là master:', err)
      this.setMasterState(true, this.tabId)
    }
  }

  /**
   * Yêu cầu giành quyền Master cho tab hiện tại (khi người dùng bấm nút "Chuyển quyền sang tab này")
   * Thực hiện giao thức Two-Phase Handoff để bảo vệ các cuộc gọi đang diễn ra ở tab cũ không bị gián đoạn đột ngột.
   */
  public claimMaster(force: boolean = false): Promise<{ success: boolean; reason?: string }> {
    if (this.isMaster) {
      return Promise.resolve({ success: true })
    }

    if (!this.channel || !this.masterTabId) {
      console.log(`[TabLeader] Tab ${this.tabId} chủ động nhận quyền Master (chưa có master trước đó).`)
      this.becomeMaster()
      return Promise.resolve({ success: true })
    }

    console.log(`[TabLeader] Tab ${this.tabId} gửi yêu cầu nhận quyền Master từ tab ${this.masterTabId}.`)
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingTakeoverRequests.delete(requestId)
        console.warn(`[TabLeader] Hết thời gian chờ phản hồi chuyển quyền (${TAKEOVER_TIMEOUT_MS}ms). Tự động giành quyền Master.`)
        this.becomeMaster()
        resolve({ success: true })
      }, TAKEOVER_TIMEOUT_MS)

      this.pendingTakeoverRequests.set(requestId, { resolve, timer })

      this.postMessage({
        type: 'REQUEST_TAKEOVER',
        requesterTabId: this.tabId,
        requestId,
        force,
      })
    })
  }

  /**
   * Đăng ký lắng nghe sự thay đổi quyền Master
   */
  public onLeaderChange(listener: LeaderChangeListener): () => void {
    this.listeners.add(listener)
    listener(this.isMaster)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Giải phóng tài nguyên và kênh điều phối
   */
  public destroy(): void {
    if (this.isMaster) {
      this.releaseMaster()
    }

    this.stopHeartbeat()
    this.stopWatchdog()

    if (this.discoveryTimer) {
      clearTimeout(this.discoveryTimer)
      this.discoveryTimer = null
    }

    this.pendingTakeoverRequests.forEach(({ timer, resolve }) => {
      clearTimeout(timer)
      resolve({ success: false, reason: 'Tab closed' })
    })
    this.pendingTakeoverRequests.clear()
    this.activeCallsCheckFn = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
    }

    if (this.channel) {
      try {
        this.channel.close()
      } catch {
        // ignore
      }
      this.channel = null
    }

    this.listeners.clear()
    this.initialized = false
    this.isMaster = false
    this.masterTabId = null
  }

  private handleMessage(msg: LeaderMessage): void {
    if (!msg || typeof msg !== 'object') return

    switch (msg.type) {
      case 'WHO_IS_MASTER': {
        // Nếu tab này đang là Master, phản hồi lại cho tab mới biết
        if (this.isMaster) {
          this.postMessage({ type: 'I_AM_MASTER', masterTabId: this.tabId })
        }
        break
      }

      case 'I_AM_MASTER': {
        // Tab khác xác nhận đang là Master
        if (msg.masterTabId !== this.tabId) {
          this.lastHeartbeatAt = Date.now()
          if (this.isMaster) {
            // Cả 2 tab đều nhận là Master -> Phân xử theo tabId duy nhất: tab có tabId nhỏ hơn sẽ nhường
            // Tránh tình trạng cả 2 cùng nhường quyền (mutual concession)
            if (this.tabId < msg.masterTabId) {
              console.warn(`[TabLeader] Xung đột I_AM_MASTER: nhường quyền cho tab ${msg.masterTabId}`)
              this.stepDown(msg.masterTabId)
            } else {
              console.warn(`[TabLeader] Xung đột I_AM_MASTER: giữ quyền Master trước tab ${msg.masterTabId}`)
              this.postMessage({ type: 'I_AM_MASTER', masterTabId: this.tabId })
            }
          } else {
            this.setMasterState(false, msg.masterTabId)
          }
        }
        break
      }

      case 'HEARTBEAT': {
        if (msg.masterTabId !== this.tabId) {
          this.lastHeartbeatAt = Date.now()
          if (this.isMaster) {
            // Cả 2 tab cùng nhận là master -> Tab có id nhỏ hơn nhường
            if (this.tabId < msg.masterTabId) {
              console.warn(`[TabLeader] Xung đột HEARTBEAT: nhường quyền cho tab ${msg.masterTabId}`)
              this.stepDown(msg.masterTabId)
            } else {
              this.postMessage({ type: 'HEARTBEAT', masterTabId: this.tabId })
            }
          } else {
            this.setMasterState(false, msg.masterTabId)
          }
        }
        break
      }

      case 'REQUEST_TAKEOVER': {
        // Tab khác yêu cầu chuyển quyền Master
        if (this.isMaster) {
          const hasActive = this.activeCallsCheckFn ? this.activeCallsCheckFn() : false
          if (hasActive && !msg.force) {
            console.warn(`[TabLeader] Từ chối yêu cầu chuyển quyền từ tab ${msg.requesterTabId} do đang có cuộc gọi hoạt động.`)
            this.postMessage({
              type: 'TAKEOVER_REJECTED',
              requesterTabId: msg.requesterTabId,
              requestId: msg.requestId,
              reason: 'Tab hiện tại đang có cuộc gọi đang diễn ra. Vui lòng kết thúc cuộc gọi trước khi chuyển quyền tổng đài.',
            })
          } else {
            console.log(`[TabLeader] Chấp thuận chuyển quyền sang tab ${msg.requesterTabId}.`)
            this.stepDown(msg.requesterTabId)
            this.postMessage({
              type: 'TAKEOVER_ACCEPTED',
              requesterTabId: msg.requesterTabId,
              requestId: msg.requestId,
            })
          }
        }
        break
      }

      case 'TAKEOVER_ACCEPTED': {
        if (msg.requesterTabId === this.tabId) {
          const pending = this.pendingTakeoverRequests.get(msg.requestId)
          if (pending) {
            clearTimeout(pending.timer)
            this.pendingTakeoverRequests.delete(msg.requestId)
            this.becomeMaster()
            pending.resolve({ success: true })
          }
        }
        break
      }

      case 'TAKEOVER_REJECTED': {
        if (msg.requesterTabId === this.tabId) {
          const pending = this.pendingTakeoverRequests.get(msg.requestId)
          if (pending) {
            clearTimeout(pending.timer)
            this.pendingTakeoverRequests.delete(msg.requestId)
            pending.resolve({ success: false, reason: msg.reason })
          }
        }
        break
      }

      case 'CLAIM_MASTER': {
        // Tab khác chủ động nhận quyền Master (tương thích ngược)
        if (msg.newMasterTabId !== this.tabId) {
          const hasActive = this.activeCallsCheckFn ? this.activeCallsCheckFn() : false
          if (hasActive && this.isMaster) {
            console.warn(`[TabLeader] Tab ${msg.newMasterTabId} gửi CLAIM_MASTER nhưng tab hiện tại đang có cuộc gọi. Giữ quyền.`)
            this.postMessage({ type: 'I_AM_MASTER', masterTabId: this.tabId })
          } else {
            console.log(`[TabLeader] Tab ${msg.newMasterTabId} đã nhận quyền Master. Nhường quyền.`)
            this.stepDown(msg.newMasterTabId)
          }
        }
        break
      }

      case 'RELEASE_MASTER': {
        // Master cũ vừa giải phóng quyền (ví dụ đóng tab)
        if (msg.oldMasterTabId === this.masterTabId && !this.isMaster) {
          console.log('[TabLeader] Master cũ đã giải phóng quyền. Tiến hành thăng cấp thành Master.')
          this.becomeMaster()
        }
        break
      }
    }
  }

  private becomeMaster(): void {
    this.setMasterState(true, this.tabId)
    this.startHeartbeat()
    this.postMessage({ type: 'I_AM_MASTER', masterTabId: this.tabId })
  }

  private stepDown(newMasterTabId: string): void {
    this.stopHeartbeat()
    this.lastHeartbeatAt = Date.now()
    this.setMasterState(false, newMasterTabId)
  }

  private releaseMaster(): void {
    this.postMessage({ type: 'RELEASE_MASTER', oldMasterTabId: this.tabId })
    this.stepDown('')
  }

  private setMasterState(isMaster: boolean, masterTabId: string): void {
    const changed = this.isMaster !== isMaster || this.masterTabId !== masterTabId
    this.isMaster = isMaster
    this.masterTabId = masterTabId

    if (changed) {
      this.notifyListeners()
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.isMaster) {
        this.postMessage({ type: 'HEARTBEAT', masterTabId: this.tabId })
      }
    }, HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private startWatchdog(): void {
    this.stopWatchdog()
    this.watchdogTimer = setInterval(() => {
      // Nếu tab này KHÔNG phải là master, theo dõi xem master có gửi heartbeat không
      if (!this.isMaster && this.masterTabId) {
        const elapsed = Date.now() - this.lastHeartbeatAt
        if (elapsed > HEARTBEAT_TIMEOUT_MS) {
          console.warn(
            `[TabLeader] Master Tab ${this.masterTabId} không phản hồi sau ${elapsed}ms. Tự động thăng cấp thành Master.`,
          )
          this.becomeMaster()
        }
      }
    }, 1000)
  }

  private stopWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
      this.watchdogTimer = null
    }
  }

  private postMessage(msg: LeaderMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg)
      } catch (err) {
        console.warn('[TabLeader] Lỗi khi gửi broadcast message:', err)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isMaster)
      } catch (err) {
        console.error('[TabLeader] Lỗi trong listener:', err)
      }
    })
  }

  private handleBeforeUnload = (): void => {
    if (this.isMaster) {
      this.releaseMaster()
    }
  }
}

export const tabLeaderService = new TabLeaderService()
export default tabLeaderService
