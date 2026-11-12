import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import sipService, { SipRegistrationStatus } from '../services/sipService'
import { tabLeaderService } from '../services/tabLeaderService'
import { telesaleService } from '../services/telesale.service'
import { useAuthStore } from '../store/useAuthStore'
import { useCallStore } from '../store/useCallStore'
import { useTelesaleCallStore } from '../store/useTelesaleCallStore'
import { getEffectiveSipConfig } from '../utils/sip'
import { notify } from '../utils/notify'
import { NextCustomerDto } from '../types/api'

export interface MakeCallParams {
  customerId: number
  customerName?: string
  memberId?: number
  memberName?: string
  lineId?: number
  customer?: Partial<NextCustomerDto> | null
  /** Đặt true CHỈ KHI cuộc gọi xuất phát từ màn hình Telesale để đồng bộ hiển thị vào tab Telesale */
  isTelesale?: boolean
  onSuccess?: () => void
}

/**
 * Custom Hook điều phối cuộc gọi Softphone VoIP tập trung (Domain Orchestration Hook).
 * Tái sử dụng thống nhất giữa màn hình Telesale, Khách tiềm năng (Leads) và các màn hình CRM khác.
 * 
 * Đảm bảo:
 * - Single Source of Truth cho luồng quay số API 16 và kết nối WebRTC FreeSWITCH PBX.
 * - Quản lý Master Tab / Replica Tab (tabLeaderService).
 * - Quản lý Audio Focus (Auto-Hold các line đang đàm thoại khác).
 * - Khóa chống Double-Click và In-flight Attempt Cancellation.
 * - Đồng bộ tức thời lên useCallStore & useTelesaleCallStore cho FloatingCallWidget.
 */
