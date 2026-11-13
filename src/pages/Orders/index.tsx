import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleX,
  ClipboardCheck,
  Clock3,
  History,
  Info,
  MapPin,
  MoreHorizontal,
  Phone,
  Save,
  Search,
  ShoppingCart,
  Truck,
  Undo2,
  UserRound,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import orderService from '../../services/order.service'
import { queryKeys } from '../../constants/queryKeys'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/TableSkeleton'
import { useDebounce } from '../../hooks/useDebounce'
import { usePagination } from '../../hooks/usePagination'
import {
  useAddOrderCommentMutation,
  useBranchSlots,
  useConfirmOrderMutation,
  useLuiHuyOrderMutation,
  useOrdersList,
  useRescheduleOrderMutation,
} from '../../hooks/useOrders'
import { useCampaigns } from '../../hooks/useTelesale'
import { useAuthStore } from '../../store/useAuthStore'
import { determinePhanQuyen } from '../../services/auth.service'
import { DialogState } from '../../types'
import { CallActionControl } from '../../components/common/CallActionControl'
import dayjs from '../../lib/dayjs'
import { BranchSlotDto, ErpSource, OrderDto } from '../../types/api'
import { useEnums } from '../../hooks/useEnums'
import {
  formatDate,
  getStatusBadgeTone,
  isConfirmedOrderStatus,
  isTerminatedOrderStatus,
  maskAddress,
} from '../../utils/formatters'
import { notify } from '../../utils/notify'

interface OrdersProps {
  onOpenDialog?: (dialog: DialogState) => void
}

// Các tùy chọn trạng thái lọc
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Đã hẹn', label: 'Đã hẹn' },
  { value: 'Đã xác nhận', label: 'Đã xác nhận' },
  { value: 'Lùi lịch', label: 'Lùi lịch' },
  { value: 'Trả về', label: 'Trả về' },
  { value: 'Đã hủy', label: 'Đã hủy' },
]

// Lý do xử lý đơn trả về / hủy / lùi theo quy chuẩn
const RETURN_REASONS = [
  'Out vùng / Quá xa chi nhánh phục vụ',
  'Sai số điện thoại / Không liên lạc được',
  'Thông tin máy thực tế không đúng với gói dịch vụ',
  'Khách yêu cầu trả về phân bổ lại',
]

const CANCEL_REASONS = [
  'Khách từ chối / Không còn nhu cầu sử dụng',
  'Khách tự thay thế hoặc người nhà đã thay',
  'Chê giá cao / Không đồng ý mức phí',
  'Khách đổi ý sang hãng khác',
]

const POSTPONE_REASONS = [
  'Khách bận đột xuất, xin hẹn lại ca sau',
  'Khách đi công tác, hẹn sang tuần tới',
  'Đang chờ linh kiện phù hợp với máy',
]

interface ReasonOption {
  value: string
  label: string
}

