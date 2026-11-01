import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Phone,
  ShoppingCart,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import {
  useCampaigns,
  useDailyResults,
  useDialCallMutation,
  useNextCustomerMutation,
} from '../../hooks/useTelesale'
import { useAuthStore } from '../../store/useAuthStore'
import { useCallStore } from '../../store/useCallStore'
import { useTelesaleCallStore } from '../../store/useTelesaleCallStore'
import sipService, { SipAccountConfig } from '../../services/sipService'
import { tabLeaderService } from '../../services/tabLeaderService'
import { notify } from '../../utils/notify'

// 3 Khối Panels lớn của module Telesale
import { TelesaleSchedulePanel } from './components/TelesaleSchedulePanel'
import {
  TelesaleCallCenterPanel,
} from './components/TelesaleCallCenterPanel'
import {
  TelesaleCustomerPanel,
  resultOptions,
} from './components/TelesaleCustomerPanel'

// Re-export để đảm bảo tính tương thích ngược toàn dự án
export {
  TelesaleSchedulePanel,
  TelesaleCallCenterPanel,
  TelesaleCustomerPanel,
  resultOptions,
}

export const Telesale: React.FC = () => {
  // 0. Thông tin user và cấu hình SIP Softphone của nhân viên
  const { user } = useAuthStore()

  const effectiveSipConfig = useMemo<SipAccountConfig | null>(() => {
    const rawSip = user?.sipConfig
    if (!rawSip?.impi || !rawSip?.password || !rawSip?.websocketProxyUrl) {
      return null
    }

    return {
      impi: rawSip.impi,
      impu: rawSip.impu || `sip:${rawSip.impi}@${rawSip.realm || 'tongdai.zozin.vn'}`,
      password: rawSip.password,
      websocketProxyUrl: rawSip.websocketProxyUrl,
      iceServerUrl: rawSip.iceServerUrl,
      realm: rawSip.realm,
      displayName: rawSip.displayName || user?.name || rawSip.impi,
    }
  }, [user])

  // 1. Quản lý danh sách chiến dịch đàm thoại
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns()
  const campaignsList = useMemo(() => campaignsData?.items || [], [campaignsData?.items])
  const selectedCampaignId = useTelesaleCallStore((s) => s.selectedCampaignId)
  const setSelectedCampaignId = useTelesaleCallStore((s) => s.setSelectedCampaignId)

  // Tự động chọn chiến dịch đầu tiên khi danh sách tải xong nếu chưa có chiến dịch nào được chọn
  useEffect(() => {
    if (campaignsList.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaignsList[0].campaign_id)
    }
  }, [campaignsList, selectedCampaignId, setSelectedCampaignId])

  const selectedCampaign = useMemo(() => {
    return campaignsList.find((c) => c.campaign_id === selectedCampaignId) || campaignsList[0]
  }, [campaignsList, selectedCampaignId])

  const branchId = selectedCampaign?.branch_id || 3

  // 2. Thống kê kết quả đàm thoại trong ngày
  const { data: dailyResults } = useDailyResults()

  // 3. Quản lý mô hình 3 Tab / 3 Line cuộc gọi độc lập (Đưa ra Store toàn cục, chuyển trang không mất)
  const tabs = useTelesaleCallStore((s) => s.tabs)
  const setTabs = useTelesaleCallStore((s) => s.setTabs)
  const activeTabId = useTelesaleCallStore((s) => s.activeTabId)
  const setActiveTabId = useTelesaleCallStore((s) => s.setActiveTabId)

  // Kiểm tra xem hiện tại có cuộc gọi nào đang hoạt động trên bất kỳ line nào không
  const hasActiveCalls = useMemo(() => {
    return (
      tabs.some(
        (t) =>
          t.status === 'calling' ||
          t.status === 'connected' ||
          t.status === 'paused',
      ) || sipService.hasActiveCalls()
    )
  }, [tabs])

  // Tab đang hoạt động
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0]
  }, [tabs, activeTabId])

  const currentCustomer = activeTab?.customer

  // Ngày và ca hẹn đồng bộ giữa Cột 1 (SchedulePanel) và Cột 3 (CustomerPanel)
  const [orderDate, setOrderDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [orderTime, setOrderTime] = useState('08:30')
  const [orderSlotId, setOrderSlotId] = useState<number | undefined>(undefined)

  const handleOrderDateChange = React.useCallback(
    (newDate: string) => {
      setOrderDate(newDate)
      useTelesaleCallStore.getState().updateTabDraft(activeTabId, { orderDate: newDate })
    },
    [activeTabId],
  )

  const handleOrderTimeChange = React.useCallback(
    (newTime: string) => {
      setOrderTime(newTime)
      useTelesaleCallStore.getState().updateTabDraft(activeTabId, { orderTime: newTime })
    },
    [activeTabId],
  )

  // Mutations nghiệp vụ Telesale
  const nextCustomerMutation = useNextCustomerMutation()
  const dialCallMutation = useDialCallMutation()

  // Hàm nạp khách hàng từ chiến dịch vào một Tab cụ thể
  const handleFetchCustomerForTab = React.useCallback(
    async (targetTabId: number, campaignIdOverride?: number) => {
      const activeCampId = campaignIdOverride || selectedCampaign?.campaign_id
      if (!activeCampId) {
        notify('Vui lòng chọn chiến dịch trước khi lấy khách')
        return
      }

      // Bảo vệ: Nếu tab mục tiêu đang có cuộc gọi, không ghi đè khách hàng trên tab này
      const currentTabs = useTelesaleCallStore.getState().tabs
      const targetTab = currentTabs.find((t) => t.id === targetTabId)
      if (
        targetTab &&
        (targetTab.status === 'calling' ||
          targetTab.status === 'connected' ||
          targetTab.status === 'paused')
      ) {
        notify(
          `${targetTab.label} đang có cuộc gọi. Vui lòng chuyển sang Tab khác để nạp khách mới!`,
        )
        return
      }

      try {
        const nextCust = await nextCustomerMutation.mutateAsync({
          campaign_id: activeCampId,
          call_mode: 'chien_dich',
        })

        // KIỂM TRA LẠI SAU KHI API TRẢ VỀ:
        // Tránh race condition nếu trong lúc chờ API nạp khách (vài trăm ms đến vài giây),
        // tab này đã phát sinh cuộc gọi đến hoặc nhân viên đã bấm gọi / chuyển sang trạng thái đàm thoại
        const currentTabsAfterFetch = useTelesaleCallStore.getState().tabs
        const tabAfterFetch = currentTabsAfterFetch.find((t) => t.id === targetTabId)
        const isTabBusyAfterFetch =
          tabAfterFetch &&
          (tabAfterFetch.status === 'calling' ||
            tabAfterFetch.status === 'connected' ||
            tabAfterFetch.status === 'paused')

        if (isTabBusyAfterFetch) {
          console.warn(
            `[Telesale] Tab ${targetTabId} đã phát sinh cuộc gọi trong lúc nạp khách. Hủy ghi đè khách mới.`,
          )
          notify(
            `${tabAfterFetch?.label || `Tab ${targetTabId}`} đã phát sinh cuộc gọi trong lúc tải dữ liệu. Đã hủy ghi đè khách hàng mới vào tab này.`,
          )
          return
        }

        // Làm mới bản nháp riêng cho tab này với ngày hẹn hiện tại
        useTelesaleCallStore.getState().resetTabDraft(targetTabId, orderDate)

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id === targetTabId) {
              return {
                ...t,
                customer: nextCust,
                selectedMemberId: nextCust.members?.[0]?.member_id,
                status: 'idle',
                durationSec: 0,
                isMuted: false,
                isHeld: false,
                callerNumber: undefined,
              }
            }
            return t
          }),
        )

        notify(`Đã nạp khách hàng cho Số ${targetTabId}: ${nextCust.customer_name}`)
      } catch {
        // Lỗi đã được xử lý trong hook mutation
      }
    },
    [nextCustomerMutation, selectedCampaign?.campaign_id, setTabs, orderDate],
  )

  // Khởi tạo nạp khách hàng ban đầu cho Tab 1 DUY NHẤT 1 LẦN khi hệ thống chưa có khách trên bất kỳ tab nào
  // Không bao giờ reset hay nạp đè khi người dùng chỉ chuyển trang rồi quay lại
  const hasCheckedInitialFetchRef = useRef(false)
  useEffect(() => {
    if (!selectedCampaign || hasCheckedInitialFetchRef.current) return

    const currentTabs = useTelesaleCallStore.getState().tabs
    const hasAnyCustomerOrCall =
      currentTabs.some((t) => t.customer !== null || t.status !== 'idle') ||
      sipService.hasActiveCalls()

    if (!hasAnyCustomerOrCall) {
      hasCheckedInitialFetchRef.current = true
      handleFetchCustomerForTab(1, selectedCampaign.campaign_id)
    } else {
      hasCheckedInitialFetchRef.current = true
    }
  }, [handleFetchCustomerForTab, selectedCampaign])

  // Xử lý chuyển chiến dịch chủ động từ người dùng (kèm Guard bảo vệ cuộc gọi)
  const handleCampaignChange = (newCampId: number) => {
    if (newCampId === selectedCampaignId) return

    if (hasActiveCalls) {
      notify(
        'Đang có cuộc gọi trên một trong các Line. Vui lòng kết thúc cuộc gọi trước khi đổi chiến dịch!',
      )
      return
    }

    setSelectedCampaignId(newCampId)
    // Chỉ reset tabs khi người dùng chủ động chuyển chiến dịch mới và không có cuộc gọi nào
    useTelesaleCallStore.getState().resetTabs()
    handleFetchCustomerForTab(1, newCampId)
  }

  // Trạng thái tab này có phải là Master Tab duy nhất được kết nối SIP tổng đài hay không
  const [isSipMaster, setIsSipMaster] = useState(() => tabLeaderService.isLeader())

  // Trạng thái đăng ký SIP của máy nhánh tổng đài
  const [sipRegStatus, setSipRegStatus] = useState<
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'registered'
    | 'unregistered'
    | 'registrationFailed'
  >(() => sipService.getRegistrationStatus())

  // Tự động kết nối và đăng ký máy nhánh SIP khi vào màn hình Telesale NẾU tab này giữ quyền Master
  useEffect(() => {
    tabLeaderService.init()

    const unsubscribeLeader = tabLeaderService.onLeaderChange((isMaster) => {
      setIsSipMaster(isMaster)
      if (isMaster) {
        if (effectiveSipConfig) {
          sipService.init(effectiveSipConfig)
        }
      } else {
        // Nếu không giữ quyền Master (đang có tab khác là Master), ngắt kết nối SIP UA trên tab này
        sipService.destroy()
      }
    })

    const unsubscribeReg = sipService.onRegistrationStatusChange((status) => {
      setSipRegStatus(status)
    })

    return () => {
      unsubscribeLeader()
      unsubscribeReg()
    }
  }, [effectiveSipConfig])

  // Chuyển đổi giữa 3 tab cuộc gọi
  const handleSelectTab = (newTabId: number) => {
    if (newTabId === activeTabId) return

    // Cập nhật line active cho sipService (tự động kích hoạt Audio Focus Manager: ngắt loa/mic tab cũ và mở tab mới)
    sipService.setActiveLineId(newTabId)

    setTabs((prev) =>
      prev.map((t) => {
        // Tab cũ đang đàm thoại thì chuyển sang Giữ máy (Hold)
        if (t.id === activeTabId && t.status === 'connected') {
          return { ...t, status: 'paused', isHeld: true }
        }
        // Tab mới đang bị Giữ máy thì chuyển sang Đàm thoại (Connected)
        if (t.id === newTabId && t.status === 'paused') {
          return { ...t, status: 'connected', isHeld: false }
        }
        return t
      }),
    )

    setActiveTabId(newTabId)

    // Đồng bộ useCallStore theo trạng thái của tab mới được chọn nếu tab đó đang có cuộc gọi
    const targetTab = tabs.find((t) => t.id === newTabId)
    if (
      targetTab &&
      (targetTab.status === 'calling' ||
        targetTab.status === 'connected' ||
        targetTab.status === 'paused')
    ) {
      useCallStore.setState({
        status: targetTab.status,
        isHeld: targetTab.isHeld,
        isMuted: targetTab.isMuted,
        caller: {
          customerId: targetTab.customer?.customer_id,
          customerName: targetTab.customer?.customer_name || 'Khách hàng',
          phoneMasked: targetTab.callerNumber || '*** *** ***',
        },
        durationSec: targetTab.durationSec,
      })
    }

    // Đồng bộ lại lịch hẹn (orderDate, orderTime, orderSlotId) theo draft của tab mới
    const targetDraft = useTelesaleCallStore.getState().getTabDraft(newTabId)
    if (targetDraft.orderDate) {
      setOrderDate(targetDraft.orderDate)
    }
    if (targetDraft.orderTime) {
      setOrderTime(targetDraft.orderTime)
    }
    setOrderSlotId(targetDraft.orderSlotId)
  }

  // Chọn thành viên cần gọi của Tab đang active
  const handleSelectMemberId = (memberId: number) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, selectedMemberId: memberId } : t,
      ),
    )
  }

  // Khóa chống Race Condition và Double-Click khi quay số theo từng tab
  const dialingTabsRef = useRef<Record<number, boolean>>({})

  // Quay số cho thành viên của Tab đang active
  const handleDial = async (memberId?: number) => {
    // 0. Kiểm tra quyền Master Tab (ngăn chặn xung đột SIP giữa nhiều tab trình duyệt)
    if (!isSipMaster) {
      notify(
        'Tab này đang ở chế độ xem. Vui lòng bấm "Chuyển quyền tổng đài sang tab này" ở thanh thông báo phía trên để thực hiện cuộc gọi.',
      )
      return
    }

    if (!currentCustomer) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }

    // Phòng thủ: Kiểm tra cấu hình máy nhánh SIP hợp lệ từ ERP
    if (!effectiveSipConfig) {
      notify('Tài khoản nhân viên chưa được cấu hình máy nhánh tổng đài SIP từ máy chủ.')
      return
    }

    // Phòng thủ: Ngăn chặn bấm gọi khi tổng đài SIP đang kết nối hoặc mất kết nối
    if (sipRegStatus !== 'registered') {
      if (sipRegStatus === 'connecting') {
        notify('Máy nhánh SIP đang kết nối tới tổng đài. Vui lòng đợi trong giây lát...')
        return
      }
      notify('Máy nhánh SIP chưa kết nối. Đang kích hoạt kết nối lại...')
      sipService.init(effectiveSipConfig)
      return
    }

    // Cố định targetTabId ngay từ đầu để tránh lỗi trôi tab khi đổi tab trong lúc await
    const targetTabId = activeTabId
    const targetMemberId =
      memberId || activeTab.selectedMemberId || currentCustomer.members?.[0]?.member_id

    // 1. Kiểm tra khóa chống double-click tức thời cho tab mục tiêu
    if (dialingTabsRef.current[targetTabId]) return
    dialingTabsRef.current[targetTabId] = true

    // Sinh mã attemptId mới cho targetTabId thông qua sipService để hỗ trợ hủy toàn cục (kể cả từ Floating Widget)
    const currentAttemptId = sipService.startCallAttempt(targetTabId)

    // Khóa trạng thái line đang quay số (chuyển sang 'calling')
    setTabs((prev) =>
      prev.map((t) =>
        t.id === targetTabId
          ? {
              ...t,
              status: 'calling',
              durationSec: 0,
              isMuted: false,
              isHeld: false,
            }
          : t,
      ),
    )

    // Danh sách các line đang đàm thoại được tạm giữ máy tự động khi chuyển audio focus
    const autoHeldLineIds: number[] = []

    const rollbackAutoHeld = () => {
      if (autoHeldLineIds.length === 0) return
      autoHeldLineIds.forEach((heldId) => {
        sipService.unhold(heldId)
      })
      setTabs((prev) =>
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
      const dialInfo = await dialCallMutation.mutateAsync({
        customer_id: currentCustomer.customer_id,
        member_id: targetMemberId,
      })

      // KIỂM TRA HỦY: Sau khi gọi API 16 xong, kiểm tra xem nhân viên có bấm gác máy (ở Telesale hoặc Floating Widget) không
      if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
        console.warn(`[Telesale] Cuộc gọi Line ${targetTabId} đã bị hủy trong lúc chờ API quay số.`)
        rollbackAutoHeld()
        return
      }

      // 2. Softphone thực hiện quay số thực tế bằng dial_number gắn với targetTabId
      if (dialInfo.dial_number) {
        // Cập nhật thông tin callerNumber và widget cuộc gọi toàn hệ thống CHỈ KHI có chuỗi quay số hợp lệ
        useCallStore.getState().startCall({
          customerId: currentCustomer.customer_id,
          customerName: currentCustomer.customer_name,
          phoneMasked: dialInfo.phone_masked,
          memberId: dialInfo.member_id,
          memberName: dialInfo.member_name,
        })

        setTabs((prev) =>
          prev.map((t) =>
            t.id === targetTabId
              ? {
                  ...t,
                  status: 'calling',
                  callerNumber: dialInfo.phone_masked,
                  selectedMemberId: dialInfo.member_id,
                }
              : t,
          ),
        )

        // KIỂM TRA HỦY: Kiểm tra lần nữa trước khi gọi SIP
        if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
          console.warn(`[Telesale] Cuộc gọi Line ${targetTabId} đã bị hủy trước khi gọi SIP.`)
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
          setTabs((prev) =>
            prev.map((t) =>
              autoHeldLineIds.includes(t.id)
                ? { ...t, status: 'paused', isHeld: true }
                : t,
            ),
          )
        }

        await sipService.call(targetTabId, dialInfo.dial_number)

        // KIỂM TRA HỦY: Kiểm tra sau khi sipService.call hoàn tất
        if (!sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
          console.warn(`[Telesale] Cuộc gọi Line ${targetTabId} đã bị hủy trong lúc mở mic.`)
          sipService.hangup(targetTabId)
          rollbackAutoHeld()
          return
        }

        notify(
          `Đang quay số tới ${dialInfo.member_name || 'khách hàng'} qua máy nhánh #${effectiveSipConfig.impi}...`,
        )
      } else {
        notify('Không nhận được mã quay số từ hệ thống tổng đài.')

        // Tránh lỗi "cuộc gọi ma": Đảm bảo useCallStore không bị treo ở trạng thái 'calling'
        const currentTabs = useTelesaleCallStore.getState().tabs
        const remainingConnected = currentTabs.find(
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

        setTabs((prev) =>
          prev.map((t) =>
            t.id === targetTabId && t.status === 'calling'
              ? { ...t, status: 'idle' }
              : t,
          ),
        )
        rollbackAutoHeld()
      }
    } catch (err: any) {
      rollbackAutoHeld()
      const isAborted =
        !sipService.isCallAttemptValid(targetTabId, currentAttemptId) ||
        err?.message?.includes('đã bị hủy')

      if (!isAborted) {
        console.error('Lỗi khi quay số:', err)
        const currentTabs = useTelesaleCallStore.getState().tabs
        const remainingConnected = currentTabs.find(
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
        // Nếu lỗi cuộc gọi hoặc lỗi mic, reset trạng thái tab
        setTabs((prev) =>
          prev.map((t) =>
            t.id === targetTabId && t.status === 'calling'
              ? { ...t, status: 'idle' }
              : t,
          ),
        )
      }
    } finally {
      if (sipService.isCallAttemptValid(targetTabId, currentAttemptId)) {
        sipService.cancelCallAttempt(targetTabId)
      }
      dialingTabsRef.current[targetTabId] = false
    }
  }

  // Bật/tắt micro của tab đang active
  const handleToggleMute = () => {
    const isNowMuted = sipService.toggleMute(activeTabId)
    useCallStore.setState({ isMuted: isNowMuted })
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          notify(isNowMuted ? 'Đã tắt micro' : 'Đã bật micro')
          return { ...t, isMuted: isNowMuted }
        }
        return t
      }),
    )
  }

  // Giữ máy / Tiếp tục cuộc gọi của tab đang active
  const handleToggleHold = () => {
    const result = sipService.toggleHold(activeTabId)
    if (result === null) {
      notify('Chưa thể giữ máy/tiếp tục cuộc gọi lúc này. Vui lòng đợi kết nối ổn định.')
      return
    }
    const isNowHeld = result
    const newStatus = isNowHeld ? 'paused' : 'connected'
    useCallStore.setState({ isHeld: isNowHeld, status: newStatus })
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          notify(isNowHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
          return {
            ...t,
            isHeld: isNowHeld,
            status: newStatus,
          }
        }
        return t
      }),
    )
  }

  // Kết thúc cuộc gọi của tab đang active
  const handleEndCall = () => {
    // Hủy bỏ bất kỳ lượt quay số in-flight nào đang chuẩn bị trên tab này và mở khóa cờ quay số
    sipService.cancelCallAttempt(activeTabId)
    dialingTabsRef.current[activeTabId] = false

    sipService.hangup(activeTabId)
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return { ...t, status: 'ended', isHeld: false }
        }
        return t
      }),
    )
    const otherActiveTab = tabs.find(
      (t) =>
        t.id !== activeTabId &&
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
  }

  // Xử lý sau khi lưu kết quả cuộc gọi thành công ở Cột 3
  const handleSaveResultSuccess = () => {
    // 0. Phòng vệ kép: Đảm bảo gác máy triệt để trên SIP nếu còn session sót lại của line này
    sipService.hangup(activeTabId)

    // 1. Reset bản nháp và trạng thái của tab vừa lưu
    useTelesaleCallStore.getState().resetTabDraft(activeTabId, orderDate)
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            customer: null,
            status: 'idle',
            durationSec: 0,
            isMuted: false,
            isHeld: false,
            callerNumber: undefined,
            selectedMemberId: undefined,
          }
        }
        return t
      }),
    )

    // 2. Tự động nạp khách hàng tiếp theo vào chính tab vừa lưu
    setTimeout(() => {
      handleFetchCustomerForTab(activeTabId)
    }, 400)
  }

  // Chuyển quyền tổng đài SIP sang tab hiện tại thông qua cơ chế Two-Phase Safe Handoff
  const handleClaimMaster = async () => {
    try {
      const result = await tabLeaderService.claimMaster()
      if (!result.success) {
        notify(result.reason || 'Không thể chuyển quyền lúc này. Vui lòng thử lại sau.')
      } else {
        notify('Đã chuyển quyền tổng đài sang tab này.')
      }
    } catch {
      notify('Lỗi khi gửi yêu cầu chuyển quyền tổng đài.')
    }
  }

  return (
    <div className="content telesale-content">
      {/* Banner cảnh báo khi mở nhiều tab và tab này không giữ quyền SIP Master */}
      {!isSipMaster && (
        <div
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c2410c', fontSize: '13px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>
              <strong>Máy nhánh tổng đài đang được kết nối tại một tab trình duyệt khác.</strong> Tab này hiện đang ở chế độ xem để tránh xung đột cuộc gọi.
            </span>
          </div>
          <button
            type="button"
            onClick={handleClaimMaster}
            style={{
              backgroundColor: '#ea580c',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Chuyển quyền tổng đài sang tab này
          </button>
        </div>
      )}

      {/* Tiêu đề trang & Chọn chiến dịch */}
      <div className="page-title telesale-title">
        <div>
          <h1>
            Telesale{' '}
            <span className="live-dot">
              ●{' '}
              {activeTab.status === 'connected'
                ? 'Đang đàm thoại'
                : activeTab.status === 'calling'
                  ? 'Đang đổ chuông'
                  : 'Đang sẵn sàng'}
            </span>
          </h1>
          {/* <h1>Telesale</h1> */}
        </div>

        {/* Dropdown chọn chiến dịch đàm thoại */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6d7f9c', fontWeight: 600 }}>
              Chiến dịch:
            </span>
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => handleCampaignChange(Number(e.target.value))}
              disabled={isLoadingCampaigns || hasActiveCalls}
              title={
                hasActiveCalls
                  ? 'Không thể đổi chiến dịch khi đang có cuộc gọi trên các Line'
                  : undefined
              }
              style={{
                height: '36px',
                border: '1px solid #dce5f0',
                borderRadius: '8px',
                padding: '0 12px',
                background: hasActiveCalls ? '#f1f5f9' : '#fff',
                fontSize: '12px',
                color: hasActiveCalls ? '#94a3b8' : '#263b63',
                fontWeight: 600,
                outline: 'none',
                cursor: hasActiveCalls ? 'not-allowed' : 'pointer',
              }}
            >
              {campaignsList.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            className="help"
            type="button"
            onClick={() =>
              notify('Phím tắt: [Space]: Giữ máy, [M]: Bật/tắt mic, [Esc]: Gác máy')
            }
          >
            <CircleHelp size={17} /> Phím tắt
          </button>
        </div>
      </div>

      {/* 4 Thẻ thống kê hiệu suất thực tế */}
      <section className="call-stat-grid">
        <article className="call-stat blue">
          <div className="card-icon">
            <Clock3 size={21} />
          </div>
          <div>
            <p>Thời gian đàm thoại</p>
            <strong>
              {dailyResults?.tong_tg_dam_thoai
                ? `${dailyResults.tong_tg_dam_thoai} phút`
                : '00:00:00'}
            </strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat blue">
          <div className="card-icon">
            <Phone size={21} />
          </div>
          <div>
            <p>Tổng số cuộc gọi</p>
            <strong>{dailyResults?.tong_total_call ?? 0} cuộc</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <Users size={21} />
          </div>
          <div>
            <p>Kết nối thành công</p>
            <strong>{dailyResults?.tong_call_answer ?? 0} cuộc</strong>
          </div>
          <CheckCircle2 size={19} />
        </article>

        <article className="call-stat blue">
          <div className="card-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p>Đã chốt hôm nay</p>
            <strong>{dailyResults?.tong_da_chot ?? 0} đơn</strong>
          </div>
          <BarChart3 size={19} />
        </article>
      </section>

      {/* Layout 3 cột Telesale chuẩn CRM */}
      <div className="telesale-grid">
        {/* CỘT 1: Lịch Slot hẹn chi nhánh theo ma trận 3 ngày */}
        <TelesaleSchedulePanel
          branchName={selectedCampaign?.branch_name}
          branchId={branchId}
          orderDate={orderDate}
          onDateChange={handleOrderDateChange}
          selectedSlotId={orderSlotId}
          onSelectSlot={(slotId, slotTime, date) => {
            setOrderSlotId(slotId)
            setOrderTime(slotTime)
            const d = date || orderDate
            if (date) {
              setOrderDate(date)
            }
            useTelesaleCallStore.getState().updateTabDraft(activeTabId, {
              orderSlotId: slotId,
              orderTime: slotTime,
              orderDate: d,
            })
          }}
        />

        {/* CỘT 2: Điều khiển cuộc gọi theo mô hình 3 Tab độc lập */}
        <TelesaleCallCenterPanel
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onSelectMemberId={handleSelectMemberId}
          onDial={handleDial}
          onToggleMute={handleToggleMute}
          onToggleHold={handleToggleHold}
          onEndCall={handleEndCall}
          onFetchCustomerForTab={handleFetchCustomerForTab}
          isFetchingCustomer={nextCustomerMutation.isPending}
          isDialing={dialCallMutation.isPending}
          sipRegStatus={sipRegStatus}
          sipExtension={effectiveSipConfig?.impi || user?.userExtension}
          onReconnectSip={() => {
            if (!effectiveSipConfig) {
              notify('Chưa có thông tin cấu hình máy nhánh SIP từ máy chủ.')
              return
            }
            sipService.init(effectiveSipConfig)
            notify('Đang gửi lệnh kết nối lại tổng đài...')
          }}
          currentCustomer={currentCustomer}
          onFetchNextCustomer={() => handleFetchCustomerForTab(activeTabId)}
        />

        {/* CỘT 3: Hồ sơ khách hàng & Form kết quả cuộc gọi (đồng bộ theo Tab active) */}
        <TelesaleCustomerPanel
          activeTabId={activeTabId}
          activeTabLabel={activeTab.label}
          activeTabStatus={activeTab.status}
          currentCustomer={currentCustomer}
          selectedCampaignName={selectedCampaign?.name}
          branchId={branchId}
          orderDate={orderDate}
          onOrderDateChange={handleOrderDateChange}
          orderTime={orderTime}
          onOrderTimeChange={handleOrderTimeChange}
          orderSlotId={orderSlotId}
          onOrderSlotIdChange={setOrderSlotId}
          onFetchNextCustomer={() => handleFetchCustomerForTab(activeTabId)}
          onSaveResultSuccess={handleSaveResultSuccess}
        />
      </div>
    </div>
  )
}

export default Telesale