export function useMakeCall() {
  const user = useAuthStore((s) => s.user)
  const effectiveSipConfig = useMemo(() => getEffectiveSipConfig(user), [user])

  const [isSipMaster, setIsSipMaster] = useState(() => tabLeaderService.isLeader())
  const [sipRegStatus, setSipRegStatus] = useState<SipRegistrationStatus>(() =>
    sipService.getRegistrationStatus(),
  )
  const [isDialing, setIsDialing] = useState(false)

  // Trạng thái cuộc gọi toàn cục từ useCallStore
  const callStatus = useCallStore((s) => s.status)
  const isMuted = useCallStore((s) => s.isMuted)
  const isHeld = useCallStore((s) => s.isHeld)
  const durationSec = useCallStore((s) => s.durationSec)
  const activeCaller = useCallStore((s) => s.caller)
  const isCallActive =
    callStatus === 'calling' || callStatus === 'connected' || callStatus === 'paused'

  // Khóa chống Race Condition và Double-Click khi quay số theo từng line
  const dialingLinesRef = useRef<Record<number, boolean>>({})

  // Lắng nghe thay đổi Master Tab và SIP Registration status
  useEffect(() => {
    const unsubscribeLeader = tabLeaderService.onLeaderChange((isMaster) => {
      setIsSipMaster(isMaster)
    })
    const unsubscribeReg = sipService.onRegistrationStatusChange((status) => {
      setSipRegStatus(status)
    })
    return () => {
      unsubscribeLeader()
      unsubscribeReg()
    }
  }, [])

  /**
   * Tự kích hoạt kết nối lại tới tổng đài SIP
   */
  const reconnectSip = useCallback(() => {
    if (!effectiveSipConfig) {
      notify('Chưa có thông tin cấu hình máy nhánh SIP từ máy chủ.')
      return
    }
    sipService.init(effectiveSipConfig)
    notify('Đang gửi lệnh kết nối lại tổng đài...')
  }, [effectiveSipConfig])

  /**
   * Thực hiện quay số và kết nối cuộc gọi VoIP
   */
  const makeCall = useCallback(
    async ({
      customerId,
      customerName,
      memberId,
      lineId,
      customer,
      isTelesale = false,
      onSuccess,
    }: MakeCallParams) => {
      // 0. Kiểm tra quyền Master Tab
      if (!tabLeaderService.isLeader()) {
        notify(
          'Tab này đang ở chế độ xem. Vui lòng bấm "Chuyển quyền tổng đài sang tab này" ở thanh thông báo phía trên để thực hiện cuộc gọi.',
        )
        return
      }

      if (!customerId) {
        notify('Chưa có thông tin khách hàng để gọi.')
        return
      }

      // Phòng thủ: Kiểm tra cấu hình máy nhánh SIP hợp lệ từ ERP
      if (!effectiveSipConfig) {
        notify('Tài khoản nhân viên chưa được cấu hình máy nhánh tổng đài SIP từ máy chủ.')
        return
      }

      // Phòng thủ: Kiểm tra trạng thái máy nhánh SIP
      const currentRegStatus = sipService.getRegistrationStatus()
      if (currentRegStatus !== 'registered') {
        if (currentRegStatus === 'connecting') {
          notify('Máy nhánh SIP đang kết nối tới tổng đài. Vui lòng đợi trong giây lát...')
          return
        }
        notify('Máy nhánh SIP chưa kết nối. Đang kích hoạt kết nối lại...')
        sipService.init(effectiveSipConfig)
        return
      }

      // Xác định line mục tiêu:
      // - Nếu truyền lineId cụ thể thì dùng line đó.
      // - Nếu không truyền lineId: lấy activeTabId hiện tại; nếu activeTab đang bận cuộc gọi khác, tìm line rảnh đầu tiên trong tabs pool.
      const currentTabs = useTelesaleCallStore.getState().tabs
      const activeTabId = useTelesaleCallStore.getState().activeTabId
      let targetTabId = lineId || activeTabId || 1

      if (!lineId) {
        const activeTab = currentTabs.find((t) => t.id === targetTabId)
        const isActiveTabBusy =
          activeTab &&
          (activeTab.status === 'calling' ||
            activeTab.status === 'connected' ||
            activeTab.status === 'paused')

        if (isActiveTabBusy) {
          const firstIdleTab = currentTabs.find(
            (t) => t.status === 'idle' || t.status === 'ended',
          )
          if (firstIdleTab) {
            targetTabId = firstIdleTab.id
          } else {
            notify('Cả 3 đường truyền đều đang bận cuộc gọi. Vui lòng kết thúc một cuộc gọi trước.')
            return
          }
        }
      }

      // 1. Kiểm tra khóa chống double-click tức thời cho tab mục tiêu
      if (dialingLinesRef.current[targetTabId]) return
      dialingLinesRef.current[targetTabId] = true
      setIsDialing(true)

      // Sinh mã attemptId mới cho targetTabId thông qua sipService để hỗ trợ hủy toàn cục
      const currentAttemptId = sipService.startCallAttempt(targetTabId)

      // Cập nhật tab sang trạng thái 'calling'
      if (isTelesale) {
        const existingTab = currentTabs.find((t) => t.id === targetTabId)
        const tabCustomer: NextCustomerDto = {
          customer_id: customerId,
          customer_code: customer?.customer_code || '',
          customer_name: customerName || customer?.customer_name || 'Khách hàng',
          masked_address: (customer as any)?.masked_address || (customer as any)?.dia_chi || '',
          lock_info: false,
          cus_campaign_id: (customer as any)?.cus_campaign_id || 0,
          members: customer?.members || [],
          source_erp: customer?.source_erp || existingTab?.customer?.source_erp || 'locnuoc365',
        }

        useTelesaleCallStore.getState().updateTab(targetTabId, {
          status: 'calling',
          durationSec: 0,
          isMuted: false,
          isHeld: false,
          customer: existingTab?.customer?.customer_id === customerId ? existingTab.customer : tabCustomer,
          selectedMemberId: memberId,
        })
      } else {
        // Cuộc gọi từ màn hình khác (Khách tiềm năng / Đơn hàng):
        // KHÔNG cập nhật hay ghi đè customer/selectedMemberId vào tabs của Telesale
        useTelesaleCallStore.getState().updateTab(targetTabId, {
          status: 'calling',
          durationSec: 0,
          isMuted: false,
          isHeld: false,
        })
      }

      // Danh sách các line đang đàm thoại được tạm giữ máy tự động khi chuyển audio focus
      const autoHeldLineIds: number[] = []

      const rollbackAutoHeld = () => {
        if (autoHeldLineIds.length === 0) return
        autoHeldLineIds.forEach((heldId) => {
          sipService.unhold(heldId)
        })
        useTelesaleCallStore.getState().setTabs((prev) =>
          prev.map((t) =>
            autoHeldLineIds.includes(t.id)
              ? { ...t, status: 'connected', isHeld: false }
              : t,
          ),
        )
        notify('Đã tự động khôi phục kết nối cho cuộc gọi đang giữ máy.')
      }

      try {
        // 1. Gọi API 16: POST /api/telesale/calls với customer_id và member_id để lấy chuỗi quay số thật
        const existingTab = currentTabs.find((t) => t.id === targetTabId)
        const targetSourceErp = customer?.source_erp || existingTab?.customer?.source_erp
        const dialInfo = await telesaleService.dialCall(
          {
            customer_id: customerId,
            member_id: memberId,
          },
          targetSourceErp,
        )

        // KIỂM TRA HỦY: Sau khi gọi API 16 xong, kiểm tra xem nhân viên có bấm gác máy không
        if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
          console.warn(`[useMakeCall] Cuộc gọi Line ${targetTabId} đã bị hủy trong lúc chờ API quay số.`)
          rollbackAutoHeld()
          return
        }

        // 2. Softphone thực hiện quay số thực tế bằng dial_number gắn với targetTabId
        if (dialInfo.dial_number) {
          // Cập nhật useCallStore
          useCallStore.getState().startCall({
            customerId: customerId,
            customerName: customerName || dialInfo.member_name || 'Khách hàng',
            phoneMasked: dialInfo.phone_masked,
            memberId: dialInfo.member_id,
            memberName: dialInfo.member_name,
          })

          if (isTelesale) {
            useTelesaleCallStore.getState().updateTab(targetTabId, {
              status: 'calling',
              callerNumber: dialInfo.phone_masked,
              selectedMemberId: dialInfo.member_id,
            })
          }

          // KIỂM TRA HỦY: Kiểm tra lần nữa trước khi gọi SIP
          if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
            console.warn(`[useMakeCall] Cuộc gọi Line ${targetTabId} đã bị hủy trước khi gọi SIP.`)
            rollbackAutoHeld()
            return
          }

          // Chuyển audio focus: Giữ máy (Hold) các line khác đang đàm thoại ngay trước khi phát SIP call
          const currentTabsState = useTelesaleCallStore.getState().tabs
          currentTabsState.forEach((t) => {
            if (t.id !== targetTabId && t.status === 'connected') {
              const ok = sipService.hold(t.id)
              if (ok) {
                autoHeldLineIds.push(t.id)
              }
            }
          })
          if (autoHeldLineIds.length > 0) {
            useTelesaleCallStore.getState().setTabs((prev) =>
              prev.map((t) =>
                autoHeldLineIds.includes(t.id)
                  ? { ...t, status: 'paused', isHeld: true }
                  : t,
              ),
            )
          }

          // Cập nhật Line active cho sipService
          sipService.setActiveLineId(targetTabId)

          await sipService.call(targetTabId, dialInfo.dial_number)

          // KIỂM TRA HỦY: Kiểm tra sau khi sipService.call hoàn tất
          if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
            console.warn(`[useMakeCall] Cuộc gọi Line ${targetTabId} đã bị hủy trong lúc mở mic.`)
            sipService.hangup(targetTabId)
            rollbackAutoHeld()
            return
          }

          notify(
            `Đang quay số tới ${dialInfo.member_name || customerName || 'khách hàng'} qua máy nhánh #${effectiveSipConfig.impi}...`,
          )
          onSuccess?.()
        } else {
          notify('Không nhận được mã quay số từ hệ thống tổng đài.')

          // Tránh lỗi "cuộc gọi ma": Đảm bảo useCallStore không bị treo ở trạng thái 'calling'
          const remainingConnected = useTelesaleCallStore
            .getState()
            .tabs.find(
              (t) => t.id !== targetTabId && (t.status === 'connected' || t.status === 'paused'),
            )
          if (!remainingConnected) {
            useCallStore.getState().endCall()
          } else {
            useCallStore.setState({
              status: remainingConnected.status,
              isHeld: remainingConnected.isHeld,
              isMuted: remainingConnected.isMuted,
              caller: {
                customerName: remainingConnected.customer?.customer_name || 'Khách hàng',
                phoneMasked: remainingConnected.callerNumber || '*** *** ***',
              },
              durationSec: remainingConnected.durationSec,
            })
          }

          useTelesaleCallStore.getState().updateTab(targetTabId, { status: 'idle' })
          rollbackAutoHeld()
        }
      } catch (err: any) {
        rollbackAutoHeld()
        const isAborted =
          !sipService.isCallAttemptValid(targetTabId, currentAttemptId) ||
          err?.message?.includes('đã bị hủy')

        if (!isAborted) {
          console.error('Lỗi khi quay số:', err)
          notify(err?.message || 'Không thể kết nối đường truyền cuộc gọi.')
          const remainingConnected = useTelesaleCallStore
            .getState()
            .tabs.find(
              (t) => t.id !== targetTabId && (t.status === 'connected' || t.status === 'paused'),
            )
          if (!remainingConnected) {
            useCallStore.getState().endCall()
          } else {
            useCallStore.setState({
              status: remainingConnected.status,
              isHeld: remainingConnected.isHeld,
              isMuted: remainingConnected.isMuted,
              caller: {
                customerName: remainingConnected.customer?.customer_name || 'Khách hàng',
                phoneMasked: remainingConnected.callerNumber || '*** *** ***',
              },
              durationSec: remainingConnected.durationSec,
            })
          }
          useTelesaleCallStore.getState().updateTab(targetTabId, { status: 'idle' })
        }
      } finally {
        if (sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
          sipService.cancelCallAttempt(targetTabId)
        }
        dialingLinesRef.current[targetTabId] = false
        setIsDialing(false)
      }
    },
    [effectiveSipConfig],
  )

  /**
   * Bật/tắt micro
   */
  const toggleMute = useCallback((lineId?: number) => {
    const targetId = lineId || useTelesaleCallStore.getState().activeTabId || 1
    const isNowMuted = sipService.toggleMute(targetId)
    useCallStore.setState({ isMuted: isNowMuted })
    useTelesaleCallStore.getState().updateTab(targetId, { isMuted: isNowMuted })
    notify(isNowMuted ? 'Đã tắt micro' : 'Đã bật micro')
    return isNowMuted
  }, [])

  /**
   * Giữ máy / Tiếp tục cuộc gọi
   */
  const toggleHold = useCallback((lineId?: number) => {
    const targetId = lineId || useTelesaleCallStore.getState().activeTabId || 1
    const result = sipService.toggleHold(targetId)
    if (result === null) {
      notify('Chưa thể giữ máy/tiếp tục cuộc gọi lúc này. Vui lòng đợi kết nối ổn định.')
      return null
    }
    const isNowHeld = result
    const newStatus = isNowHeld ? 'paused' : 'connected'
    useCallStore.setState({ isHeld: isNowHeld, status: newStatus })
    useTelesaleCallStore.getState().updateTab(targetId, { isHeld: isNowHeld, status: newStatus })
    notify(isNowHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
    return isNowHeld
  }, [])

  /**
   * Kết thúc cuộc gọi
   */
  const endCall = useCallback((lineId?: number) => {
    const targetId = lineId || useTelesaleCallStore.getState().activeTabId || 1
    sipService.cancelCallAttempt(targetId)
    dialingLinesRef.current[targetId] = false
    setIsDialing(false)

    sipService.hangup(targetId)
    useTelesaleCallStore.getState().updateTab(targetId, { status: 'ended', isHeld: false })

    const otherActiveTab = useTelesaleCallStore
      .getState()
      .tabs.find(
        (t) =>
          t.id !== targetId &&
          (t.status === 'calling' || t.status === 'connected' || t.status === 'paused'),
      )

    if (!otherActiveTab) {
      useCallStore.getState().endCall()
    } else {
      useCallStore.setState({
        status: otherActiveTab.status,
        isHeld: otherActiveTab.isHeld,
        isMuted: otherActiveTab.isMuted,
        caller: {
          customerId: otherActiveTab.customer?.customer_id,
          customerName: otherActiveTab.customer?.customer_name || 'Khách hàng',
          phoneMasked: otherActiveTab.callerNumber || '*** *** ***',
        },
        durationSec: otherActiveTab.durationSec,
      })
    }
    notify('Đã kết thúc cuộc gọi')
  }, [])

  return {
    makeCall,
    endCall,
    toggleMute,
    toggleHold,
    reconnectSip,
    isDialing,
    sipRegStatus,
    isSipMaster,
    effectiveSipConfig,
    callStatus,
    isCallActive,
    isMuted,
    isHeld,
    durationSec,
    activeCaller,
  }
}