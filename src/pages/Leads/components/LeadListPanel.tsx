import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleX,
  History,
  MapPin,
  Phone,
  RotateCw,
  Search,
  ShoppingCart,
  UserRound,
  Users,
  Voicemail,
} from 'lucide-react'
import clsx from 'clsx'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../constants/queryKeys'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { TableSkeleton } from '../../../components/ui/TableSkeleton'
import { useCustomersList } from '../../../hooks/useCustomers'
import { useDebounce } from '../../../hooks/useDebounce'
import { CareStatusType, CustomerDto } from '../../../types/api'
import { formatDateTime } from '../../../utils/formatters'
import customerService from '../../../services/customer.service'
import dayjs from '../../../lib/dayjs'

export const CARE_STATUS_OPTIONS: {
  value: 'all' | CareStatusType
  label: string
  tone?: string
  icon: any
}[] = [
  { value: 'all', label: 'Tất cả trạng thái', icon: Users },
  { value: 'consulting', label: 'Đang tư vấn', tone: 'blue', icon: Phone },
  { value: 'scheduled', label: 'Đã hẹn lịch', tone: 'green', icon: CalendarCheck },
  { value: 'closed', label: 'Đã chốt đơn', tone: 'green', icon: ShoppingCart },
  { value: 'unreachable', label: 'Không nghe máy', tone: 'purple', icon: CircleX },
  { value: 'no_need', label: 'Chưa có nhu cầu', tone: 'gray', icon: Voicemail },
]

export const DATE_PRESET_OPTIONS = [
  { value: 'all', label: 'Tất cả thời gian', icon: CalendarDays },
  { value: 'today', label: 'Hôm nay', icon: CalendarCheck },
  { value: '7days', label: '7 ngày qua', icon: CalendarDays },
  { value: 'month', label: 'Tháng này', icon: CalendarDays },
]

const PAGE_SIZE = 10

export interface LeadListPanelProps {
  selectedCustomerId: number | null
  onSelectCustomer: (id: number) => void
  selectedBranchId?: number
  onBranchChange?: (branchId?: number) => void
  availableBranches?: { id: number; name: string }[]
}

