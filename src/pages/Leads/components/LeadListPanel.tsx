import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleX,
  History,
  Phone,
  RotateCw,
  Search,
  Timer,
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
  { value: 'callback', label: 'Hẹn gọi lại', tone: 'amber', icon: Timer },
  { value: 'scheduled', label: 'Đã hẹn lịch', tone: 'green', icon: CalendarCheck },
  { value: 'unreachable', label: 'Không nghe máy', tone: 'purple', icon: CircleX },
  { value: 'no_need', label: 'Chưa có nhu cầu', tone: 'gray', icon: Voicemail },
]

export const DATE_PRESET_OPTIONS = [
  { value: 'all', label: 'Tất cả lịch hẹn', icon: CalendarDays },
  { value: 'today', label: 'Hôm nay', icon: CalendarCheck },
  { value: 'tomorrow', label: 'Ngày mai', icon: CalendarDays },
  { value: '7days', label: '7 ngày tới', icon: CalendarDays },
]

const PAGE_SIZE = 10

export interface LeadListPanelProps {
  selectedCustomerId: number | null
  onSelectCustomer: (id: number) => void
}

export const LeadListPanel: React.FC<LeadListPanelProps> = ({
  selectedCustomerId,
  onSelectCustomer,
}) => {
  const [careStatusFilter, setCareStatusFilter] = useState<'all' | CareStatusType>('all')
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'tomorrow' | '7days'>('all')
  const [nextCareDateFilter, setNextCareDateFilter] = useState<string | undefined>(undefined)

  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [dateMenuOpen, setDateMenuOpen] = useState(false)

  const statusMenuRef = useRef<HTMLDivElement>(null)
  const dateMenuRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  // Tự động đóng dropdown filter khi nhấp chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (statusMenuRef.current && !statusMenuRef.current.contains(target)) {
        setStatusMenuOpen(false)
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(target)) {
        setDateMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentStatusOption = useMemo(() => {
    return CARE_STATUS_OPTIONS.find((opt) => opt.value === careStatusFilter) || CARE_STATUS_OPTIONS[0]
  }, [careStatusFilter])

  const currentDateLabel = useMemo(() => {
    if (datePreset === 'today') return 'Hôm nay'
    if (datePreset === 'tomorrow') return 'Ngày mai'
    if (datePreset === '7days') return '7 ngày tới'
    return 'Lịch hẹn'
  }, [datePreset])

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
        next_care_date: nextCareDateFilter,
        search: debouncedQuery || undefined,
        page: targetPage,
        page_size: PAGE_SIZE,
      }),
      queryFn: () =>
        customerService.getCustomers({
          customer_status: 'potential',
          care_status: activeCareStatus,
          next_care_date: nextCareDateFilter,
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
    next_care_date: nextCareDateFilter,
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
    if (item.care_status === 'callback') return { text: 'Cần gọi lại', tone: 'amber' }
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

        {/* Dropdown Lọc Theo Trạng Thái Chăm Sóc */}
        <div style={{ position: 'relative' }} ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => {
              setStatusMenuOpen(!statusMenuOpen)
              setDateMenuOpen(false)
            }}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: careStatusFilter !== 'all' ? '#eff6ff' : '#ffffff',
              borderColor: careStatusFilter !== 'all' ? '#3b82f6' : '#dfe8f2',
              color: careStatusFilter !== 'all' ? '#1d4ed8' : '#58708f',
              fontWeight: careStatusFilter !== 'all' ? 600 : 400,
            }}
            title="Lọc theo trạng thái chăm sóc"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Users size={15} style={{ color: careStatusFilter !== 'all' ? '#2563eb' : '#2c78d9', flexShrink: 0 }} />
              {currentStatusOption.label}
            </span>
            <ChevronDown
              size={15}
              style={{
                transform: statusMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            />
          </button>

          {statusMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '175px',
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
                          opt.tone === 'amber'
                            ? '#d97706'
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

        {/* Dropdown Lọc Theo Lịch Hẹn */}
        <div style={{ position: 'relative' }} ref={dateMenuRef}>
          <button
            type="button"
            onClick={() => {
              setDateMenuOpen(!dateMenuOpen)
              setStatusMenuOpen(false)
            }}
            style={{
              width: '100%',
              height: '38px',
              backgroundColor: datePreset !== 'all' ? '#f0f9ff' : '#ffffff',
              borderColor: datePreset !== 'all' ? '#0284c7' : '#dfe8f2',
              color: datePreset !== 'all' ? '#0284c7' : '#58708f',
              fontWeight: datePreset !== 'all' ? 600 : 400,
            }}
            title="Lọc theo ngày hẹn chăm sóc"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <CalendarDays size={15} style={{ color: datePreset !== 'all' ? '#0284c7' : '#2c78d9', flexShrink: 0 }} />
              {currentDateLabel}
            </span>
            <ChevronDown
              size={15}
              style={{
                transform: dateMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            />
          </button>

          {dateMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '175px',
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
              {DATE_PRESET_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = datePreset === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDatePreset(opt.value as any)
                      if (opt.value === 'all') {
                        setNextCareDateFilter(undefined)
                      } else if (opt.value === 'today') {
                        setNextCareDateFilter(dayjs().format('YYYY-MM-DD'))
                      } else if (opt.value === 'tomorrow') {
                        setNextCareDateFilter(dayjs().add(1, 'day').format('YYYY-MM-DD'))
                      } else if (opt.value === '7days') {
                        setNextCareDateFilter(dayjs().format('YYYY-MM-DD'))
                      }
                      setPage(1)
                      setDateMenuOpen(false)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: isSelected ? '#f0f9ff' : 'transparent',
                      color: isSelected ? '#0284c7' : '#334155',
                      fontWeight: isSelected ? 600 : 400,
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <Icon size={14} style={{ color: isSelected ? '#0284c7' : '#64748b' }} />
                    <span>{opt.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

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
          className={clsx({ active: careStatusFilter === 'callback' })}
          onClick={() => {
            setCareStatusFilter('callback')
            setPage(1)
          }}
        >
          Cần chăm sóc {careStatusFilter === 'callback' ? `(${totalItems})` : ''}
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
                        {tone === 'amber' ? (
                          <Timer size={14} />
                        ) : tone === 'green' ? (
                          <CalendarCheck size={14} />
                        ) : tone === 'blue' ? (
                          <Phone size={14} />
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
                  setDatePreset('all')
                  setNextCareDateFilter(undefined)
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
