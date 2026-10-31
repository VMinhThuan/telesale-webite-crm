/**
 * Service quản lý quyền sở hữu SIP giữa nhiều Browser Tabs (Master Tab / Leader Election Pattern)
 * Sử dụng BroadcastChannel API để điều phối 1 tab duy nhất được phép đăng ký SIP UA tới tổng đài.
 */

export type LeaderMessage =
  | { type: 'WHO_IS_MASTER'; fromTabId: string }
  | { type: 'I_AM_MASTER'; masterTabId: string }
  | { type: 'HEARTBEAT'; masterTabId: string }
  | { type: 'CLAIM_MASTER'; newMasterTabId: string }
  | { type: 'RELEASE_MASTER'; oldMasterTabId: string }

type LeaderChangeListener = (isMaster: boolean) => void

const CHANNEL_NAME = 'salesflow_telesale_sip_leader_v1'
const HEARTBEAT_INTERVAL_MS = 1000
const HEARTBEAT_TIMEOUT_MS = 3000
const DISCOVERY_TIMEOUT_MS = 300

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
   */
  public claimMaster(): void {
    if (this.isMaster) return

    console.log(`[TabLeader] Tab ${this.tabId} chủ động nhận quyền Master.`)
    this.postMessage({ type: 'CLAIM_MASTER', newMasterTabId: this.tabId })
    this.becomeMaster()
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
          this.setMasterState(false, msg.masterTabId)
        }
        break
      }

      case 'HEARTBEAT': {
        if (msg.masterTabId !== this.tabId) {
          this.lastHeartbeatAt = Date.now()
          if (this.isMaster) {
            // Trường hợp hy hữu 2 tab cùng nhận là master -> Tab có id lớn hơn nhường
            if (this.tabId < msg.masterTabId) {
              console.warn(`[TabLeader] Xung đột Master: nhường quyền cho tab ${msg.masterTabId}`)
              this.stepDown(msg.masterTabId)
            }
          } else {
            this.setMasterState(false, msg.masterTabId)
          }
        }
        break
      }

      case 'CLAIM_MASTER': {
        // Tab khác chủ động nhận quyền Master
        if (msg.newMasterTabId !== this.tabId) {
          console.log(`[TabLeader] Tab ${msg.newMasterTabId} đã nhận quyền Master. Nhường quyền.`)
          this.stepDown(msg.newMasterTabId)
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