export const Orders: React.FC<OrdersProps> = ({ onOpenDialog: _onOpenDialog }) => {
  const { traVeNote, huyNote } = useEnums()

  const returnReasonOptions = useMemo<ReasonOption[]>(() => {
    if (traVeNote && traVeNote.length > 0) {
      return traVeNote.map((item) => ({
        value: item.code || item.label,
        label: item.label || item.code,
      }))
    }
    return RETURN_REASONS.map((r) => ({ value: r, label: r }))
  }, [traVeNote])

  const cancelReasonOptions = useMemo<ReasonOption[]>(() => {
    if (huyNote && huyNote.length > 0) {
      return huyNote.map((item) => ({
        value: item.code || item.label,
        label: item.label || item.code,
      }))
    }
    return CANCEL_REASONS.map((r) => ({ value: r, label: r }))
  }, [huyNote])

  const postponeReasonOptions = useMemo<ReasonOption[]>(() => {
    return POSTPONE_REASONS.map((r) => ({ value: r, label: r }))
  }, [])

  // Tạo danh sách tab ngày hẹn động dựa trên thời gian thực tế
  const dateTabs = useMemo(() => {
    const today = dayjs()
    return [
      { id: 'all', label: 'Tất cả' },
      { id: today.format('YYYY-MM-DD'), label: `Hôm nay · ${today.format('DD/MM')}` },
      { id: today.add(1, 'day').format('YYYY-MM-DD'), label: `Ngày mai · ${today.add(1, 'day').format('DD/MM')}` },
      { id: today.add(2, 'day').format('YYYY-MM-DD'), label: `${today.add(2, 'day').format('DD/MM')}` },
    ]
  }, [])

  // Trích xuất danh sách các chi nhánh khả dụng từ chiến dịch, fallback theo chi nhánh của nhân viên
  const { data: campaignsData } = useCampaigns()
  const user = useAuthStore((s) => s.user)
  const userBranchId = user?.branchId
  // Phân quyền: Chỉ trưởng nhóm và admin mới được thao tác điều chỉnh lịch hẹn đơn hàng, sale thì ẩn
  const pq = determinePhanQuyen(user)
  const canAdjustAppointment = pq === 'admin' || pq === 'truong_nhom'

  const availableBranches = useMemo(() => {
    const map = new Map<number, { id: number; name: string; source_erp?: ErpSource }>()
    const list = campaignsData?.items || []
    list.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        map.set(c.branch_id, { id: c.branch_id, name: c.branch_name, source_erp: c.source_erp })
      }
    })
    if (userBranchId && !map.has(userBranchId)) {
      map.set(userBranchId, { id: userBranchId, name: `Chi nhánh #${userBranchId}` })
    }
    if (map.size === 0) {
      map.set(3, { id: 3, name: 'Trụ sở Hà Nội', source_erp: 'locnuoc365' })
    }
    return Array.from(map.values())
  }, [campaignsData, userBranchId])

  // Bộ lọc tìm kiếm
  const [activeDateTab, setActiveDateTab] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [erpSourceFilter, setErpSourceFilter] = useState<'all' | 'locnuoc365' | 'zomzem'>('all')
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined)
  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const branchMenuRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')

  // Helper sinh key duy nhất cho đơn hàng tránh trùng order_id giữa 2 hệ thống ERP
  const getOrderKey = (o: OrderDto) => `${o.source_erp || 'locnuoc365'}_${o.order_id}`

  // Đóng dropdown lọc chi nhánh khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setBranchMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentBranchLabel = useMemo(() => {
    if (!selectedBranchId) return 'Tất cả chi nhánh'
    const found = availableBranches.find((b) => b.id === selectedBranchId)
    return found ? found.name : `Chi nhánh #${selectedBranchId}`
  }, [selectedBranchId, availableBranches])

  // Debounce ô tìm kiếm 400ms
  const debouncedQuery = useDebounce(query, 400)

  // Hook phân trang chuẩn hóa (tự động reset về trang 1 khi đổi bộ lọc)
  const {
    setPage,
    toPagePageSize,
    paginationProps,
  } = usePagination({
    initialPageSize: 10,
    resetDeps: [debouncedQuery, activeDateTab, statusFilter, erpSourceFilter, selectedBranchId],
  })

  // Đơn hàng đang được chọn xem chi tiết
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [selectedOrderKey, setSelectedOrderKey] = useState<string | null>(null)

  // State form điều chỉnh lịch hẹn
  const [adjDate, setAdjDate] = useState<string>(() => dayjs().format('YYYY-MM-DD'))
  const [adjTime, setAdjTime] = useState<string>('08:30')
  const [adjSlotId, setAdjSlotId] = useState<number | undefined>(undefined)
  const [note, setNote] = useState<string>('')

  // State modal trả về / lùi / hủy đơn
  const [isLuiHuyModalOpen, setIsLuiHuyModalOpen] = useState(false)
  const [luiHuyType, setLuiHuyType] = useState<'tra_ve' | 'lui' | 'huy'>('tra_ve')
  const [luiHuyReason, setLuiHuyReason] = useState(RETURN_REASONS[0])
  const [luiHuyNote, setLuiHuyNote] = useState('')
  const [luiHuyPostponeDate, setLuiHuyPostponeDate] = useState(() =>
    dayjs().add(1, 'day').format('YYYY-MM-DD'),
  )
  const [luiHuyPostponeTime, setLuiHuyPostponeTime] = useState('09:00')

  // Danh sách lý do theo loại thao tác hiện tại
  const currentReasonOptions = useMemo<ReasonOption[]>(() => {
    if (luiHuyType === 'tra_ve') return returnReasonOptions
    if (luiHuyType === 'huy') return cancelReasonOptions
    return postponeReasonOptions
  }, [luiHuyType, returnReasonOptions, cancelReasonOptions, postponeReasonOptions])

  // Tự động đồng bộ luiHuyReason khi danh mục Enums tải xong hoặc đổi loại thao tác
  useEffect(() => {
    if (isLuiHuyModalOpen && currentReasonOptions.length > 0) {
      const isValid = currentReasonOptions.some((opt) => opt.value === luiHuyReason)
      if (!isValid) {
        setLuiHuyReason(currentReasonOptions[0].value)
      }
    }
  }, [isLuiHuyModalOpen, currentReasonOptions, luiHuyReason])

  // Tham số query API đơn hàng
  const orderQueryParams = useMemo(() => {
    const params: Record<string, any> = {
      ...toPagePageSize(),
      source_erp: erpSourceFilter,
    }
    if (debouncedQuery.trim()) {
      params.search = debouncedQuery.trim()
    }
    if (activeDateTab !== 'all') {
      params.from_date = activeDateTab
      params.to_date = activeDateTab
    }
    if (statusFilter !== 'all') {
      params.status = statusFilter
    }
    if (selectedBranchId !== undefined) {
      params.branch_id = selectedBranchId
    }
    return params
  }, [toPagePageSize, erpSourceFilter, debouncedQuery, activeDateTab, statusFilter, selectedBranchId])

  // Khởi tạo Query Client phục vụ chiến lược Prefetching tức thì
  const queryClient = useQueryClient()

  // Gọi Hook lấy danh sách đơn hàng
  const {
    data: ordersResponse,
    isLoading,
    isError,
    refetch,
  } = useOrdersList(orderQueryParams)

  // Chiến lược Hover Prefetching cho phân trang: Tải trước trang tiếp theo khi di chuột
  const handlePrefetchPage = (targetPage: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.orders.list({
        ...orderQueryParams,
        start: (targetPage - 1) * 10,
      }),
      queryFn: () =>
        orderService.getOrders({
          ...orderQueryParams,
          page: targetPage,
          page_size: 10,
        }),
      staleTime: 1000 * 60 * 2,
    })
  }

  // Toàn bộ danh sách đơn hàng trang hiện tại (kèm client-side fallback nếu Backend chưa lọc branch_id)
  const ordersList: OrderDto[] = useMemo(() => {
    const rawList = ordersResponse?.items || []
    if (selectedBranchId !== undefined) {
      return rawList.filter((item) => {
        if (item.branch_id !== undefined) {
          return item.branch_id === selectedBranchId
        }
        const branchObj = availableBranches.find((b) => b.id === selectedBranchId)
        return branchObj && item.chi_nhanh === branchObj.name
      })
    }
    return rawList
  }, [ordersResponse, selectedBranchId, availableBranches])

  // Đơn hàng đang hiển thị ở cột chi tiết (tìm theo compound key hoặc order_id)
  const activeOrder: OrderDto | null = useMemo(() => {
    if (ordersList.length === 0) return null
    if (selectedOrderKey) {
      const match = ordersList.find((o) => getOrderKey(o) === selectedOrderKey)
      if (match) return match
    }
    if (selectedOrderId) {
      const match = ordersList.find((o) => o.order_id === selectedOrderId)
      if (match) return match
    }
    return ordersList[0]
  }, [ordersList, selectedOrderKey, selectedOrderId])

  // Khi chọn một đơn hàng khác, cập nhật giá trị vào form điều chỉnh
  useEffect(() => {
    if (activeOrder) {
      setAdjDate(activeOrder.ngay_hen_khach || '2026-10-05')
      setAdjTime(activeOrder.gio_hen_khach || '08:30')
      setNote(activeOrder.description || '')
      setAdjSlotId(undefined)
    }
  }, [activeOrder])

  // Danh sách slot hẹn của chi nhánh theo ngày điều chỉnh và nguồn ERP của đơn hàng
  const targetBranchId = selectedBranchId || activeOrder?.branch_id || availableBranches[0]?.id || 3
  const targetBranch = availableBranches.find((b) => b.id === targetBranchId)
  const targetBranchSource = targetBranch?.source_erp || activeOrder?.source_erp || 'locnuoc365'
  const { data: rawBranchSlots = [] } = useBranchSlots(
    targetBranchId,
    adjDate,
    adjDate,
    { source_erp: targetBranchSource },
  )

  const branchSlots: BranchSlotDto[] = useMemo(() => {
    if (Array.isArray(rawBranchSlots)) return rawBranchSlots
    if (Array.isArray((rawBranchSlots as any)?.items)) return (rawBranchSlots as any).items
    return []
  }, [rawBranchSlots])

  // Các mutations nghiệp vụ đơn hàng
  const confirmOrderMutation = useConfirmOrderMutation()
  const rescheduleMutation = useRescheduleOrderMutation()
  const luiHuyMutation = useLuiHuyOrderMutation()
  const addCommentMutation = useAddOrderCommentMutation()

  // Thống kê nhanh tổng quan các đơn
  const statsOverview = useMemo(() => {
    const total = ordersResponse?.total || ordersList.length
    const confirmedCount = ordersList.filter((o) => isConfirmedOrderStatus(o)).length
    const pendingCount = ordersList.filter(
      (o) => !isConfirmedOrderStatus(o) && !isTerminatedOrderStatus(o.status, o.trang_thai),
    ).length
    // Đơn hàng đã đi: Các đơn đã được xác nhận điều phối / KTV tiếp nhận di chuyển theo quy chuẩn ERP
    const daDiCount = ordersList.filter((o) => {
      if (isTerminatedOrderStatus(o.status, o.trang_thai)) return false
      const s = (o.status || '').toLowerCase()
      const t = (o.trang_thai || '').toLowerCase()
      return (
        s === 'da_di' ||
        s === 'thanh_cong' ||
        s === 'hoan_thanh' ||
        t.includes('đã đi') ||
        t.includes('hoàn thành') ||
        t.includes('thành công') ||
        isConfirmedOrderStatus(o)
      )
    }).length

    // Đơn trả về
    const returnedCount = ordersList.filter((o) => {
      const s = (o.status || '').toLowerCase()
      const t = (o.trang_thai || '').toLowerCase()
      return s === 'tra_ve' || t.includes('trả về')
    }).length

    // Đơn lùi / hủy
    const postponedOrCanceledCount = ordersList.filter((o) => {
      const s = (o.status || '').toLowerCase()
      const t = (o.trang_thai || '').toLowerCase()
      return (
        s === 'lui' ||
        s === 'huy' ||
        s === 'sai_may' ||
        t.includes('lùi') ||
        t.includes('hủy') ||
        t.includes('sai máy')
      )
    }).length

    return {
      total,
      confirmedCount,
      pendingCount,
      daDiCount,
      returnedCount,
      postponedOrCanceledCount,
    }
  }, [ordersResponse, ordersList])

  // Xử lý lưu điều chỉnh lịch hẹn & ghi chú
  const handleSaveAdjustment = () => {
    if (!activeOrder) return
    if (!canAdjustAppointment) {
      notify('Chỉ Trưởng nhóm và Admin mới có quyền điều chỉnh lịch hẹn')
      return
    }

    const dateChanged =
      adjDate !== activeOrder.ngay_hen_khach || adjTime !== activeOrder.gio_hen_khach
    const noteChanged = note.trim() !== (activeOrder.description || '').trim()

    if (!dateChanged && !noteChanged) {
      notify('Không có thay đổi nào cần lưu')
      return
    }

    if (dateChanged) {
      rescheduleMutation.mutate({
        orderId: activeOrder.order_id,
        payload: {
          ngay_hen_khach: adjDate,
          gio_hen_khach: adjTime,
          slot_id: adjSlotId,
          branch_id: activeOrder.branch_id || 3,
        },
        source_erp: activeOrder.source_erp,
      })
    }

    if (noteChanged && note.trim()) {
      addCommentMutation.mutate({
        orderId: activeOrder.order_id,
        payload: {
          content: note.trim(),
        },
        source_erp: activeOrder.source_erp,
      })
    }
  }

  // Mở modal trả về / lùi / hủy
  const handleOpenLuiHuyModal = () => {
    if (!activeOrder || !canAdjustAppointment) return
    setLuiHuyType('tra_ve')
    setLuiHuyReason(returnReasonOptions[0]?.value || RETURN_REASONS[0])
    setLuiHuyNote('')
    setLuiHuyPostponeDate(dayjs().add(1, 'day').format('YYYY-MM-DD'))
    setLuiHuyPostponeTime('09:00')
    setIsLuiHuyModalOpen(true)
  }

  // Gửi xác nhận trả về / lùi / hủy
  const handleSubmitLuiHuy = () => {
    if (!activeOrder) return

    const payload: any = {
      type: luiHuyType,
      comment: luiHuyNote.trim() || undefined,
    }

    if (luiHuyType === 'tra_ve') {
      payload.tra_ve_note = luiHuyReason
    } else if (luiHuyType === 'huy') {
      payload.huy_note = luiHuyReason
    } else if (luiHuyType === 'lui') {
      if (!luiHuyPostponeDate || !luiHuyPostponeTime) {
        notify('Vui lòng chọn ngày và giờ hẹn lùi')
        return
      }
      payload.gio_hen_lui = `${luiHuyPostponeDate} ${luiHuyPostponeTime}`
      payload.comment = `${luiHuyReason}: ${luiHuyNote}`.trim()
    }

    luiHuyMutation.mutate(
      {
        orderId: activeOrder.order_id,
        payload,
        source_erp: activeOrder.source_erp,
      },
      {
        onSuccess: () => {
          setIsLuiHuyModalOpen(false)
        },
      },
    )
  }

  return (
    <div className="content orders-content">
      {/* 4 Thẻ thống kê đầu trang */}
      <section className="call-stat-grid">
        <article className="call-stat blue">
          <div className="card-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p>Tổng đơn đã hẹn</p>
            <strong>{statsOverview.total} đơn</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <p>Đã xác nhận với khách</p>
            <strong>{statsOverview.confirmedCount} đơn</strong>
          </div>
          <ClipboardCheck size={19} />
        </article>

        <article className="call-stat amber">
          <div className="card-icon">
            <CalendarCheck size={21} />
          </div>
          <div>
            <p>Chờ gọi xác nhận</p>
            <strong>{statsOverview.pendingCount} đơn</strong>
          </div>
          <Clock3 size={19} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <Truck size={21} />
          </div>
          <div>
            <p>Đơn hàng đã đi</p>
            <strong>{statsOverview.daDiCount} đơn</strong>
          </div>
          <BadgeCheck size={19} />
        </article>

        <article className="call-stat rose">
          <div className="card-icon">
            <Undo2 size={21} />
          </div>
          <div>
            <p>Đơn trả về</p>
            <strong>{statsOverview.returnedCount} đơn</strong>
          </div>
          <CircleX size={19} />
        </article>

        <article className="call-stat purple">
          <div className="card-icon">
            <History size={21} />
          </div>
          <div>
            <p>Đơn lùi / hủy</p>
            <strong>{statsOverview.postponedOrCanceledCount} đơn</strong>
          </div>
          <Clock3 size={19} />
        </article>
      </section>

      {/* Layout 2 cột: Danh sách đơn (trái) và Chi tiết / Điều chỉnh (phải) */}
      <div className="orders-grid">
        <div className="order-list-column">
          <section className="call-panel order-list-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">LỊCH HẸN</p>
                <h2>Danh sách đơn hàng</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => refetch()}
                title="Tải lại danh sách"
              >
                <MoreHorizontal size={19} />
              </button>
            </div>

            {/* Bộ lọc tìm kiếm, chi nhánh và trạng thái */}
            <div className="order-filters">
              <label>
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Tìm mã đơn, tên khách hoặc SĐT..."
                />
              </label>

              {/* Dropdown Lọc Theo Chi Nhánh (Phương án 1) */}
              <div style={{ position: 'relative' }} ref={branchMenuRef}>
                <button
                  type="button"
                  onClick={() => setBranchMenuOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    minWidth: '155px',
                    height: '38px',
                    padding: '0 12px',
                    whiteSpace: 'nowrap',
                    backgroundColor: selectedBranchId ? '#eff6ff' : '#ffffff',
                    borderColor: selectedBranchId ? '#3b82f6' : '#dfe8f2',
                    color: selectedBranchId ? '#1d4ed8' : '#475569',
                    fontWeight: selectedBranchId ? 600 : 500,
                    fontSize: '11.5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    cursor: 'pointer',
                    borderRadius: '7px',
                    border: '1px solid',
                  }}
                  title={currentBranchLabel}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    <Building2 size={15} style={{ color: selectedBranchId ? '#2563eb' : '#2c78d9', flexShrink: 0 }} />
                    <span>{currentBranchLabel}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    style={{
                      transform: branchMenuOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      color: '#64748b',
                    }}
                  />
                </button>

                {branchMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      minWidth: '100%',
                      width: 'max-content',
                      maxWidth: '280px',
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                      padding: '4px',
                      zIndex: 60,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      maxHeight: '250px',
                      overflowY: 'auto',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBranchId(undefined)
                        setBranchMenuOpen(false)
                        setPage(1)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: !selectedBranchId ? '#eff6ff' : 'transparent',
                        color: !selectedBranchId ? '#1d4ed8' : '#334155',
                        fontWeight: !selectedBranchId ? 600 : 400,
                        fontSize: '11px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <Building2 size={14} style={{ color: !selectedBranchId ? '#2563eb' : '#64748b' }} />
                      <span>Tất cả chi nhánh</span>
                    </button>
                    {availableBranches.map((b) => {
                      const isSelected = selectedBranchId === b.id
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBranchId(b.id)
                            setBranchMenuOpen(false)
                            setPage(1)
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            fontWeight: isSelected ? 600 : 400,
                            fontSize: '11px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <MapPin size={14} style={{ color: isSelected ? '#2563eb' : '#64748b' }} />
                          <span>{b.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    border: '1px solid #dfe8f2',
                    borderRadius: '7px',
                    padding: '0 12px',
                    background: '#fff',
                    color: '#58708f',
                    fontSize: '11px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bộ lọc Nguồn dữ liệu ERP: Tất cả | Lọc Nước 365 | Zomzem */}
              <div style={{ position: 'relative' }}>
                <select
                  value={erpSourceFilter}
                  onChange={(e) => {
                    setErpSourceFilter(e.target.value as any)
                    setPage(1)
                  }}
                  style={{
                    width: '100%',
                    height: '38px',
                    border: '1px solid #dfe8f2',
                    borderRadius: '7px',
                    padding: '0 12px',
                    background: '#fff',
                    color: '#58708f',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="all">Tất cả nguồn</option>
                  <option value="locnuoc365">Lọc Nước 365</option>
                  <option value="zomzem">Zomzem</option>
                </select>
              </div>
            </div>

            {/* Các tab chọn ngày hẹn */}
            <div className="lead-tabs order-tabs">
              {dateTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={clsx({ active: activeDateTab === t.id })}
                  onClick={() => {
                    setActiveDateTab(t.id)
                    setPage(1)
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Bảng hiển thị danh sách đơn hàng */}
            <div className="lead-table-wrap">
              {isError ? (
                <ErrorState
                  message="Không thể tải dữ liệu đơn hàng từ máy chủ"
                  onRetry={() => refetch()}
                />
              ) : (
                <table className="lead-table order-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Dịch vụ</th>
                      <th>Chi nhánh</th>
                      <th>Lịch hẹn</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <TableSkeleton rows={10} cols={6} />
                    ) : ordersList.length > 0 ? (
                      ordersList.map((order) => {
                        const tone = getStatusBadgeTone(order.trang_thai)
                        const orderKey = getOrderKey(order)
                        const isSelected = activeOrder ? getOrderKey(activeOrder) === orderKey : false
                        return (
                          <tr
                            key={orderKey}
                            onClick={() => {
                              setSelectedOrderId(order.order_id)
                              setSelectedOrderKey(orderKey)
                            }}
                            className={clsx({ 'selected-row': isSelected })}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <b className="order-code">{order.ord_code}</b>
                            </td>
                            <td>
                              <div className="lead-name">
                                <div className="tiny-avatar">
                                  <UserRound size={17} />
                                </div>
                                <span>
                                  <b>{order.ten_khach_hang}</b>
                                  <small>{order.sdt_masked}</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span title={order.goi_dich_vu}>
                                {order.goi_dich_vu}
                              </span>
                            </td>
                            <td>
                              <span
                                title={order.chi_nhanh || 'Trụ sở Hà Nội'}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  color: '#3b587d',
                                  fontSize: '10.5px',
                                  fontWeight: 500,
                                }}
                              >
                                <Building2 size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                                <span>{order.chi_nhanh || 'Trụ sở Hà Nội'}</span>
                              </span>
                            </td>
                            <td>
                              <b>{formatDate(order.ngay_hen_khach, 'DD/MM')}</b> · {order.gio_hen_khach}
                            </td>
                            <td>
                              <span className={clsx('lead-status', tone)}>
                                {isConfirmedOrderStatus(order) ? (
                                  <CheckCircle2 size={13} style={{ color: '#16956c' }} />
                                ) : tone === 'green' ? (
                                  <CalendarCheck size={13} />
                                ) : (
                                  <History size={13} />
                                )}
                                {' '}
                                {order.trang_thai}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <EmptyState
                        colSpan={6}
                        title="Không tìm thấy đơn hàng"
                        description="Không có đơn hàng nào khớp với điều kiện tìm kiếm hoặc ngày hẹn đang chọn."
                        actionText="Xem tất cả đơn hàng"
                        onAction={() => {
                          setQuery('')
                          setActiveDateTab('all')
                          setStatusFilter('all')
                          setSelectedBranchId(undefined)
                          setPage(1)
                        }}
                      />
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Phân trang danh sách tích hợp Hover Prefetching */}
            <Pagination
              {...paginationProps}
              total={ordersResponse?.total || 0}
              itemLabel="đơn hàng"
              onPrefetchPage={handlePrefetchPage}
            />
          </section>

          {/* Ghi chú nhắc nhở nghiệp vụ */}
          <div className="order-note">
            <Info size={20} />
            <div>
              <strong>Lưu ý xác nhận lịch hẹn</strong>
              <p>
                Đơn hàng cần được gọi xác nhận trước khi chuyển kỹ thuật viên di chuyển. Khi dời lịch hẹn sang ngày sau, hệ thống sẽ tự động tính là lùi đơn theo quy chuẩn ERP.
              </p>
            </div>
          </div>
        </div>

        {/* Cột Chi tiết đơn hàng và Điều chỉnh */}
        <aside className="order-detail-column">
          {activeOrder ? (
            <>
              {/* Panel Chi tiết đơn hàng */}
              <section className="call-panel lead-detail">
                <div className="call-panel-heading">
                  <div>
                    <p className="eyebrow">ĐƠN HÀNG</p>
                    <h2>Chi tiết đơn hàng</h2>
                  </div>
                  <span className="order-live">
                    <i /> {activeOrder.trang_thai}
                  </span>
                </div>

                <div className="order-id">{activeOrder.ord_code}</div>

                <div className="customer-brief lead-brief">
                  <div className="customer-avatar small">
                    <UserRound size={26} />
                  </div>
                  <div>
                    <h3>{activeOrder.ten_khach_hang}</h3>
                    <p>
                      <Phone size={13} /> {activeOrder.sdt_masked}
                    </p>
                    <p>
                      <MapPin size={13} /> {maskAddress(activeOrder.dia_chi)}
                    </p>
                  </div>
                </div>

                <div className="customer-details">
                  <span>
                    Gói dịch vụ <b>{activeOrder.goi_dich_vu}</b>
                  </span>
                  {activeOrder.loai_may && (
                    <span>
                      Dòng máy <b>{activeOrder.loai_may}</b>
                    </span>
                  )}
                  <span>
                    Ngày hẹn <b>{formatDate(activeOrder.ngay_hen_khach)}</b>
                  </span>
                  <span>
                    Giờ hẹn <b>{activeOrder.gio_hen_khach}</b>
                  </span>
                  <span>
                    Chi nhánh phục vụ <b>{activeOrder.chi_nhanh || 'Trụ sở Hà Nội'}</b>
                  </span>
                  {activeOrder.machine_problem && (
                    <span>
                      Vấn đề của máy <b>{activeOrder.machine_problem}</b>
                    </span>
                  )}
                  <span>
                    Xác nhận với khách{' '}
                    {isTerminatedOrderStatus(activeOrder.status, activeOrder.trang_thai) ? (
                      <b className="rose-text">
                        <CircleX size={13} /> {activeOrder.trang_thai || 'Đã hủy'}
                      </b>
                    ) : isConfirmedOrderStatus(activeOrder) ? (
                      <b className="green-text">
                        <CheckCircle2 size={13} />{' '}
                        {activeOrder.trang_thai?.toLowerCase().includes('chờ tag')
                          ? 'Đã xác nhận (Chờ tag KTV)'
                          : 'Đã xác nhận'}
                      </b>
                    ) : (
                      <b className="amber-text">
                        <Clock3 size={13} /> Chờ gọi xác nhận
                      </b>
                    )}
                  </span>
                </div>

                {/* Nút Xác nhận lịch hẹn (Phương án 1: Ẩn đi khi đơn đã ở trạng thái Đã xác nhận hoặc Đã kết thúc) */}
                {!isConfirmedOrderStatus(activeOrder) &&
                  !isTerminatedOrderStatus(activeOrder.status, activeOrder.trang_thai) && (
                    <button
                      type="button"
                      className="confirm-appointment-button"
                      onClick={() =>
                        confirmOrderMutation.mutate({
                          orderId: activeOrder.order_id,
                          source_erp: activeOrder.source_erp,
                        })
                      }
                      disabled={confirmOrderMutation.isPending}
                    >
                      <CheckCircle2 size={16} />
                      <span>{confirmOrderMutation.isPending ? 'Đang gửi xác nhận...' : 'Xác nhận lịch hẹn'}</span>
                    </button>
                  )}

                <CallActionControl
                  customerId={activeOrder.customer_id}
                  customerName={activeOrder.ten_khach_hang}
                  customerData={{
                    ...activeOrder,
                    source_erp: activeOrder.source_erp,
                  }}
                  style={
                    !isConfirmedOrderStatus(activeOrder) &&
                    !isTerminatedOrderStatus(activeOrder.status, activeOrder.trang_thai)
                      ? { marginTop: '9px' }
                      : undefined
                  }
                  buttonText={
                    isTerminatedOrderStatus(activeOrder.status, activeOrder.trang_thai)
                      ? 'Gọi cho khách'
                      : isConfirmedOrderStatus(activeOrder)
                        ? 'Gọi lại cho khách'
                        : 'Gọi xác nhận'
                  }
                  onCallStarted={() => {
                    if (
                      !isConfirmedOrderStatus(activeOrder) &&
                      !isTerminatedOrderStatus(activeOrder.status, activeOrder.trang_thai)
                    ) {
                      confirmOrderMutation.mutate({
                        orderId: activeOrder.order_id,
                        source_erp: activeOrder.source_erp,
                      })
                    }
                  }}
                  disabled={confirmOrderMutation.isPending}
                />
              </section>

              {/* Panel Điều chỉnh lịch hẹn - Chỉ hiển thị và thao tác với Trưởng nhóm và Admin */}
              {canAdjustAppointment && (
                <section className="call-panel care-form">
                <div className="call-panel-heading">
                  <div>
                    <p className="eyebrow">ĐIỀU CHỈNH</p>
                    <h2>Điều chỉnh lịch hẹn</h2>
                  </div>
                </div>

                <div className="appointment-fields">
                  <label>
                    Ngày hẹn
                    <span>
                      <CalendarDays size={15} />
                      <input
                        type="date"
                        value={adjDate}
                        onChange={(e) => setAdjDate(e.target.value)}
                        style={{ border: 0, outline: 0, width: '100%', background: 'transparent' }}
                      />
                    </span>
                  </label>

                  <label>
                    Ca hẹn / Giờ hẹn
                    <span>
                      <Clock3 size={15} />
                      {branchSlots.length > 0 ? (
                        <select
                          value={adjSlotId || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined
                            setAdjSlotId(val)
                            const slot = branchSlots.find((s) => s.slot_id === val)
                            if (slot) setAdjTime(slot.slot_time)
                          }}
                          style={{
                            border: 0,
                            outline: 0,
                            width: '100%',
                            background: 'transparent',
                            fontSize: '11px',
                            color: '#4e6586',
                          }}
                        >
                          <option value="">{adjTime} (Giờ hiện tại)</option>
                          {branchSlots.map((slot) => {
                            const isFull = slot.con_trong <= 0 || slot.is_expired
                            return (
                              <option
                                key={slot.slot_id}
                                value={slot.slot_id}
                                disabled={isFull}
                              >
                                {slot.slot_time} - {slot.to_time}{' '}
                                {isFull ? '(Hết chỗ)' : `(Còn ${slot.con_trong} chỗ)`}
                              </option>
                            )
                          })}
                        </select>
                      ) : (
                        <input
                          type="time"
                          value={adjTime}
                          onChange={(e) => setAdjTime(e.target.value)}
                          style={{ border: 0, outline: 0, width: '100%', background: 'transparent' }}
                        />
                      )}
                    </span>
                  </label>
                </div>

                <label className="field-label">
                  Ghi chú điều chỉnh
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập ghi chú hoặc yêu cầu của khách hàng..."
                  />
                </label>

                <button
                  onClick={handleSaveAdjustment}
                  className="save-result"
                  type="button"
                  disabled={rescheduleMutation.isPending || addCommentMutation.isPending}
                >
                  <Save size={18} />
                  {rescheduleMutation.isPending || addCommentMutation.isPending
                    ? 'Đang lưu...'
                    : 'Lưu cập nhật'}
                </button>

                <button
                  onClick={handleOpenLuiHuyModal}
                  className="return-order"
                  type="button"
                >
                  <Undo2 size={18} /> Đơn trả về / Hủy / Lùi
                </button>
              </section>
              )}
            </>
          ) : (
            <section className="call-panel" style={{ padding: '30px 20px', textAlign: 'center' }}>
              <Info size={36} style={{ color: '#829bb8', margin: '0 auto 12px' }} />
              <p style={{ color: '#6d819c', fontSize: '12px' }}>
                Chọn một đơn hàng từ danh sách bên trái để xem chi tiết và thực hiện thao tác điều chỉnh.
              </p>
            </section>
          )}
        </aside>
      </div>

      {/* Modal Trả về / Lùi / Hủy đơn hàng - Chỉ Trưởng nhóm và Admin */}
      {canAdjustAppointment && isLuiHuyModalOpen && activeOrder && (
        <div className="mock-dialog-backdrop" onClick={() => setIsLuiHuyModalOpen(false)}>
          <div
            className="mock-dialog"
            style={{ width: '480px', maxWidth: '95vw', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="dialog-close"
              type="button"
              onClick={() => setIsLuiHuyModalOpen(false)}
            >
              <X size={19} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#fff0f1',
                  color: '#e74c3c',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>
                  XỬ LÝ ĐƠN HÀNG
                </p>
                <h3 style={{ margin: 0, color: '#1f3864', fontSize: '17px' }}>
                  Xử lý đơn {activeOrder.ord_code}
                </h3>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#6e829f', margin: '0 0 16px' }}>
              Khách hàng: <b>{activeOrder.ten_khach_hang}</b> ({activeOrder.sdt_masked})
            </p>

            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Chọn loại thao tác */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a5d78', marginBottom: '6px' }}>
                  Loại thao tác:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setLuiHuyType('tra_ve')
                      setLuiHuyReason(returnReasonOptions[0]?.value || RETURN_REASONS[0])
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      border: '1px solid #dce5f0',
                      background: luiHuyType === 'tra_ve' ? '#2575df' : '#f8fafd',
                      color: luiHuyType === 'tra_ve' ? '#fff' : '#556985',
                      fontWeight: luiHuyType === 'tra_ve' ? 700 : 500,
                    }}
                  >
                    Trả về
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLuiHuyType('lui')
                      setLuiHuyReason(postponeReasonOptions[0]?.value || POSTPONE_REASONS[0])
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      border: '1px solid #dce5f0',
                      background: luiHuyType === 'lui' ? '#2575df' : '#f8fafd',
                      color: luiHuyType === 'lui' ? '#fff' : '#556985',
                      fontWeight: luiHuyType === 'lui' ? 700 : 500,
                    }}
                  >
                    Lùi lịch hẹn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLuiHuyType('huy')
                      setLuiHuyReason(cancelReasonOptions[0]?.value || CANCEL_REASONS[0])
                    }}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      border: '1px solid #dce5f0',
                      background: luiHuyType === 'huy' ? '#2575df' : '#f8fafd',
                      color: luiHuyType === 'huy' ? '#fff' : '#556985',
                      fontWeight: luiHuyType === 'huy' ? 700 : 500,
                    }}
                  >
                    Hủy đơn
                  </button>
                </div>
              </div>

              {/* Chọn lý do tương ứng */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a5d78', marginBottom: '6px' }}>
                  Lý do:
                </label>
                <select
                  value={luiHuyReason}
                  onChange={(e) => setLuiHuyReason(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '7px',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: '#3f5473',
                    background: '#fff',
                  }}
                >
                  {currentReasonOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nếu là lùi đơn: Nhập ngày giờ hẹn lùi */}
              {luiHuyType === 'lui' && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a5d78', marginBottom: '6px' }}>
                    Thời gian hẹn lùi:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#6882a6', marginBottom: '3px' }}>
                        Ngày lùi
                      </span>
                      <input
                        type="date"
                        value={luiHuyPostponeDate}
                        onChange={(e) => setLuiHuyPostponeDate(e.target.value)}
                        min={dayjs().format('YYYY-MM-DD')}
                        style={{
                          width: '100%',
                          height: '36px',
                          border: '1px solid #dce5f0',
                          borderRadius: '7px',
                          padding: '0 10px',
                          fontSize: '11px',
                          color: '#3f5473',
                          background: '#fff',
                        }}
                      />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '10px', color: '#6882a6', marginBottom: '3px' }}>
                        Giờ lùi
                      </span>
                      <input
                        type="time"
                        value={luiHuyPostponeTime}
                        onChange={(e) => setLuiHuyPostponeTime(e.target.value)}
                        style={{
                          width: '100%',
                          height: '36px',
                          border: '1px solid #dce5f0',
                          borderRadius: '7px',
                          padding: '0 10px',
                          fontSize: '11px',
                          color: '#3f5473',
                          background: '#fff',
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Ghi chú thêm */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a5d78', marginBottom: '6px' }}>
                  Ghi chú chi tiết:
                </label>
                <textarea
                  value={luiHuyNote}
                  onChange={(e) => setLuiHuyNote(e.target.value)}
                  placeholder="Ghi chú thêm thông tin đối soát..."
                  style={{
                    width: '100%',
                    height: '60px',
                    border: '1px solid #dce5f0',
                    borderRadius: '7px',
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: '#3f5473',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setIsLuiHuyModalOpen(false)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '7px',
                  background: '#f1f4f8',
                  color: '#607490',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitLuiHuy}
                disabled={luiHuyMutation.isPending}
                style={{
                  padding: '9px 18px',
                  borderRadius: '7px',
                  background: luiHuyType === 'huy' ? '#e74c3c' : '#2575df',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {luiHuyMutation.isPending ? 'Đang gửi...' : 'Xác nhận xử lý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
