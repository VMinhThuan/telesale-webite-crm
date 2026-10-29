import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  DollarSign,
  ExternalLink,
  History,
  Info,
  MapPin,
  MoreHorizontal,
  Phone,
  Save,
  Search,
  ShoppingCart,
  Undo2,
  UserCheck,
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
import { DialogState } from '../../types'
import dayjs from '../../lib/dayjs'
import { BranchSlotDto, OrderDto } from '../../types/api'
import { useEnums } from '../../hooks/useEnums'
import { formatDate, formatVND, getStatusBadgeTone } from '../../utils/formatters'
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

export const Orders: React.FC<OrdersProps> = ({ onOpenDialog }) => {
  const navigate = useNavigate()
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

  // Bộ lọc tìm kiếm
  const [activeDateTab, setActiveDateTab] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [query, setQuery] = useState('')

  // Debounce ô tìm kiếm 400ms
  const debouncedQuery = useDebounce(query, 400)

  // Hook phân trang chuẩn hóa (tự động reset về trang 1 khi đổi bộ lọc)
  const {
    setPage,
    toPagePageSize,
    paginationProps,
  } = usePagination({
    initialPageSize: 6,
    resetDeps: [debouncedQuery, activeDateTab, statusFilter],
  })

  // Đơn hàng đang được chọn xem chi tiết
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

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
    return params
  }, [toPagePageSize, debouncedQuery, activeDateTab, statusFilter])

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
        start: (targetPage - 1) * 5,
      }),
      queryFn: () =>
        orderService.getOrders({
          ...orderQueryParams,
          page: targetPage,
          page_size: 5,
        }),
      staleTime: 1000 * 60 * 2,
    })
  }

  // Toàn bộ danh sách đơn hàng trang hiện tại
  const ordersList: OrderDto[] = useMemo(() => {
    return ordersResponse?.items || []
  }, [ordersResponse])

  // Đơn hàng đang hiển thị ở cột chi tiết
  const activeOrder: OrderDto | null = useMemo(() => {
    if (ordersList.length === 0) return null
    if (selectedOrderId) {
      const match = ordersList.find((o) => o.order_id === selectedOrderId)
      if (match) return match
    }
    return ordersList[0]
  }, [ordersList, selectedOrderId])

  // Khi chọn một đơn hàng khác, cập nhật giá trị vào form điều chỉnh
  useEffect(() => {
    if (activeOrder) {
      setAdjDate(activeOrder.ngay_hen_khach || '2026-10-05')
      setAdjTime(activeOrder.gio_hen_khach || '08:30')
      setNote(activeOrder.description || '')
      setAdjSlotId(undefined)
    }
  }, [activeOrder])

  // Danh sách slot hẹn của chi nhánh theo ngày điều chỉnh
  const { data: rawBranchSlots = [] } = useBranchSlots(
    activeOrder?.branch_id || 3,
    adjDate,
    adjDate,
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
    const confirmedCount = ordersList.filter((o) => o.sale_checked || o.trang_thai === 'Đã xác nhận').length
    const pendingCount = ordersList.filter((o) => !o.sale_checked && o.trang_thai !== 'Đã xác nhận').length
    const estimatedRevenue = ordersList.reduce((acc, cur) => {
      // Loại trừ đơn bị hủy hoặc trả về khỏi doanh số thực tế
      if (['huy', 'tra_ve', 'sai_may'].includes(cur.status)) return acc
      return acc + (cur.doanh_so || 0)
    }, 0)

    return {
      total,
      confirmedCount,
      pendingCount,
      estimatedRevenue,
    }
  }, [ordersResponse, ordersList])

  // Xử lý gọi điện thoại xác nhận lịch hẹn
  const handleConfirmCall = () => {
    if (!activeOrder) return

    // Kích hoạt mutation cập nhật trạng thái sale_checked
    confirmOrderMutation.mutate(activeOrder.order_id)

    if (onOpenDialog) {
      onOpenDialog({
        title: `Xác nhận lịch hẹn đơn ${activeOrder.ord_code} - ${activeOrder.ten_khach_hang}`,
        type: 'call',
      })
    }
  }

  // Xử lý lưu điều chỉnh lịch hẹn & ghi chú
  const handleSaveAdjustment = () => {
    if (!activeOrder) return

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
      })
    }

    if (noteChanged && note.trim()) {
      addCommentMutation.mutate({
        orderId: activeOrder.order_id,
        payload: {
          content: note.trim(),
        },
      })
    }
  }

  // Mở modal trả về / lùi / hủy
  const handleOpenLuiHuyModal = () => {
    if (!activeOrder) return
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

        <article className="call-stat blue">
          <div className="card-icon">
            <DollarSign size={21} />
          </div>
          <div>
            <p>Doanh số dự kiến</p>
            <strong>{formatVND(statsOverview.estimatedRevenue)}</strong>
          </div>
          <BarChart3 size={19} />
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

            {/* Bộ lọc tìm kiếm và trạng thái */}
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
                      <th>Lịch hẹn</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <TableSkeleton rows={6} cols={5} />
                    ) : ordersList.length > 0 ? (
                      ordersList.map((order) => {
                        const tone = getStatusBadgeTone(order.trang_thai)
                        const isSelected = activeOrder?.order_id === order.order_id
                        return (
                          <tr
                            key={order.order_id}
                            onClick={() => setSelectedOrderId(order.order_id)}
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
                              <b>{formatDate(order.ngay_hen_khach, 'DD/MM')}</b> · {order.gio_hen_khach}
                            </td>
                            <td>
                              <span className={clsx('lead-status', tone)}>
                                {order.sale_checked ? (
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
                        colSpan={5}
                        title="Không tìm thấy đơn hàng"
                        description="Không có đơn hàng nào khớp với điều kiện tìm kiếm hoặc ngày hẹn đang chọn."
                        actionText="Xem tất cả đơn hàng"
                        onAction={() => {
                          setQuery('')
                          setActiveDateTab('all')
                          setStatusFilter('all')
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
                      <MapPin size={13} /> {activeOrder.dia_chi || 'Chưa cập nhật địa chỉ'}
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
                  <span>
                    Kỹ thuật viên phục vụ{' '}
                    <b style={{ color: activeOrder.ten_ktv ? '#0f172a' : '#94a3b8' }}>
                      {activeOrder.ten_ktv ? (
                        <>
                          <UserCheck
                            size={13}
                            style={{ color: '#2563eb', verticalAlign: 'middle', marginRight: '4px' }}
                          />
                          {activeOrder.ten_ktv}
                        </>
                      ) : (
                        'Chưa phân bổ KTV'
                      )}
                    </b>
                  </span>
                  {activeOrder.machine_problem && (
                    <span>
                      Vấn đề của máy <b>{activeOrder.machine_problem}</b>
                    </span>
                  )}
                  <span>
                    Doanh số dự kiến <b>{formatVND(activeOrder.doanh_so)}</b>
                  </span>
                  <span>
                    Xác nhận với khách{' '}
                    <b className={activeOrder.sale_checked ? 'green-text' : 'amber-text'}>
                      {activeOrder.sale_checked ? (
                        <>
                          <CheckCircle2 size={13} /> Đã gọi xác nhận
                        </>
                      ) : (
                        <>
                          <Clock3 size={13} /> Chờ gọi xác nhận
                        </>
                      )}
                    </b>
                  </span>
                </div>

                <button
                  className="contact-button"
                  onClick={handleConfirmCall}
                  type="button"
                  disabled={confirmOrderMutation.isPending}
                >
                  <Phone size={18} />
                  {confirmOrderMutation.isPending
                    ? 'Đang cập nhật...'
                    : activeOrder.sale_checked
                      ? 'Gọi lại cho khách'
                      : 'Gọi xác nhận'}
                </button>
              </section>

              {/* Panel Điều chỉnh lịch hẹn */}
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

      {/* Modal Trả về / Lùi / Hủy đơn hàng */}
      {isLuiHuyModalOpen && activeOrder && (
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
                  Lý do theo quy chuẩn ERP:
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
