import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Clock3,
  History,
  Phone,
  ShoppingCart,
  Upload,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import {
  useCampaigns,
  useDailyResults,
  useNextCustomerMutation,
} from '../../hooks/useTelesale'
import { useMakeCall } from '../../hooks/useMakeCall'
import { useAuthStore } from '../../store/useAuthStore'
import { useCallStore } from '../../store/useCallStore'
import { useTelesaleCallStore } from '../../store/useTelesaleCallStore'
import sipService from '../../services/sipService'
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
import { TelesaleHotkeysModal } from './components/TelesaleHotkeysModal'
import { TelesaleImportModal } from './components/TelesaleImportModal'
import { TelesaleCallLogsDrawer } from './components/TelesaleCallLogsDrawer'

// Re-export để đảm bảo tính tương thích ngược toàn dự án
export {
  TelesaleSchedulePanel,
  TelesaleCallCenterPanel,
  TelesaleCustomerPanel,
  TelesaleImportModal,
  TelesaleCallLogsDrawer,
  resultOptions,
}

export const Telesale: React.FC = () => {
  // 0. Thông tin user và hook Softphone tập trung
  const { user } = useAuthStore()
  const {
    makeCall,
    endCall,
    toggleMute,
    toggleHold,
    reconnectSip,
    isDialing,
    sipRegStatus,
    isSipMaster,
    effectiveSipConfig,
  } = useMakeCall()

  // 1. Quản lý danh sách chiến dịch đàm thoại
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns()
  const campaignsList = useMemo(() => campaignsData?.items || [], [campaignsData?.items])
  const selectedCampaignId = useTelesaleCallStore((s) => s.selectedCampaignId)
  const setSelectedCampaignId = useTelesaleCallStore((s) => s.setSelectedCampaignId)

  // Ưu tiên chọn chiến dịch Hà Nội làm mặc định khi danh sách tải xong nếu chưa có chiến dịch nào được chọn
  useEffect(() => {
    if (campaignsList.length > 0 && !selectedCampaignId) {
      const hanoiCampaign = campaignsList.find((c) => {
        const name = (c.name || '').toLowerCase()
        const branchName = (c.branch_name || '').toLowerCase()
        return (
          name.includes('hà nội') ||
          name.includes('ha noi') ||
          branchName.includes('hà nội') ||
          branchName.includes('ha noi') ||
          branchName.includes('đại kim') ||
          branchName.includes('dai kim')
        )
      })

      if (hanoiCampaign) {
        setSelectedCampaignId(hanoiCampaign.campaign_id)
      } else {
        setSelectedCampaignId(campaignsList[0].campaign_id)
      }
    }
  }, [campaignsList, selectedCampaignId, setSelectedCampaignId])

  const selectedCampaign = useMemo(() => {
    return campaignsList.find((c) => c.campaign_id === selectedCampaignId) || campaignsList[0]
  }, [campaignsList, selectedCampaignId])

  // Trích xuất danh sách tất cả các chi nhánh khả dụng từ danh sách chiến dịch mà nhân viên có quyền
  const availableBranches = useMemo(() => {
    const map = new Map<number, string>()
    campaignsList.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        map.set(c.branch_id, c.branch_name)
      }
    })
    if (map.size === 0) {
      map.set(3, 'Trụ sở Hà Nội')
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [campaignsList])

  // 2. Thống kê kết quả đàm thoại trong ngày
  const { data: dailyResults } = useDailyResults()

  // 3. Quản lý mô hình 3 Tab / 3 Line cuộc gọi độc lập (Đưa ra Store toàn cục, chuyển trang không mất)
  const tabs = useTelesaleCallStore((s) => s.tabs)
  const setTabs = useTelesaleCallStore((s) => s.setTabs)
  const activeTabId = useTelesaleCallStore((s) => s.activeTabId)
  const setActiveTabId = useTelesaleCallStore((s) => s.setActiveTabId)

  // Chi nhánh hiệu lực của tab hiện tại (mặc định lấy theo campaign, có thể chọn chi nhánh khác theo tab draft)
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0]
  }, [tabs, activeTabId])

  // Tab đang hoạt động
  const currentCustomer = activeTab?.customer

  // Ngày và ca hẹn đồng bộ giữa Cột 1 (SchedulePanel) và Cột 3 (CustomerPanel)
  const [orderDate, setOrderDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [orderTime, setOrderTime] = useState('08:30')
  const [orderSlotId, setOrderSlotId] = useState<number | undefined>(undefined)
  const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isCallLogsDrawerOpen, setIsCallLogsDrawerOpen] = useState(false)

  // Chi nhánh ưu tiên trực tiếp theo chiến dịch đang chọn (mỗi chiến dịch đã ứng với 1 chi nhánh)
  const branchId = selectedCampaign?.branch_id || activeTab?.draftResult?.branchId || 3
  const branchName =
    selectedCampaign?.branch_name ||
    availableBranches.find((b) => b.id === branchId)?.name ||
    'Trụ sở Hà Nội'

  const handleBranchChange = React.useCallback(
    (newBranchId: number) => {
      useTelesaleCallStore.getState().updateTabDraft(activeTabId, {
        branchId: newBranchId,
        orderSlotId: undefined, // Reset slot cũ vì slot không còn hiệu lực trên chi nhánh mới
      })
      setOrderSlotId(undefined)
      const name = availableBranches.find((b) => b.id === newBranchId)?.name || `Chi nhánh #${newBranchId}`
      notify(`Đã chuyển sang ${name}. Lịch slot hẹn đã được cập nhật.`)
    },
    [activeTabId, availableBranches],
  )

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

  // Quay số cho thành viên của Tab đang active thông qua hook Softphone tập trung
  const handleDial = async (memberId?: number) => {
    if (!currentCustomer) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }
    const targetMemberId =
      memberId || activeTab.selectedMemberId || currentCustomer.members?.[0]?.member_id

    await makeCall({
      customerId: currentCustomer.customer_id,
      customerName: currentCustomer.customer_name,
      memberId: targetMemberId,
      lineId: activeTabId,
      customer: currentCustomer,
      isTelesale: true,
    })
  }

  // Bật/tắt micro của tab đang active
  const handleToggleMute = () => {
    toggleMute(activeTabId)
  }

  // Giữ máy / Tiếp tục cuộc gọi của tab đang active
  const handleToggleHold = () => {
    toggleHold(activeTabId)
  }

  // Kết thúc cuộc gọi của tab đang active
  const handleEndCall = () => {
    endCall(activeTabId)
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

  // Giữ tham chiếu mới nhất cho các hàm thao tác cuộc gọi và dữ liệu tab để phím tắt luôn chạy mượt mà
  const hotkeyContextRef = useRef({
    activeTab,
    activeTabId,
    currentCustomer,
    isDialing,
    isFetchingCustomer: nextCustomerMutation.isPending,
    sipRegStatus,
    handleSelectTab,
    handleDial,
    handleToggleMute,
    handleToggleHold,
    handleEndCall,
    handleFetchCustomerForTab,
  })

  useEffect(() => {
    hotkeyContextRef.current = {
      activeTab,
      activeTabId,
      currentCustomer,
      isDialing,
      isFetchingCustomer: nextCustomerMutation.isPending,
      sipRegStatus,
      handleSelectTab,
      handleDial,
      handleToggleMute,
      handleToggleHold,
      handleEndCall,
      handleFetchCustomerForTab,
    }
  })

  // Lắng nghe các phím tắt toàn cục cho Telesale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        activeTab: curTab,
        activeTabId: curTabId,
        currentCustomer: curCustomer,
        isDialing: curDialing,
        isFetchingCustomer: curFetching,
        sipRegStatus: curSipStatus,
        handleSelectTab: doSelectTab,
        handleDial: doDial,
        handleToggleMute: doToggleMute,
        handleToggleHold: doToggleHold,
        handleEndCall: doEndCall,
        handleFetchCustomerForTab: doFetchCustomer,
      } = hotkeyContextRef.current

      // 1. Phím tắt chuyển Line: Alt + 1, Alt + 2, Alt + 3 (luôn hoạt động)
      if (e.altKey && (e.key === '1' || e.key === '2' || e.key === '3')) {
        e.preventDefault()
        const targetTabId = Number(e.key)
        doSelectTab(targetTabId)
        return
      }

      // 2. Chống kích hoạt nhầm khi người dùng đang nhập liệu trong input, textarea, select
      const target = e.target as HTMLElement
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) {
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      // Nếu đang mở modal phím tắt, modal sẽ tự lắng nghe Escape để đóng
      if (isHotkeysModalOpen) {
        return
      }

      const isInCall =
        curTab.status === 'calling' ||
        curTab.status === 'connected' ||
        curTab.status === 'paused'

      // Phím Escape: Gác máy / Kết thúc cuộc gọi
      if (e.key === 'Escape') {
        if (isInCall) {
          e.preventDefault()
          doEndCall()
        }
        return
      }

      // Phím Space: Giữ máy / Tiếp tục (Hold / Unhold)
      if (e.code === 'Space' || e.key === ' ') {
        if (isInCall) {
          e.preventDefault()
          doToggleHold()
        }
        return
      }

      // Phím M: Bật / Tắt micro
      if (e.key === 'm' || e.key === 'M') {
        if (isInCall) {
          e.preventDefault()
          doToggleMute()
        }
        return
      }

      // Phím Enter: Bắt đầu gọi (khi idle) hoặc Gọi lại (khi ended)
      if (e.key === 'Enter') {
        if (
          (curTab.status === 'idle' || curTab.status === 'ended') &&
          !curDialing &&
          curSipStatus === 'registered' &&
          curCustomer
        ) {
          e.preventDefault()
          doDial()
        }
        return
      }

      // Phím N: Đổi sang khách hàng khác (Next customer)
      if (e.key === 'n' || e.key === 'N') {
        if (!isInCall && !curFetching && !curDialing) {
          e.preventDefault()
          doFetchCustomer(curTabId)
        }
        return
      }

      // Phím R: Gọi lại số vừa kết thúc
      if (e.key === 'r' || e.key === 'R') {
        if (
          curTab.status === 'ended' &&
          !curDialing &&
          curSipStatus === 'registered' &&
          curCustomer
        ) {
          e.preventDefault()
          doDial()
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isHotkeysModalOpen])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '100%' }}>
            <span style={{ fontSize: '12px', color: '#6d7f9c', fontWeight: 600, whiteSpace: 'nowrap' }}>
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
                maxWidth: 'min(240px, calc(100vw - 120px))',
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
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 13px',
              borderRadius: '8px',
              border: '1.5px solid #bfdbfe',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title="Import tệp danh sách khách hàng (Excel/CSV) vào chiến dịch"
          >
            <Upload size={15} />
            <span>Import dữ liệu</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCallLogsDrawerOpen(true)}
            style={{
              height: '36px',
              padding: '0 13px',
              borderRadius: '8px',
              border: '1.5px solid #c7d2fe',
              background: '#eef2ff',
              color: '#4338ca',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            title="Xem danh sách cuộc gọi đã thực hiện hôm nay & nghe file ghi âm"
          >
            <History size={15} />
            <span>Lịch sử cuộc gọi hôm nay</span>
            {dailyResults?.tong_total_call !== undefined && dailyResults.tong_total_call > 0 && (
              <span
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: '2px',
                }}
              >
                {dailyResults.tong_total_call}
              </span>
            )}
          </button>

          <button
            className="help"
            type="button"
            onClick={() => setIsHotkeysModalOpen(true)}
            title="Xem danh sách phím tắt thao tác nhanh"
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

        <article
          className="call-stat blue"
          onClick={() => setIsCallLogsDrawerOpen(true)}
          style={{ cursor: 'pointer' }}
          title="Bấm để xem danh sách lịch sử cuộc gọi hôm nay"
        >
          <div className="card-icon">
            <Phone size={21} />
          </div>
          <div>
            <p>Tổng số cuộc gọi</p>
            <strong>{dailyResults?.tong_total_call ?? 0} cuộc</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article
          className="call-stat green"
          onClick={() => setIsCallLogsDrawerOpen(true)}
          style={{ cursor: 'pointer' }}
          title="Bấm để xem danh sách lịch sử cuộc gọi hôm nay"
        >
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
          branchName={branchName}
          branchId={branchId}
          availableBranches={availableBranches}
          onBranchChange={handleBranchChange}
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
              branchId,
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
          isDialing={isDialing}
          sipRegStatus={sipRegStatus}
          sipExtension={effectiveSipConfig?.impi || user?.userExtension}
          onReconnectSip={reconnectSip}
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
          branchName={branchName}
          availableBranches={availableBranches}
          onBranchChange={handleBranchChange}
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

      {/* Modal tra cứu phím tắt đàm thoại Telesale */}
      <TelesaleHotkeysModal
        isOpen={isHotkeysModalOpen}
        onClose={() => setIsHotkeysModalOpen(false)}
      />

      {/* Modal Import danh sách khách hàng vào chiến dịch từ Excel/CSV */}
      <TelesaleImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        campaigns={campaignsList}
        currentCampaignId={selectedCampaignId || undefined}
        onImportSuccess={() => {
          // Nếu tab hiện tại chưa có khách hàng, tự động kích hoạt nạp khách hàng mới
          if (!activeTab.customer) {
            handleFetchCustomerForTab(activeTabId)
          }
        }}
      />

      {/* Drawer xem lại lịch sử cuộc gọi hôm nay và phát bản ghi âm */}
      <TelesaleCallLogsDrawer
        isOpen={isCallLogsDrawerOpen}
        onClose={() => setIsCallLogsDrawerOpen(false)}
      />
    </div>
  )
}

export default Telesale
