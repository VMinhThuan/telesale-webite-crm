import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleX,
  Clock3,
  Droplets,
  FileText,
  MapPin,
  Pencil,
  Phone,
  PhoneCall,
  Save,
  ShoppingCart,
  UserRound,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import dayjs from '../../../lib/dayjs'
import { useEnums } from '../../../hooks/useEnums'
import { useSaveCallResultMutation } from '../../../hooks/useTelesale'
import { useTelesaleCallStore } from '../../../store/useTelesaleCallStore'
import {
  CallResultOutcome,
  NextCustomerDto,
  SaveCallResultPayload,
} from '../../../types/api'
import { generateIdempotencyKey } from '../../../services/apiClient'
import { formatVND } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'
import { CustomerEditModal } from './CustomerEditModal'

export const resultOptions: {
  key: CallResultOutcome
  label: string
  icon: any
  tone: string
}[] = [
  { key: 'callback', label: 'Gọi chốt', icon: PhoneCall, tone: 'amber' },
  { key: 'potential', label: 'Khách tiềm năng', icon: Users, tone: 'green' },
  { key: 'closed', label: 'Đã chốt đơn', icon: ShoppingCart, tone: 'green' },
  { key: 'not_interested', label: 'Không nhu cầu', icon: CircleX, tone: 'gray' },
  { key: 'no_filter_machine', label: 'Không dùng máy lọc nước', icon: Droplets, tone: 'gray' },
  { key: 'wrong_number', label: 'Sai số', icon: CircleX, tone: 'gray' },
]

export interface TelesaleCustomerPanelProps {
  currentCustomer: NextCustomerDto | null
  selectedCampaignName?: string
  branchId: number
  branchName?: string
  availableBranches?: { id: number; name: string }[]
  onBranchChange?: (branchId: number) => void
  orderDate: string
  onOrderDateChange: (date: string) => void
  orderTime: string
  onOrderTimeChange: (time: string) => void
  orderSlotId?: number
  onOrderSlotIdChange?: (slotId?: number) => void
  activeTabId?: number
  activeTabLabel?: string
  activeTabStatus?: string
  onFetchNextCustomer?: () => void
  onCustomerUpdate?: (updatedCustomer: NextCustomerDto) => void
  onSaveResultSuccess: () => void
}

