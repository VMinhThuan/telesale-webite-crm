import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Building2,
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
import { determinePhanQuyen } from '../../services/auth.service'
import { useCallStore } from '../../store/useCallStore'
import { useTelesaleCallStore } from '../../store/useTelesaleCallStore'
import { useCustomBranchConfig, useSaveBranchAddressMutation } from '../../hooks/useCustomBranchConfig'
import sipService from '../../services/sipService'
import { tabLeaderService } from '../../services/tabLeaderService'
import { notify } from '../../utils/notify'
import { CampaignDto, ErpSource } from '../../types/api'

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
import { CustomBranchesModal } from './components/CustomBranchesModal'

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

  // 1. Quản lý danh sách chiến dịch đàm thoại từ cả 2 hệ thống ERP
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns()
  // Danh sách chiến dịch đầy đủ: tự động gộp chiến dịch API + Chiến dịch/Chi nhánh bổ sung do Admin cấu hình từ useCampaigns
  const campaignsList = useMemo(() => campaignsData?.items || [], [campaignsData?.items])
  // Danh sách chiến dịch chuẩn từ ERP (loại trừ chi nhánh bổ sung) để phục vụ khởi tạo mặc định ban đầu và kiểm tra trùng lặp
  const rawCampaigns = useMemo(
    () => (campaignsData?.items || []).filter((c) => !c.is_custom),
    [campaignsData?.items],
  )
  const selectedCampaignId = useTelesaleCallStore((s) => s.selectedCampaignId)
  const setSelectedCampaignId = useTelesaleCallStore((s) => s.setSelectedCampaignId)
  const selectedCampaignKey = useTelesaleCallStore((s) => s.selectedCampaignKey)
  const setSelectedCampaignKey = useTelesaleCallStore((s) => s.setSelectedCampaignKey)

  // Phân quyền quản trị Admin & Cấu hình chi nhánh bổ sung ngoài chiến dịch
  const isAdmin = determinePhanQuyen(user) === 'admin'
  const { data: customBranchConfigFile } = useCustomBranchConfig()
  const customBranches = useMemo(
    () => customBranchConfigFile?.branches || [],
    [customBranchConfigFile?.branches],
  )
  const [isCustomBranchesModalOpen, setIsCustomBranchesModalOpen] = useState(false)

  const getCampaignKey = (c: { campaign_id: number; source_erp?: string }) =>
    `${c.source_erp || 'locnuoc365'}_${c.campaign_id}`

  // Khởi tạo chiến dịch mặc định ban đầu: CHỈ chọn từ chiến dịch chuẩn API (rawCampaigns), ưu tiên Hà Nội, tuyệt đối không tự ý lấy chi nhánh bổ sung của Admin
  const hasInitializedDefaultCampaignRef = useRef(false)
  useEffect(() => {
    if (rawCampaigns.length === 0) return

    if (!hasInitializedDefaultCampaignRef.current) {
      hasInitializedDefaultCampaignRef.current = true

      // Kiểm tra xem chiến dịch đang lưu có phải là 1 chiến dịch chuẩn trong rawCampaigns không
      const isCurrentInRaw = selectedCampaignKey
        ? rawCampaigns.some((c) => getCampaignKey(c) === selectedCampaignKey)
        : false

      // Nếu chưa có chiến dịch được chọn, hoặc đang bị lưu sai vào chi nhánh bổ sung của admin:
      // Luôn khôi phục về chiến dịch chuẩn API ban đầu (ưu tiên Hà Nội / Chi nhánh Đại Kim, hoặc rawCampaigns[0])
      if (!selectedCampaignKey || !isCurrentInRaw) {
        const hanoiCampaign = rawCampaigns.find((c) => {
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

        const targetCamp = hanoiCampaign || rawCampaigns[0]
        if (targetCamp) {
          setSelectedCampaignKey(getCampaignKey(targetCamp))
          setSelectedCampaignId(targetCamp.campaign_id)
        }
      }
    }
  }, [rawCampaigns, selectedCampaignKey, setSelectedCampaignKey, setSelectedCampaignId])

  const selectedCampaign = useMemo(() => {
    if (selectedCampaignKey) {
      const match = campaignsList.find((c) => getCampaignKey(c) === selectedCampaignKey)
      if (match) return match
    }
    if (selectedCampaignId) {
      const match = campaignsList.find((c) => c.campaign_id === selectedCampaignId)
      if (match) return match
    }
    // Fallback: Ưu tiên chiến dịch gốc từ API (rawCampaigns), tuyệt đối không tự ý fallback vào chi nhánh bổ sung
    return rawCampaigns[0] || undefined
  }, [campaignsList, rawCampaigns, selectedCampaignKey, selectedCampaignId])

  // Nguồn ERP của chiến dịch đang chọn
  const currentErpSource: ErpSource = selectedCampaign?.source_erp || 'locnuoc365'

  // Trích xuất danh sách TẤT CẢ các chi nhánh khả dụng từ cả 2 nguồn ERP (Lọc Nước 365 & Zomzem)
  // để phục vụ việc xem slot linh hoạt liên chi nhánh (Cross-ERP)
  const allAvailableBranches = useMemo(() => {
    const map = new Map<string, { key: string; id: number; name: string; source_erp: ErpSource }>()
    
    campaignsList.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        const erp = (c.source_erp || 'locnuoc365') as ErpSource
        const key = `${erp}_${c.branch_id}`
        map.set(key, {
          key,
          id: c.branch_id,
          name: c.branch_name,
          source_erp: erp,
        })
      }
    })

    if (map.size === 0) {
      map.set('locnuoc365_3', {
        key: 'locnuoc365_3',
        id: 3,
        name: 'Chi Nhánh Đại Kim',
        source_erp: 'locnuoc365',
      })
    }
    return Array.from(map.values())
  }, [campaignsList])

  // Chi nhánh chỉ thuộc nguồn ERP của chiến dịch đang chọn (dùng cho bộ lọc thông thường nếu cần)
  const availableBranches = useMemo(() => {
    return allAvailableBranches.filter((b) => b.source_erp === currentErpSource)
  }, [allAvailableBranches, currentErpSource])

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

  // 1. Chi nhánh gốc của chiến dịch đang chọn
  const campaignBranchId = selectedCampaign?.branch_id || 3
  const campaignSourceErp: ErpSource = selectedCampaign?.source_erp || 'locnuoc365'
  const campaignBranchKey = `${campaignSourceErp}_${campaignBranchId}`
  const campaignBranchName = selectedCampaign?.branch_name || 'Chi Nhánh Đại Kim'

  // 2. Lấy draft của Tab đang active để xác định chi nhánh đang xem cho Tab đó
  const activeTabDraft = useTelesaleCallStore((s) => s.drafts[activeTabId])
  const activeBranchKey =
    activeTabDraft?.branchKey ||
    (activeTabDraft?.branchId
      ? `${activeTabDraft.branchSourceErp || campaignSourceErp}_${activeTabDraft.branchId}`
      : campaignBranchKey)

  // 3. Chi nhánh đang chọn (Ưu tiên draft của tab -> Fallback sang chi nhánh gốc chiến dịch)
  const currentBranch =
    allAvailableBranches.find((b) => b.key === activeBranchKey) ||
    allAvailableBranches.find((b) => b.id === campaignBranchId && b.source_erp === campaignSourceErp) ||
    allAvailableBranches[0]

  const branchId = currentBranch.id
  const branchName = currentBranch.name
  const scheduleSourceErp = currentBranch.source_erp

  // 4. Địa chỉ chi nhánh từ cấu hình R2 (kèm inline edit của Admin)
  const branchAddress = customBranchConfigFile?.branchAddresses?.[currentBranch.key] || ''
  const saveBranchAddressMutation = useSaveBranchAddressMutation()

  const handleUpdateAddress = React.useCallback(
    async (newAddress: string) => {
      await saveBranchAddressMutation.mutateAsync({
        branchKey: currentBranch.key,
        address: newAddress,
      })
    },
    [saveBranchAddressMutation, currentBranch.key],
  )

  // Đổi chi nhánh cho tab hiện tại (lưu vào draft của Tab đó, không ảnh hưởng tab khác)
  const handleBranchChange = React.useCallback(
    (newBranchId: number, newSourceErp?: ErpSource) => {
      const erp = newSourceErp || currentBranch.source_erp || 'locnuoc365'
      const key = `${erp}_${newBranchId}`
      useTelesaleCallStore.getState().updateTabDraft(activeTabId, {
        branchId: newBranchId,
        branchSourceErp: erp,
        branchKey: key,
        orderSlotId: undefined, // Reset slot cũ vì slot không còn hiệu lực trên chi nhánh mới
      })
      setOrderSlotId(undefined)
      const found = allAvailableBranches.find((b) => b.key === key)
      const name = found?.name || `Chi nhánh #${newBranchId}`
      notify(`Đã chuyển sang ${name}. Lịch slot hẹn đã được cập nhật.`)
    },
    [activeTabId, allAvailableBranches, currentBranch.source_erp],
  )

  // Khôi phục về chi nhánh gốc của chiến dịch hiện tại (1-click reset)
  const handleResetToCampaignBranch = React.useCallback(() => {
    useTelesaleCallStore.getState().updateTabDraft(activeTabId, {
      branchId: campaignBranchId,
      branchSourceErp: campaignSourceErp,
      branchKey: campaignBranchKey,
      orderSlotId: undefined,
    })
    setOrderSlotId(undefined)
    notify(`Đã quay về chi nhánh gốc: ${campaignBranchName}`)
  }, [activeTabId, campaignBranchId, campaignSourceErp, campaignBranchKey, campaignBranchName])

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
    async (
      targetTabId: number,
      campaignOverride?: any,
      options?: { autoDial?: boolean },
    ) => {
      let activeCamp: any = selectedCampaign
      if (campaignOverride && typeof campaignOverride === 'object') {
        activeCamp = campaignOverride
      } else if (typeof campaignOverride === 'number') {
        activeCamp = campaignsList.find((c) => c.campaign_id === campaignOverride) || selectedCampaign
      }

      const activeCampId = activeCamp?.campaign_id
      if (!activeCampId) {
        notify('Vui lòng chọn chiến dịch trước khi lấy khách', { type: 'warning' })
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
          { type: 'warning' },
        )
        return
      }

      // Đảm bảo gác máy triệt để trên SIP nếu line này còn session sót lại từ cuộc gọi trước
      sipService.hangup(targetTabId)

      // Clear trạng thái lỗi cũ trước khi lấy khách mới cho tab này
      setTabs((prev) =>
        prev.map((t) => (t.id === targetTabId ? { ...t, fetchError: null } : t)),
      )

      try {
        const nextCust = await nextCustomerMutation.mutateAsync({
          campaign_id: activeCampId,
          call_mode: 'chien_dich',
          source_erp: activeCamp?.source_erp || 'locnuoc365',
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
            { type: 'warning' },
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
                fetchError: null,
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

        notify(`Đã nạp khách hàng cho Số ${targetTabId}: ${nextCust.customer_name}`, { type: 'success' })

        // 3. Nếu bật chế độ tự động gọi (autoDial) và nạp thành công khách mới: Tự động kết nối cuộc gọi luôn
        if (options?.autoDial && nextCust) {
          // Trì hoãn 450ms để giải phóng session SIP cũ và UI render xong thông tin khách mới
          setTimeout(async () => {
            const currentTab = useTelesaleCallStore.getState().tabs.find((t) => t.id === targetTabId)
            // Đảm bảo tab vẫn ở trạng thái rảnh rỗi (idle)
            if (currentTab && currentTab.status === 'idle') {
              const targetMemberId =
                currentTab.selectedMemberId ||
                nextCust.members?.[0]?.member_id

              notify(`Đang tự động kết nối cuộc gọi tới: ${nextCust.customer_name}...`, {
                type: 'info',
              })

              await makeCall({
                customerId: nextCust.customer_id,
                customerName: nextCust.customer_name,
                memberId: targetMemberId,
                lineId: targetTabId,
                customer: nextCust,
                isTelesale: true,
              })
            }
          }, 450)
        }

        return nextCust
      } catch (err: any) {
        const errorMsg =
          err?.message ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Không có khách hàng nào để gọi'

        // Đánh dấu tab này đang gặp lỗi nạp khách để UI hiển thị banner cảnh báo
        setTabs((prev) =>
          prev.map((t) => (t.id === targetTabId ? { ...t, fetchError: errorMsg } : t)),
        )

        // Hiển thị thông báo Toast cảnh báo rõ ràng
        notify(`⚠️ ${activeCamp?.name || 'Chiến dịch'}: ${errorMsg}`, {
          type: 'warning',
          duration: 4500,
        })
        return null
      }
    },
    [nextCustomerMutation, selectedCampaign, campaignsList, setTabs, orderDate, makeCall],
  )

  // Khởi tạo nạp khách hàng ban đầu cho Tab 1 DUY NHẤT 1 LẦN khi hệ thống chưa có khách trên bất kỳ tab nào
  // Không bao giờ reset hay nạp đè khi người dùng chỉ chuyển trang rồi quay lại
  const hasCheckedInitialFetchRef = useRef(false)
  useEffect(() => {
    // Chỉ nạp khách ban đầu khi đã có selectedCampaign và danh sách chiến dịch API gốc (rawCampaigns) đã sẵn sàng
    if (!selectedCampaign || rawCampaigns.length === 0 || hasCheckedInitialFetchRef.current) return

    // Tuyệt đối không tự động nạp khách ban đầu cho chi nhánh bổ sung ngoài chiến dịch của Admin
    const isCustomBranch = customBranches.some(
      (b) =>
        Number(b.branch_id) === Number(selectedCampaign.branch_id) &&
        (b.source_erp || 'locnuoc365') === (selectedCampaign.source_erp || 'locnuoc365'),
    )
    const isRawCampaign = rawCampaigns.some(
      (c) => getCampaignKey(c) === getCampaignKey(selectedCampaign),
    )
    if (!isRawCampaign && isCustomBranch) {
      return
    }

    const currentTabs = useTelesaleCallStore.getState().tabs
    const hasAnyCustomerOrCall =
      currentTabs.some((t) => t.customer !== null || t.status !== 'idle') ||
      sipService.hasActiveCalls()

    if (!hasAnyCustomerOrCall) {
      hasCheckedInitialFetchRef.current = true
      handleFetchCustomerForTab(1, selectedCampaign)
    } else {
      hasCheckedInitialFetchRef.current = true
    }
  }, [handleFetchCustomerForTab, selectedCampaign, rawCampaigns, customBranches])

  // Xử lý chuyển chiến dịch chủ động từ người dùng (kèm Guard bảo vệ cuộc gọi)
  const handleCampaignChange = (newCampKey: string) => {
    if (newCampKey === selectedCampaignKey) return

    if (hasActiveCalls) {
      notify(
        'Đang có cuộc gọi trên một trong các Line. Vui lòng kết thúc cuộc gọi trước khi đổi chiến dịch!',
      )
      return
    }

    const found = campaignsList.find((c) => getCampaignKey(c) === newCampKey)
    if (found) {
      setSelectedCampaignKey(newCampKey)
      setSelectedCampaignId(found.campaign_id)
      notify(`Đã chuyển sang chiến dịch: ${found.name}`)
      useTelesaleCallStore.getState().resetTabs()
      setTabs((prev) => prev.map((t) => ({ ...t, fetchError: null })))
      handleFetchCustomerForTab(1, found)
    }
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
  const handleSaveResultSuccess = React.useCallback(
    (options?: { autoDial?: boolean }) => {
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

      // 2. Tự động nạp khách hàng tiếp theo vào chính tab vừa lưu (kèm cờ autoDial)
      setTimeout(async () => {
        await handleFetchCustomerForTab(activeTabId, undefined, { autoDial: options?.autoDial })
      }, 400)
    },
    [activeTabId, orderDate, setTabs, handleFetchCustomerForTab],
  )

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
              value={selectedCampaign ? getCampaignKey(selectedCampaign) : ''}
              onChange={(e) => handleCampaignChange(e.target.value)}
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
                maxWidth: 'min(280px, calc(100vw - 120px))',
              }}
            >
              {campaignsList.map((c) => {
                const campKey = getCampaignKey(c)
                return (
                  <option key={campKey} value={campKey}>
                    {c.name}
                  </option>
                )
              })}
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

          {/* Nút Quản lý Chi nhánh Bổ sung dành riêng cho Admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsCustomBranchesModalOpen(true)}
              style={{
                height: '36px',
                padding: '0 13px',
                borderRadius: '8px',
                border: '1.5px solid #fed7aa',
                background: '#fff7ed',
                color: '#c2410c',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              title="Cấu hình danh sách chi nhánh bổ sung ngoài chiến dịch (Dành riêng cho Admin)"
            >
              <Building2 size={15} />
              <span>Chi nhánh bổ sung</span>
              {customBranches.filter((b) => b.is_active).length > 0 && (
                <span
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {customBranches.filter((b) => b.is_active).length}
                </span>
              )}
            </button>
          )}

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
          availableBranches={allAvailableBranches}
          currentBranchKey={currentBranch.key}
          campaignBranchKey={campaignBranchKey}
          campaignBranchName={campaignBranchName}
          branchAddress={branchAddress}
          isAdmin={isAdmin}
          onBranchChange={handleBranchChange}
          onResetToCampaignBranch={handleResetToCampaignBranch}
          onUpdateAddress={handleUpdateAddress}
          orderDate={orderDate}
          onDateChange={handleOrderDateChange}
          selectedSlotId={orderSlotId}
          source_erp={scheduleSourceErp}
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
              branchSourceErp: scheduleSourceErp,
              branchKey: currentBranch.key,
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
          selectedCampaignName={selectedCampaign?.name}
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
          availableBranches={allAvailableBranches}
          onBranchChange={handleBranchChange}
          orderDate={orderDate}
          onOrderDateChange={handleOrderDateChange}
          orderTime={orderTime}
          onOrderTimeChange={handleOrderTimeChange}
          orderSlotId={orderSlotId}
          onOrderSlotIdChange={setOrderSlotId}
          onFetchNextCustomer={() => handleFetchCustomerForTab(activeTabId)}
          onSaveResultSuccess={handleSaveResultSuccess}
          source_erp={currentCustomer?.source_erp || selectedCampaign?.source_erp || 'locnuoc365'}
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

      {/* Modal quản lý chi nhánh bổ sung ngoài chiến dịch (Chỉ dành cho Admin) */}
      {isAdmin && (
        <CustomBranchesModal
          isOpen={isCustomBranchesModalOpen}
          onClose={() => setIsCustomBranchesModalOpen(false)}
          campaigns={rawCampaigns}
        />
      )}
    </div>
  )
}

export default Telesale