export const LeadListPanel: React.FC<LeadListPanelProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  selectedBranchId,
  onBranchChange,
  availableBranches = [],
}) => {
  const [internalBranchId, setInternalBranchId] = useState<number | undefined>(selectedBranchId)
  const currentBranchId = selectedBranchId !== undefined ? selectedBranchId : internalBranchId

  const [careStatusFilter, setCareStatusFilter] = useState<'all' | CareStatusType>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | 'month' | 'custom'>('all')

  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  const branchMenuRef = useRef<HTMLDivElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // Tự động đóng dropdown filter khi nhấp chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (branchMenuRef.current && !branchMenuRef.current.contains(target)) {
        setBranchMenuOpen(false)
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentBranchLabel = useMemo(() => {
    if (!currentBranchId) return 'Tất cả chi nhánh'
    const found = availableBranches.find((b) => b.id === currentBranchId)
    return found ? found.name : `Chi nhánh #${currentBranchId}`
  }, [currentBranchId, availableBranches])

  const currentStatusOption = useMemo(() => {
    return CARE_STATUS_OPTIONS.find((opt) => opt.value === careStatusFilter) || CARE_STATUS_OPTIONS[0]
  }, [careStatusFilter])

  const handleBranchSelect = (bId: number | undefined) => {
    setInternalBranchId(bId)
    onBranchChange?.(bId)
    setPage(1)
  }

  // Debounce ô tìm kiếm 400ms chống spam API
  const debouncedQuery = useDebounce(query, 400)

  const queryClient = useQueryClient()
  const activeCareStatus = careStatusFilter === 'all' ? undefined : careStatusFilter

  // Chiến lược Hover Prefetching cho phân trang khách hàng tiềm năng
  const handlePrefetchPage = (targetPage: number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.customers.list({
        customer_status: 'potential',
        care_status: activeCareStatus,
        branch_id: currentBranchId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: debouncedQuery || undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      }),
      queryFn: () =>
        customerService.getCustomers({
          customer_status: 'potential',
          care_status: activeCareStatus,
          branch_id: currentBranchId,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: debouncedQuery || undefined,
          page: targetPage,
          page_size: PAGE_SIZE,
        }),
      staleTime: 1000 * 60 * 2,
    })
  }

  const {
    data: customersData,
    isLoading: isLoadingList,
    isError: isErrorList,
    refetch: refetchList,
  } = useCustomersList({
    customer_status: 'potential',
    care_status: activeCareStatus,
    branch_id: currentBranchId,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    search: debouncedQuery || undefined,
    page,
    page_size: PAGE_SIZE,
  })

  const items = useMemo(() => customersData?.items || [], [customersData?.items])
  const totalItems = customersData?.total || 0

  // Tự động chọn khách hàng đầu tiên khi nạp danh sách
  useEffect(() => {
    if (items.length > 0 && (!selectedCustomerId || !items.some((c) => c.customer_id === selectedCustomerId))) {
      onSelectCustomer(items[0].customer_id)
    }
  }, [items, selectedCustomerId, onSelectCustomer])

  const getStatusLabel = (item: CustomerDto): { text: string; tone: string } => {
    if (item.care_status === 'scheduled') return { text: 'Đã hẹn lịch', tone: 'green' }
    if (item.care_status === 'consulting' || item.care_status === 'callback') return { text: 'Đang tư vấn', tone: 'blue' }
    if (item.care_status === 'closed') return { text: 'Đã chốt', tone: 'green' }
    if (item.care_status === 'unreachable') return { text: 'Không nghe máy', tone: 'purple' }
    if (item.care_status === 'no_need') return { text: 'Chưa có nhu cầu', tone: 'gray' }
    return { text: 'Chưa phân loại', tone: 'gray' }
  }

  return (
    <section className="call-panel lead-panel">
      <div className="call-panel-heading">
        <div>
          <p className="eyebrow">DANH SÁCH</p>
          <h2>Danh sách khách tiềm năng</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => refetchList()}
          title="Làm mới danh sách"
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Cụm bộ lọc: Hàng 1 (Tìm kiếm + Chi nhánh + Trạng thái) & Hàng 2 (Bộ lọc thời gian) */}
      <div className="lead-filters">
        <label>
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm tên, mã hoặc 4 số cuối SĐT..."
          />
        </label>

        {/* Dropdown Lọc Theo Chi Nhánh */}
        <div style={{ position: 'relative' }} ref={branchMenuRef}>
          <button
            type="button"
            onClick={() => {
              setBranchMenuOpen(!branchMenuOpen)
              setStatusMenuOpen(false)
            }}
            style={{
              width: '100%',
              minWidth: '155px',
              height: '38px',
              padding: '0 12px',
              whiteSpace: 'nowrap',
              backgroundColor: currentBranchId ? '#eff6ff' : '#ffffff',
              borderColor: currentBranchId ? '#3b82f6' : '#dfe8f2',
              color: currentBranchId ? '#1d4ed8' : '#475569',
              fontWeight: currentBranchId ? 600 : 500,
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
            }}
            title={currentBranchLabel}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Building2 size={15} style={{ color: currentBranchId ? '#2563eb' : '#2c78d9', flexShrink: 0 }} />
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
                right: 0,
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
                  handleBranchSelect(undefined)
                  setBranchMenuOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !currentBranchId ? '#eff6ff' : 'transparent',
                  color: !currentBranchId ? '#1d4ed8' : '#334155',
                  fontWeight: !currentBranchId ? 600 : 400,
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <Building2 size={14} style={{ color: !currentBranchId ? '#2563eb' : '#64748b' }} />
                <span>Tất cả chi nhánh</span>
              </button>
              {availableBranches.map((b) => {
                const isSelected = currentBranchId === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      handleBranchSelect(b.id)
                      setBranchMenuOpen(false)
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

        {/* Dropdown Lọc Theo Trạng Thái Chăm Sóc */}
        <div style={{ position: 'relative' }} ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => {
              setStatusMenuOpen(!statusMenuOpen)
              setBranchMenuOpen(false)
            }}
            style={{
              width: '100%',
              minWidth: '155px',
              height: '38px',
              padding: '0 12px',
              whiteSpace: 'nowrap',
              backgroundColor: careStatusFilter !== 'all' ? '#eff6ff' : '#ffffff',
              borderColor: careStatusFilter !== 'all' ? '#3b82f6' : '#dfe8f2',
              color: careStatusFilter !== 'all' ? '#1d4ed8' : '#475569',
              fontWeight: careStatusFilter !== 'all' ? 600 : 500,
              fontSize: '11.5px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              cursor: 'pointer',
            }}
            title={currentStatusOption.label}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              <Users size={15} style={{ color: careStatusFilter !== 'all' ? '#2563eb' : '#2c78d9', flexShrink: 0 }} />
              <span>{currentStatusOption.label}</span>
            </span>
            <ChevronDown
              size={14}
              style={{
                transform: statusMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
                color: '#64748b',
              }}
            />
          </button>

          {statusMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '100%',
                width: 'max-content',
                maxWidth: '260px',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08)',
                padding: '4px',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              {CARE_STATUS_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = careStatusFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setCareStatusFilter(opt.value)
                      setPage(1)
                      setStatusMenuOpen(false)
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
                    <Icon
                      size={14}
                      style={{
                        color:
                          opt.tone === 'rose'
                            ? '#e11d48'
                            : opt.tone === 'green'
                              ? '#059669'
                              : opt.tone === 'blue'
                                ? '#2563eb'
                                : opt.tone === 'purple'
                                  ? '#9333ea'
                                  : '#64748b',
                      }}
                    />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* HÀNG 2: Bộ lọc thời gian từ ngày … ngày & Nút chọn nhanh */}
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            padding: '7px 10px',
            background: '#f8fafc',
            borderRadius: '7px',
            border: '1px solid #e2e8f0',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#475569', fontWeight: 600 }}>
            <CalendarDays size={13} style={{ color: '#2563eb' }} />
            <span>Thời gian:</span>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#64748b', fontSize: '10.5px' }}>Từ</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setDatePreset('custom')
                setPage(1)
              }}
              style={{
                height: '27px',
                padding: '0 6px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#1e293b',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <span style={{ color: '#64748b', fontSize: '10.5px' }}>Đến</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => {
                setToDate(e.target.value)
                setDatePreset('custom')
                setPage(1)
              }}
              style={{
                height: '27px',
                padding: '0 6px',
                borderRadius: '5px',
                border: '1px solid #cbd5e1',
                fontSize: '11px',
                color: '#1e293b',
                background: '#ffffff',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Cụm nút bấm chọn nhanh */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setFromDate(dayjs().format('YYYY-MM-DD'))
                setToDate(dayjs().format('YYYY-MM-DD'))
                setDatePreset('today')
                setPage(1)
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: datePreset === 'today' ? '#2563eb' : '#cbd5e1',
                background: datePreset === 'today' ? '#eff6ff' : '#ffffff',
                color: datePreset === 'today' ? '#1d4ed8' : '#475569',
                fontWeight: datePreset === 'today' ? 600 : 400,
                fontSize: '10.5px',
                cursor: 'pointer',
              }}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate(dayjs().subtract(7, 'day').format('YYYY-MM-DD'))
                setToDate(dayjs().format('YYYY-MM-DD'))
                setDatePreset('7days')
                setPage(1)
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: datePreset === '7days' ? '#2563eb' : '#cbd5e1',
                background: datePreset === '7days' ? '#eff6ff' : '#ffffff',
                color: datePreset === '7days' ? '#1d4ed8' : '#475569',
                fontWeight: datePreset === '7days' ? 600 : 400,
                fontSize: '10.5px',
                cursor: 'pointer',
              }}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate(dayjs().startOf('month').format('YYYY-MM-DD'))
                setToDate(dayjs().endOf('month').format('YYYY-MM-DD'))
                setDatePreset('month')
                setPage(1)
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: datePreset === 'month' ? '#2563eb' : '#cbd5e1',
                background: datePreset === 'month' ? '#eff6ff' : '#ffffff',
                color: datePreset === 'month' ? '#1d4ed8' : '#475569',
                fontWeight: datePreset === 'month' ? 600 : 400,
                fontSize: '10.5px',
                cursor: 'pointer',
              }}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => {
                setFromDate('')
                setToDate('')
                setDatePreset('all')
                setPage(1)
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: datePreset === 'all' ? '#2563eb' : '#cbd5e1',
                background: datePreset === 'all' ? '#eff6ff' : '#ffffff',
                color: datePreset === 'all' ? '#1d4ed8' : '#475569',
                fontWeight: datePreset === 'all' ? 600 : 400,
                fontSize: '10.5px',
                cursor: 'pointer',
              }}
            >
              Tất cả
            </button>
            {(fromDate || toDate) && (
              <button
                type="button"
                title="Xóa bộ lọc thời gian"
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                  setDatePreset('all')
                  setPage(1)
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <CircleX size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs nhanh trạng thái chăm sóc */}
      <div className="lead-tabs">
        <button
          type="button"
          className={clsx({ active: careStatusFilter === 'all' })}
          onClick={() => {
            setCareStatusFilter('all')
            setPage(1)
          }}
        >
          Tất cả ({totalItems})
        </button>
        <button
          type="button"
          className={clsx({ active: careStatusFilter === 'consulting' })}
          onClick={() => {
            setCareStatusFilter('consulting')
            setPage(1)
          }}
        >
          Đang tư vấn {careStatusFilter === 'consulting' ? `(${totalItems})` : ''}
        </button>
        <button
          type="button"
          className={clsx({ active: careStatusFilter === 'scheduled' })}
          onClick={() => {
            setCareStatusFilter('scheduled')
            setPage(1)
          }}
        >
          Đã hẹn {careStatusFilter === 'scheduled' ? `(${totalItems})` : ''}
        </button>
      </div>

      <div className="lead-table-wrap">
        <table className="lead-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Liên hệ gần nhất</th>
              <th>Lịch chăm sóc</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingList ? (
              <TableSkeleton rows={PAGE_SIZE} cols={4} />
            ) : isErrorList ? (
              <ErrorState
                colSpan={4}
                message="Không thể kết nối đến máy chủ ERP."
                onRetry={refetchList}
              />
            ) : items.length > 0 ? (
              items.map((lead) => {
                const { text: statusText, tone } = getStatusLabel(lead)
                const isSelected = selectedCustomerId === lead.customer_id
                return (
                  <tr
                    key={lead.customer_id}
                    className={clsx({ 'selected-row': isSelected })}
                    onClick={() => onSelectCustomer(lead.customer_id)}
                    onMouseEnter={() => {
                      // Tải trước chi tiết và lịch sử tương tác của khách hàng khi lướt chuột
                      queryClient.prefetchQuery({
                        queryKey: queryKeys.customers.detail(lead.customer_id),
                        queryFn: () => customerService.getCustomerDetail(lead.customer_id),
                        staleTime: 1000 * 60 * 5,
                      })
                      queryClient.prefetchQuery({
                        queryKey: queryKeys.customers.history(lead.customer_id),
                        queryFn: () => customerService.getCustomerHistory(lead.customer_id),
                        staleTime: 1000 * 60 * 2,
                      })
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="lead-name">
                        <div className="tiny-avatar">
                          <UserRound size={17} />
                        </div>
                        <span>
                          <b>{lead.customer_name}</b>
                          <small>{lead.phone_masked}</small>
                        </span>
                      </div>
                    </td>
                    <td>{formatDateTime(lead.last_contact_at)}</td>
                    <td>{formatDateTime(lead.next_care_at)}</td>
                    <td>
                      <span className={clsx('lead-status', tone)}>
                        {lead.care_status === 'closed' ? (
                          <ShoppingCart size={14} />
                        ) : tone === 'green' ? (
                          <CalendarCheck size={14} />
                        ) : tone === 'blue' ? (
                          <Phone size={14} />
                        ) : tone === 'purple' ? (
                          <CircleX size={14} />
                        ) : (
                          <History size={14} />
                        )}{' '}
                        {statusText}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <EmptyState
                colSpan={4}
                title="Không tìm thấy khách hàng"
                description="Không có khách hàng nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
                actionText="Xóa bộ lọc tìm kiếm"
                onAction={() => {
                  setQuery('')
                  setCareStatusFilter('all')
                  setFromDate('')
                  setToDate('')
                  setDatePreset('all')
                  handleBranchSelect(undefined)
                  setPage(1)
                }}
              />
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={totalItems}
        onChange={setPage}
        onPrefetchPage={handlePrefetchPage}
        itemLabel="khách hàng"
      />
    </section>
  )
}

export default LeadListPanel