export const TelesaleCustomerPanel: React.FC<TelesaleCustomerPanelProps> = ({
  currentCustomer,
  selectedCampaignName,
  branchId,
  branchName,
  onBranchChange,
  orderDate,
  onOrderDateChange,
  orderTime,
  onOrderTimeChange,
  orderSlotId,
  onOrderSlotIdChange,
  activeTabId = 1,
  activeTabLabel,
  activeTabStatus,
  onCustomerUpdate,
  onSaveResultSuccess,
}) => {
  // Modal chỉnh sửa thông tin khách hàng (sửa địa chỉ, thêm số điện thoại)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  // Đồng bộ bản nháp đa tab với useTelesaleCallStore
  const updateTabDraft = useTelesaleCallStore((s) => s.updateTabDraft)
  // Lấy dữ liệu danh mục Enums hệ thống
  const {
    services: serviceOptions,
    doCanMang: doCanMangOptions,
    machineProblems: machineProblemOptions,
    moreRequest: moreRequestOptions,
    painPoint: painPointOptions,
    deniedReasons,
  } = useEnums()

  const saveCallResultMutation = useSaveCallResultMutation()

  // Khóa chống double-click tức thời và quản lý Idempotency-Key
  const isSubmittingResultRef = useRef(false)
  const currentOrderKeyRef = useRef<string>(generateIdempotencyKey())

  // Form states cho kết quả cuộc gọi
  const [selectedOutcome, setSelectedOutcome] = useState<CallResultOutcome>('potential')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('14:30')
  const [note, setNote] = useState('')

  // Chế độ tự động lưu kết quả & nạp khách mới khi khách không nghe máy / thuê bao / lỗi số
  const [autoNextOnNoAnswer, setAutoNextOnNoAnswer] = useState(true)
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(null)
  const autoNextTimerRef = useRef<any>(null)
  const lastAutoHandledCallRef = useRef<string | null>(null)

  const handleCancelAutoNext = () => {
    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
    setAutoNextCountdown(null)
    notify('Đã dừng tự động chuyển khách.')
  }

  // Cây lý do từ chối 3 tầng & Nỗi đau KH
  const [deniedLevel1, setDeniedLevel1] = useState<string>('')
  const [deniedLevel2, setDeniedLevel2] = useState<string>('')
  const [deniedLevel3, setDeniedLevel3] = useState<string>('')
  const [deniedCustomText, setDeniedCustomText] = useState<string>('')
  const [selectedPainPoint, setSelectedPainPoint] = useState<string>('')

  // Các trường khi chốt đơn (closed)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDoCanMang, setSelectedDoCanMang] = useState<string[]>([])
  const [selectedMachineProblem, setSelectedMachineProblem] = useState<string>('')
  const [otherMachineProblem, setOtherMachineProblem] = useState<string>('')
  const [selectedMoreRequest, setSelectedMoreRequest] = useState<string>('')
  const [otherMoreRequest, setOtherMoreRequest] = useState<string>('')
  const [serviceSearch, setServiceSearch] = useState<string>('')

  // Cờ nhận biết đang tải dữ liệu nháp của tab (tránh auto-sync ghi đè dữ liệu cũ khi vừa đổi tab)
  const isHydratingRef = useRef(false)

  // 1. Khi activeTabId hoặc customer_id thay đổi: Hydrate dữ liệu nháp của Tab đó từ Store
  useEffect(() => {
    isHydratingRef.current = true

    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current)
      autoNextTimerRef.current = null
    }
    setAutoNextCountdown(null)
    lastAutoHandledCallRef.current = null

    const draft = useTelesaleCallStore.getState().getTabDraft(activeTabId)

    setSelectedOutcome(draft.outcome)
    setCallbackDate(draft.callbackDate)
    setCallbackTime(draft.callbackTime)
    setNote(draft.note)
    setDeniedLevel1(draft.deniedLevel1)
    setDeniedLevel2(draft.deniedLevel2)
    setDeniedLevel3(draft.deniedLevel3)
    setDeniedCustomText(draft.deniedCustomText)
    setSelectedPainPoint(draft.selectedPainPoint)
    setSelectedServices(draft.selectedServices)
    setSelectedDoCanMang(draft.selectedDoCanMang)
    setSelectedMachineProblem(draft.selectedMachineProblem)
    setOtherMachineProblem(draft.otherMachineProblem)
    setSelectedMoreRequest(draft.selectedMoreRequest)
    setOtherMoreRequest(draft.otherMoreRequest)
    setServiceSearch('')

    // Đồng bộ ngày hẹn/giờ hẹn/slot/chi nhánh sang parent nếu tab có lưu sẵn
    if (draft.orderDate) {
      onOrderDateChange(draft.orderDate)
    }
    if (draft.orderTime) {
      onOrderTimeChange(draft.orderTime)
    }
    if (onOrderSlotIdChange && draft.orderSlotId !== undefined) {
      onOrderSlotIdChange(draft.orderSlotId)
    }
    if (onBranchChange && draft.branchId) {
      onBranchChange(draft.branchId)
    }

    currentOrderKeyRef.current = generateIdempotencyKey()

    const timer = setTimeout(() => {
      isHydratingRef.current = false
    }, 50)

    return () => clearTimeout(timer)
  }, [
    activeTabId,
    currentCustomer?.customer_id,
    onOrderDateChange,
    onOrderTimeChange,
    onOrderSlotIdChange,
    onBranchChange,
  ])

  // Tự động nhận diện gợi ý kết quả khi cuộc gọi của activeTab kết thúc (FreeSWITCH / SIP termination)
  const activeTabTerminationInfo = useTelesaleCallStore((s) => {
    const tab = s.tabs.find((t) => t.id === activeTabId)
    return tab?.terminationInfo
  })

  useEffect(() => {
    if (activeTabTerminationInfo?.suggestedOutcome && activeTabStatus === 'ended') {
      const outcome = activeTabTerminationInfo.suggestedOutcome
      setSelectedOutcome(outcome === 'no_answer' ? 'callback' : outcome)
      if (outcome === 'callback') {
        setCallbackDate((prev) => prev || dayjs().format('YYYY-MM-DD'))
      }
    }
  }, [activeTabTerminationInfo, activeTabStatus])

  // Tự động lưu "Không nghe máy" và chuyển khách mới khi cuộc gọi không kết nối được
  useEffect(() => {
    if (
      activeTabStatus === 'calling' ||
      activeTabStatus === 'connected' ||
      activeTabStatus === 'paused'
    ) {
      if (autoNextTimerRef.current) {
        clearInterval(autoNextTimerRef.current)
        autoNextTimerRef.current = null
      }
      setAutoNextCountdown(null)
      return
    }

    if (!autoNextOnNoAnswer || !currentCustomer || activeTabStatus !== 'ended') {
      return
    }

    if (!activeTabTerminationInfo) return

    // Nhận biết các trường hợp không kết nối được (không nghe máy, thuê bao, máy bận, từ chối, sai số)
    const isUnconnected =
      activeTabTerminationInfo.isNormalEnd === false &&
      activeTabTerminationInfo.code !== 'local_canceled' &&
      (activeTabTerminationInfo.suggestedOutcome === 'no_answer' ||
        activeTabTerminationInfo.suggestedOutcome === 'wrong_number' ||
        ['no_answer', 'unreachable', 'user_busy', 'call_rejected', 'invalid_number'].includes(
          activeTabTerminationInfo.code,
        ))

    if (!isUnconnected) return

    const callKey = `${activeTabId}_${currentCustomer.customer_id}_${activeTabTerminationInfo.code}_${activeTabTerminationInfo.sipStatusCode || 0}`
    if (lastAutoHandledCallRef.current === callKey) return
    lastAutoHandledCallRef.current = callKey

    let timeLeft = 2
    setAutoNextCountdown(timeLeft)

    if (autoNextTimerRef.current) {
      clearInterval(autoNextTimerRef.current)
    }

    autoNextTimerRef.current = setInterval(async () => {
      timeLeft -= 1
      if (timeLeft > 0) {
        setAutoNextCountdown(timeLeft)
      } else {
        clearInterval(autoNextTimerRef.current)
        autoNextTimerRef.current = null
        setAutoNextCountdown(null)

        try {
          const autoResult =
            activeTabTerminationInfo.suggestedOutcome === 'wrong_number'
              ? 'wrong_number'
              : 'no_answer'
          const label = activeTabTerminationInfo.shortLabel || 'Không nghe máy'

          await saveCallResultMutation.mutateAsync({
            customerId: currentCustomer.customer_id,
            payload: {
              result: autoResult,
              note: `Hệ thống tự động ghi nhận: ${label}`,
            },
            idempotencyKey: currentOrderKeyRef.current,
          })

          currentOrderKeyRef.current = generateIdempotencyKey()
          notify(`Cuộc gọi không nghe máy (${label}) - Đã tự động lưu & nạp khách tiếp theo.`)
          onSaveResultSuccess()
        } catch (err: any) {
          notify(err?.message || 'Lỗi khi tự động lưu kết quả cuộc gọi.')
        }
      }
    }, 1000)

    return () => {
      if (autoNextTimerRef.current) {
        clearInterval(autoNextTimerRef.current)
        autoNextTimerRef.current = null
      }
    }
  }, [
    activeTabStatus,
    activeTabTerminationInfo,
    autoNextOnNoAnswer,
    currentCustomer,
    activeTabId,
    saveCallResultMutation,
    onSaveResultSuccess,
  ])

  // 2. Tự động lưu mọi thay đổi form vào bản nháp của activeTabId trong Store
  useEffect(() => {
    if (isHydratingRef.current) return

    updateTabDraft(activeTabId, {
      outcome: selectedOutcome,
      callbackDate,
      callbackTime,
      note,
      deniedLevel1,
      deniedLevel2,
      deniedLevel3,
      deniedCustomText,
      selectedPainPoint,
      selectedServices,
      selectedDoCanMang,
      selectedMachineProblem,
      otherMachineProblem,
      selectedMoreRequest,
      otherMoreRequest,
      orderDate,
      orderTime,
      orderSlotId,
      branchId,
    })
  }, [
    activeTabId,
    selectedOutcome,
    callbackDate,
    callbackTime,
    note,
    deniedLevel1,
    deniedLevel2,
    deniedLevel3,
    deniedCustomText,
    selectedPainPoint,
    selectedServices,
    selectedDoCanMang,
    selectedMachineProblem,
    otherMachineProblem,
    selectedMoreRequest,
    otherMoreRequest,
    orderDate,
    orderTime,
    orderSlotId,
    branchId,
    updateTabDraft,
  ])

  // Xử lý cây lý do từ chối 3 tầng
  const level1Options = useMemo(() => deniedReasons || [], [deniedReasons])
  const selectedL1Node = useMemo(() => {
    return level1Options.find((node) => node.code === deniedLevel1)
  }, [level1Options, deniedLevel1])

  const level2Options = useMemo(() => {
    return selectedL1Node?.children || []
  }, [selectedL1Node])

  const selectedL2Node = useMemo(() => {
    return level2Options.find((node) => node.code === deniedLevel2)
  }, [level2Options, deniedLevel2])

  const level3Options = useMemo(() => {
    return selectedL2Node?.children || []
  }, [selectedL2Node])

  const selectedL3Node = useMemo(() => {
    return level3Options.find((node) => node.code === deniedLevel3)
  }, [level3Options, deniedLevel3])

  const needsTextInput =
    selectedL2Node?.input === 'text' ||
    selectedL3Node?.input === 'text' ||
    deniedLevel2 === 'Out vùng' ||
    deniedLevel2 === 'Khác' ||
    deniedLevel2 === 'Lí do khác'

  // Tự động khởi tạo giá trị mặc định cho tầng từ chối khi danh mục sẵn sàng
  useEffect(() => {
    if (level1Options.length > 0 && !deniedLevel1) {
      const defaultL1 = level1Options[1] || level1Options[0]
      setDeniedLevel1(defaultL1.code)
      if (defaultL1.children && defaultL1.children.length > 0) {
        setDeniedLevel2(defaultL1.children[0].code)
      }
    }
  }, [level1Options, deniedLevel1])

  const handleLevel1Change = (newCode: string) => {
    setDeniedLevel1(newCode)
    const node = level1Options.find((n) => n.code === newCode)
    const firstChild = node?.children?.[0]
    setDeniedLevel2(firstChild ? firstChild.code : '')
    setDeniedLevel3(firstChild?.children?.[0] ? firstChild.children[0].code : '')
    setDeniedCustomText('')
  }

  const handleLevel2Change = (newCode: string) => {
    setDeniedLevel2(newCode)
    const node = level2Options.find((n) => n.code === newCode)
    const firstGrandChild = node?.children?.[0]
    setDeniedLevel3(firstGrandChild ? firstGrandChild.code : '')
    setDeniedCustomText('')
  }

  const handleLevel3Change = (newCode: string) => {
    setDeniedLevel3(newCode)
    setDeniedCustomText('')
  }

  // Danh sách dịch vụ lọc theo ô tìm kiếm
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return serviceOptions
    const s = serviceSearch.toLowerCase()
    return serviceOptions.filter(
      (srv) =>
        srv.label.toLowerCase().includes(s) ||
        (srv.group && srv.group.toLowerCase().includes(s)) ||
        (srv.description && srv.description.toLowerCase().includes(s)),
    )
  }, [serviceOptions, serviceSearch])

  // Toggle đồ cần mang
  const handleToggleDoCanMang = (itemCode: string) => {
    if (selectedDoCanMang.includes(itemCode)) {
      setSelectedDoCanMang(selectedDoCanMang.filter((c) => c !== itemCode))
    } else {
      setSelectedDoCanMang([...selectedDoCanMang, itemCode])
    }
  }

  // Kiểm tra xem line của tab này có đang trong cuộc gọi hay không
  const isCallInProgress =
    activeTabStatus === 'calling' ||
    activeTabStatus === 'connected' ||
    activeTabStatus === 'paused'

  // Lưu kết quả cuộc gọi với validation chuẩn API 18
  const handleSaveResult = async () => {
    if (isSubmittingResultRef.current) return

    // Guard: Không cho phép lưu kết quả và đổi khách hàng khi cuộc gọi vẫn đang diễn ra
    if (isCallInProgress) {
      notify(
        'Cuộc gọi đang diễn ra. Vui lòng bấm Gác máy (Kết thúc cuộc gọi) trước khi lưu kết quả!',
      )
      return
    }

    if (!currentCustomer) {
      notify('Chưa có khách hàng để lưu kết quả')
      return
    }

    const payload: SaveCallResultPayload = {
      result: selectedOutcome,
      note: note.trim() || undefined,
    }

    if (selectedOutcome === 'callback' || selectedOutcome === 'potential') {
      if (!callbackDate) {
        notify(
          selectedOutcome === 'callback'
            ? 'Vui lòng chọn ngày hẹn gọi chốt cho khách hàng.'
            : 'Vui lòng chọn ngày hẹn gọi lại cho khách hàng.',
        )
        return
      }
      if (!callbackTime) {
        notify('Vui lòng chọn giờ hẹn.')
        return
      }
      if (dayjs(callbackDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
      payload.callback_at = `${callbackDate} ${callbackTime}:00`
    } else if (selectedOutcome === 'no_filter_machine') {
      payload.result = 'not_interested'
      payload.denied_note = 'Không dùng máy lọc nước'
    } else if (selectedOutcome === 'not_interested') {
      if (!deniedLevel1) {
        notify('Vui lòng chọn nhóm lý do từ chối (Cấp 1).')
        return
      }
      if (needsTextInput && !deniedCustomText.trim()) {
        notify('Vui lòng nhập chi tiết cụ thể cho lý do từ chối (Out vùng / Khác).')
        return
      }
      payload.denied_note = deniedLevel1
      if (deniedLevel2) {
        payload.sub_denied_note = deniedLevel2
      }
      if (deniedCustomText.trim()) {
        payload.sub_sub_denied_note = deniedCustomText.trim()
      } else if (deniedLevel3) {
        payload.sub_sub_denied_note = deniedLevel3
      }
      if (selectedPainPoint) {
        payload.pain_point = selectedPainPoint
      }
    } else if (selectedOutcome === 'closed') {
      if (!orderDate) {
        notify('Vui lòng chọn ngày hẹn khi chốt đơn.')
        return
      }
      if (dayjs(orderDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn đơn hàng không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
      if (!orderTime && !orderSlotId) {
        notify('Vui lòng chọn giờ hẹn hoặc ca hẹn khi chốt đơn.')
        return
      }
      if (!branchId) {
        notify('Vui lòng chọn chi nhánh thực hiện đơn hàng.')
        return
      }
      if (selectedServices.length === 0) {
        notify('Vui lòng chọn ít nhất một dịch vụ khi chốt đơn.')
        return
      }
      payload.ngay_hen_khach = orderDate
      payload.gio_hen_khach = orderTime
      payload.slot_id = orderSlotId
      payload.branch_id = branchId
      payload.services = selectedServices
      payload.do_can_mang = selectedDoCanMang
      if (selectedMachineProblem) {
        payload.machine_problem = selectedMachineProblem
        if (selectedMachineProblem === 'Khác' && otherMachineProblem.trim()) {
          payload.other_machine_problem = otherMachineProblem.trim()
        }
      }
      if (selectedMoreRequest) {
        payload.more_request = selectedMoreRequest
        if (selectedMoreRequest === 'Khác' && otherMoreRequest.trim()) {
          payload.other_more_request = otherMoreRequest.trim()
        }
      }
    }

    isSubmittingResultRef.current = true

    try {
      await saveCallResultMutation.mutateAsync({
        customerId: currentCustomer.customer_id,
        payload,
        idempotencyKey: currentOrderKeyRef.current,
      })

      // Làm mới key sau khi lưu thành công
      currentOrderKeyRef.current = generateIdempotencyKey()

      // Gọi callback để thông báo hoàn thành
      onSaveResultSuccess()
    } catch (err: any) {
      if (err?.status === 409) {
        notify('Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.')
      } else if (err?.status === 422) {
        notify(err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.')
      }
    } finally {
      isSubmittingResultRef.current = false
    }
  }

  // Xử lý cập nhật thông tin khách hàng từ Modal (sửa địa chỉ, thêm số điện thoại)
  const handleSaveCustomerInfo = (updatedCustomer: NextCustomerDto) => {
    useTelesaleCallStore.getState().updateTab(activeTabId, {
      customer: updatedCustomer,
    })
    if (onCustomerUpdate) {
      onCustomerUpdate(updatedCustomer)
    }
  }

  return (
    <aside className="right-call-column">
      {/* Khối hồ sơ thông tin khách hàng */}
      <section className="call-panel customer-panel">
        <div className="call-panel-heading">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: '8px',
            }}
          >
            <div>
              <p className="eyebrow">
                HỒ SƠ KHÁCH HÀNG {activeTabLabel ? `(${activeTabLabel})` : ''}
              </p>
              <h2>Thông tin liên hệ</h2>
            </div>
            {currentCustomer && (
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: '1.5px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
                title="Sửa thông tin khách hàng: sửa họ tên, địa chỉ, thêm số điện thoại"
              >
                <Pencil size={13} />
                <span>Sửa thông tin</span>
              </button>
            )}
          </div>
        </div>

        <div className="customer-brief">
          <div className="customer-avatar small">
            <UserRound size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{currentCustomer?.customer_name || 'Chưa chọn khách'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px' }}>
              {currentCustomer?.members && currentCustomer.members.length > 0 ? (
                currentCustomer.members.map((m, idx) => (
                  <p
                    key={m.member_id || idx}
                    style={{
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '12px',
                    }}
                  >
                    <Phone size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                    <span style={{ fontWeight: 500 }}>
                      <b>{m.name || 'Người liên hệ'}:</b> {m.phone_masked || '—'}
                    </span>
                    {m.relationship && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {m.relationship}
                      </span>
                    )}
                  </p>
                ))
              ) : (
                <p style={{ margin: 0 }}>
                  <Phone size={13} /> —
                </p>
              )}
            </div>
            <p style={{ marginTop: '5px' }}>
              <MapPin size={13} /> {currentCustomer?.landmark || currentCustomer?.masked_address || '—'}
            </p>
          </div>
        </div>

        <div className="customer-details">
          <span>
            Mã khách hàng <b>{currentCustomer?.customer_code || '—'}</b>
          </span>
          <span>
            Chiến dịch <b>{selectedCampaignName || 'Mặc định'}</b>
          </span>
          {currentCustomer?.custom_field1 && (
            <span>
              Loại máy <b>{currentCustomer.custom_field1}</b>
            </span>
          )}
          <span>
            Khóa thông tin chi tiết <b>{currentCustomer?.lock_info ? 'Đang khóa' : 'Mở'}</b>
          </span>
        </div>
      </section>

      {/* Khối form ghi nhận kết quả cuộc gọi */}
      <section className="call-panel outcome-panel">
        <div className="call-panel-heading">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <h2 style={{ margin: 0 }}>Ghi nhận kết quả</h2>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: '#64748b',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              title="Tự động lưu 'Không nghe máy' và nạp khách mới khi cuộc gọi không kết nối"
            >
              <input
                type="checkbox"
                checked={autoNextOnNoAnswer}
                onChange={(e) => setAutoNextOnNoAnswer(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Tự động chuyển khách</span>
            </label>
          </div>
        </div>

        {/* Banner đếm ngược tự động lưu và chuyển khách khi không nghe máy */}
        {autoNextCountdown !== null && (
          <div
            style={{
              margin: '0 16px 12px',
              padding: '10px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#1e40af',
              fontSize: '12px',
            }}
          >
            <span>
              ⚡ <b>Không kết nối:</b> Tự động lưu & nạp khách mới sau <b>{autoNextCountdown}s</b>...
            </span>
            <button
              type="button"
              onClick={handleCancelAutoNext}
              style={{
                padding: '4px 10px',
                background: '#fff',
                border: '1px solid #93c5fd',
                borderRadius: '5px',
                color: '#1d4ed8',
                fontWeight: 600,
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Dừng lại
            </button>
          </div>
        )}

        {/* Các nút lựa chọn kết quả */}
        <div className="result-grid">
          {resultOptions.map(({ key, label, icon: Icon, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedOutcome(key)}
              className={clsx(tone, { chosen: selectedOutcome === key })}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Nếu là hẹn gọi lại (Gọi chốt) hoặc tiềm năng */}
        {(selectedOutcome === 'callback' || selectedOutcome === 'potential') && (
          <div className="appointment-fields">
            <label>
              {selectedOutcome === 'callback' ? 'Ngày hẹn gọi chốt' : 'Ngày hẹn gọi lại'}{' '}
              <b style={{ color: '#e11d48' }}>*</b>
              <span>
                <CalendarCheck size={15} />
                <input
                  type="date"
                  value={callbackDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setCallbackDate(e.target.value)}
                />
              </span>
            </label>
            <label>
              Giờ hẹn <b style={{ color: '#e11d48' }}>*</b>
              <span>
                <Clock3 size={15} />
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                />
              </span>
            </label>
          </div>
        )}

        {/* Nếu là không dùng máy lọc nước */}
        {selectedOutcome === 'no_filter_machine' && (
          <div
            style={{
              margin: '0 16px 12px',
              padding: '10px 12px',
              background: '#f1f5f9',
              borderRadius: '7px',
              border: '1px solid #e2e8f0',
              fontSize: '11px',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Droplets size={16} />
            <span>Ghi nhận: Khách hàng không dùng máy lọc nước (Lưu trực tiếp).</span>
          </div>
        )}

        {/* Nếu là từ chối / không có nhu cầu */}
        {selectedOutcome === 'not_interested' && (
          <div style={{ padding: '0 16px 12px', display: 'grid', gap: '8px' }}>
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                1. Nhóm từ chối (Cấp 1) <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <select
                value={deniedLevel1}
                onChange={(e) => handleLevel1Change(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                {level1Options.map((n) => (
                  <option key={n.code} value={n.code}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            {level2Options.length > 0 && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  2. Lý do chi tiết (Cấp 2):
                </label>
                <select
                  value={deniedLevel2}
                  onChange={(e) => handleLevel2Change(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                >
                  {level2Options.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {level3Options.length > 0 && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  3. Phân loại sâu (Cấp 3):
                </label>
                <select
                  value={deniedLevel3}
                  onChange={(e) => handleLevel3Change(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                >
                  {level3Options.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsTextInput && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Chi tiết cụ thể (Out vùng / Khác) <b style={{ color: '#e11d48' }}>*</b>:
                </label>
                <input
                  type="text"
                  value={deniedCustomText}
                  onChange={(e) => setDeniedCustomText(e.target.value)}
                  placeholder="Ghi rõ khu vực out vùng hoặc chi tiết lý do..."
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Nỗi đau khách hàng (Pain Point):
              </label>
              <select
                value={selectedPainPoint}
                onChange={(e) => setSelectedPainPoint(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Không xác định nỗi đau --</option>
                {painPointOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Nếu là Chốt đơn (closed) */}
        {selectedOutcome === 'closed' && (
          <div style={{ padding: '0 16px 14px', display: 'grid', gap: '12px' }}>
            <div
              style={{
                background: '#f0fdf4',
                padding: '9px 12px',
                borderRadius: '7px',
                border: '1px solid #bbf7d0',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2
                  size={14}
                  style={{
                    display: 'inline',
                    verticalAlign: '-2px',
                    marginRight: '6px',
                  }}
                />
                Thiết lập đơn hàng hẹn khách
              </p>
            </div>

            {/* Chọn Chi nhánh thực hiện đơn hàng (đồng bộ với Cột 1 và Backend) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '5px',
                }}
              >
                <Building2 size={14} style={{ color: '#2563eb' }} />
                Chi nhánh thực hiện đơn hàng <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1e293b',
                  background: '#f8fafc',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🏢 {branchName || 'Chi nhánh theo chiến dịch'}</span>
              </div>
            </div>

            {/* Thông báo kết nối ca hẹn với Cột 1 */}
            {orderSlotId ? (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>🎯 Ca hẹn từ Lịch Cột 1:</span>
                  <div style={{ marginTop: '2px', color: '#1d4ed8' }}>
                    Ngày {dayjs(orderDate).format('DD/MM/YYYY')} • Ca <strong>{orderTime}</strong> (Slot #{orderSlotId})
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    background: '#dbeafe',
                    color: '#1e40af',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ĐÃ KHỚP SLOT
                </span>
              </div>
            ) : (
              <div
                style={{
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '6px',
                  padding: '7px 11px',
                  fontSize: '11px',
                  color: '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>💡</span>
                <span>
                  <strong>Mẹo:</strong> Bấm trực tiếp vào ô ca hẹn trống ở <strong>Cột (Lịch hẹn)</strong> để tự động điền ngày giờ và khóa mã slot chuẩn xác.
                </span>
              </div>
            )}

            <div className="appointment-fields" style={{ padding: 0 }}>
              <label>
                Ngày hẹn <b style={{ color: '#e11d48' }}>*</b>
                <span>
                  <CalendarCheck size={16} />
                  <input
                    type="date"
                    value={orderDate}
                    min={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => onOrderDateChange(e.target.value)}
                  />
                </span>
              </label>
              <label>
                Giờ hẹn <b style={{ color: '#e11d48' }}>*</b>
                <span>
                  <Clock3 size={16} />
                  <input
                    type="time"
                    value={orderTime}
                    onChange={(e) => onOrderTimeChange(e.target.value)}
                  />
                </span>
              </label>
            </div>

            {/* Chọn gói dịch vụ */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Gói dịch vụ ({selectedServices.length} đã chọn) <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="🔍 Tìm nhanh gói dịch vụ hoặc lõi lọc..."
                style={{
                  width: '100%',
                  height: '35px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                  marginBottom: '6px',
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gap: '5px',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {filteredServices.map((srv) => {
                  const isSelected = selectedServices.includes(srv.code)
                  return (
                    <label
                      key={srv.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#fff',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          style={{
                            width: '15px',
                            height: '15px',
                            accentColor: '#16a34a',
                            cursor: 'pointer',
                          }}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedServices([...selectedServices, srv.code])
                            } else {
                              setSelectedServices(
                                selectedServices.filter((s) => s !== srv.code),
                              )
                            }
                          }}
                        />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '12px',
                            color: isSelected ? '#166534' : '#1e293b',
                            fontWeight: isSelected ? 600 : 400,
                          }}
                          title={srv.label}
                        >
                          {srv.label}
                        </span>
                      </span>
                      {srv.price ? (
                        <b
                          style={{
                            whiteSpace: 'nowrap',
                            marginLeft: '8px',
                            fontSize: '12px',
                            color: '#0f172a',
                          }}
                        >
                          {formatVND(srv.price)}
                        </b>
                      ) : (
                        <span
                          style={{
                            color: '#16a34a',
                            whiteSpace: 'nowrap',
                            marginLeft: '8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          Miễn phí
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Đồ KTV cần mang đi (do_can_mang) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Đồ / Thiết bị KTV cần mang ({selectedDoCanMang.length}):
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '5px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {doCanMangOptions.map((item) => {
                  const isChecked = selectedDoCanMang.includes(item.code)
                  return (
                    <label
                      key={item.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        background: isChecked ? '#eff6ff' : '#fff',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        color: isChecked ? '#1d4ed8' : '#334155',
                        fontWeight: isChecked ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        style={{
                          width: '14px',
                          height: '14px',
                          accentColor: '#2563eb',
                          cursor: 'pointer',
                        }}
                        onChange={() => handleToggleDoCanMang(item.code)}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '11.5px',
                        }}
                      >
                        {item.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Tình trạng lỗi máy (machine_problem) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Tình trạng lỗi máy (nếu có):
              </label>
              <select
                value={selectedMachineProblem}
                onChange={(e) => setSelectedMachineProblem(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Máy hoạt động bình thường --</option>
                {machineProblemOptions.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
              {selectedMachineProblem === 'Khác' && (
                <input
                  type="text"
                  value={otherMachineProblem}
                  onChange={(e) => setOtherMachineProblem(e.target.value)}
                  placeholder="Nhập mô tả lỗi máy khác..."
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #dce5f0',
                    borderRadius: '5px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    marginTop: '5px',
                  }}
                />
              )}
            </div>

            {/* Yêu cầu thêm (more_request) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Yêu cầu kỹ thuật viên (more_request):
              </label>
              <select
                value={selectedMoreRequest}
                onChange={(e) => setSelectedMoreRequest(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Không có yêu cầu đặc biệt --</option>
                {moreRequestOptions.map((req) => (
                  <option key={req.code} value={req.code}>
                    {req.label}
                  </option>
                ))}
              </select>
              {selectedMoreRequest === 'Khác' && (
                <input
                  type="text"
                  value={otherMoreRequest}
                  onChange={(e) => setOtherMoreRequest(e.target.value)}
                  placeholder="Nhập yêu cầu thêm khác..."
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #dce5f0',
                    borderRadius: '5px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    marginTop: '5px',
                  }}
                />
              )}
            </div>
          </div>
        )}

        <label className="field-label">
          <FileText size={15} /> Ghi chú cuộc gọi
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              selectedOutcome === 'callback'
                ? 'Nhập ghi chú hẹn gọi chốt (nếu có)...'
                : 'Nhập ghi chú hoặc yêu cầu của khách hàng...'
            }
          />
        </label>

        <button
          onClick={handleSaveResult}
          className="save-result"
          type="button"
          disabled={saveCallResultMutation.isPending || !currentCustomer || isCallInProgress}
          title={
            isCallInProgress
              ? 'Vui lòng gác máy trước khi lưu kết quả cuộc gọi'
              : undefined
          }
          style={
            isCallInProgress
              ? {
                backgroundColor: '#94a3b8',
                cursor: 'not-allowed',
              }
              : undefined
          }
        >
          <Save size={18} />
          {saveCallResultMutation.isPending
            ? 'Đang lưu kết quả...'
            : isCallInProgress
              ? 'Đang đàm thoại (Hãy gác máy trước)'
              : 'Lưu kết quả cuộc gọi'}
        </button>
      </section>

      {/* Modal Chỉnh sửa thông tin khách hàng (sửa địa chỉ, thêm số điện thoại) */}
      <CustomerEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={currentCustomer}
        onSave={handleSaveCustomerInfo}
      />
    </aside>
  )
}
