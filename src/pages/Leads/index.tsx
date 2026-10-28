import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CircleX,
  ClipboardCheck,
  Clock3,
  History,
  MapPin,
  MoreHorizontal,
  Phone,
  RotateCw,
  Save,
  Search,
  ShoppingCart,
  Timer,
  UserRound,
  Users,
  Voicemail,
} from 'lucide-react'
import clsx from 'clsx'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { Pagination } from '../../components/ui/Pagination'
import { TableSkeleton } from '../../components/ui/TableSkeleton'
import { useCustomerDetail, useCustomerHistory, useCustomersList, useSaveCareLogMutation } from '../../hooks/useCustomers'
import { useDebounce } from '../../hooks/useDebounce'
import { generateIdempotencyKey } from '../../services/apiClient'
import { CareStatusType, CustomerDto } from '../../types/api'
import { DialogState } from '../../types'
import { formatDate, formatDateTime } from '../../utils/formatters'
import { notify } from '../../utils/notify'
import customerService from '../../services/customer.service'
import { SecureAudioPlayer } from '../../components/common/SecureAudioPlayer'
import { SecureVideoPlayer } from '../../components/common/SecureVideoPlayer'

interface LeadsProps {
  onOpenDialog?: (dialog: DialogState) => void
}

const careOutcomes: {
  key: 'consulting' | 'scheduled' | 'closed' | 'callback' | 'no_need' | 'unreachable'
  label: string
  icon: any
  tone: string
}[] = [
    { key: 'consulting', label: 'Đang tư vấn', icon: Phone, tone: 'blue' },
    { key: 'scheduled', label: 'Đã hẹn lịch', icon: CalendarCheck, tone: 'green' },
    { key: 'closed', label: 'Đã chốt', icon: ShoppingCart, tone: 'rose' },
    { key: 'callback', label: 'Gọi lại', icon: Timer, tone: 'amber' },
    { key: 'no_need', label: 'Chưa có nhu cầu', icon: Voicemail, tone: 'gray' },
    { key: 'unreachable', label: 'Không liên lạc được', icon: CircleX, tone: 'purple' },
  ]

export const Leads: React.FC<LeadsProps> = ({ onOpenDialog }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'callback' | 'scheduled'>('all')
  const [outcome, setOutcome] = useState<'consulting' | 'scheduled' | 'closed' | 'callback' | 'no_need' | 'unreachable'>('consulting')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [nextCareDate, setNextCareDate] = useState('')
  const [nextCareTime, setNextCareTime] = useState('')
  const [note, setNote] = useState('')

  // Khóa chống double-click và quản lý Idempotency-Key cho phiên chăm sóc / chốt đơn
  const isSubmittingCareRef = useRef(false)
  const currentCareKeyRef = useRef<string>(generateIdempotencyKey())

  useEffect(() => {
    currentCareKeyRef.current = generateIdempotencyKey()
  }, [selectedCustomerId])

  // Debounce ô tìm kiếm 400ms chống spam API
  const debouncedQuery = useDebounce(query, 400)

  // Danh sách khách hàng tiềm năng
  const careStatusFilter: CareStatusType | undefined =
    activeTab === 'callback' ? 'callback' : activeTab === 'scheduled' ? 'scheduled' : undefined

  const {
    data: customersData,
    isLoading: isLoadingList,
    isError: isErrorList,
    refetch: refetchList,
  } = useCustomersList({
    customer_status: 'potential',
    care_status: careStatusFilter,
    search: debouncedQuery || undefined,
    page,
    page_size: 5,
  })

  // Chi tiết khách hàng đang chọn
  const { data: customerDetail } = useCustomerDetail(
    selectedCustomerId || undefined,
  )

  // Lịch sử tương tác khách hàng
  const { data: customerHistory, isLoading: isLoadingHistory } = useCustomerHistory(
    selectedCustomerId || undefined,
  )

  // Cập nhật kết quả chăm sóc khách hàng
  const saveCareLogMutation = useSaveCareLogMutation()

  const items = useMemo(() => customersData?.items || [], [customersData?.items])
  const totalItems = customersData?.total || 0

  // Tự động chọn khách hàng đầu tiên khi nạp danh sách
  useEffect(() => {
    if (items.length > 0 && (!selectedCustomerId || !items.some((c) => c.customer_id === selectedCustomerId))) {
      setSelectedCustomerId(items[0].customer_id)
    }
  }, [items, selectedCustomerId])

  // Cập nhật form khi thông tin chi tiết khách hàng thay đổi
  useEffect(() => {
    if (customerDetail) {
      setNote(customerDetail.note || '')
      if (customerDetail.next_care_at) {
        const parts = customerDetail.next_care_at.split(' ')
        if (parts[0]) setNextCareDate(parts[0])
        if (parts[1]) setNextCareTime(parts[1].slice(0, 5))
      } else {
        setNextCareDate('')
        setNextCareTime('')
      }
    }
  }, [customerDetail])

  const handleSaveCare = async () => {
    // Chặn tức thời double-click
    if (isSubmittingCareRef.current) return

    if (!selectedCustomerId) {
      notify('Vui lòng chọn khách hàng cần cập nhật')
      return
    }

    isSubmittingCareRef.current = true

    try {
      await saveCareLogMutation.mutateAsync({
        customerId: selectedCustomerId,
        payload: {
          result: outcome,
          next_care_at: nextCareDate ? `${nextCareDate} ${nextCareTime || '09:00'}:00` : undefined,
          note: note.trim() || undefined,
          idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
        },
        idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
      })

      // Nếu là chốt đơn thành công, sinh key mới cho lần sau
      if (outcome === 'closed') {
        currentCareKeyRef.current = generateIdempotencyKey()
      }
    } catch (err: any) {
      if (err?.status === 409) {
        notify('Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.')
      }
    } finally {
      isSubmittingCareRef.current = false
    }
  }

  const handleCallLead = () => {
    const callerName = customerDetail?.customer_name || 'Khách hàng'
    if (onOpenDialog) {
      onOpenDialog({ title: `Cuộc gọi: ${callerName}`, type: 'call' })
    } else {
      notify(`Đang gọi tới ${callerName}`)
    }
  }

  const getStatusLabel = (item: CustomerDto): { text: string; tone: string } => {
    if (item.care_status === 'scheduled') return { text: 'Đã hẹn lịch', tone: 'green' }
    if (item.care_status === 'callback') return { text: 'Cần gọi lại', tone: 'amber' }
    if (item.care_status === 'unreachable') return { text: 'Không nghe máy', tone: 'purple' }
    if (item.care_status === 'no_need') return { text: 'Chưa có nhu cầu', tone: 'gray' }
    return { text: 'Đang tư vấn', tone: 'blue' }
  }

  return (
    <div className="content leads-content">
      <div className="page-title telesale-title">
        <div>
          <p>
            Quản lý và chăm sóc khách hàng{' '}
            <span className="live-dot">● {totalItems} khách tiềm năng</span>
          </p>
          <h1>Khách tiềm năng</h1>
        </div>
        <button
          className="help"
          type="button"
          onClick={() => notify('Hướng dẫn nghiệp vụ chăm sóc khách hàng tiềm năng')}
        >
          <CircleHelp size={17} /> Hướng dẫn
        </button>
      </div>

      <section className="call-stat-grid">
        <article className="call-stat blue">
          <div className="card-icon">
            <Users size={21} />
          </div>
          <div>
            <p>Tổng khách tiềm năng</p>
            <strong>{totalItems}</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat amber">
          <div className="card-icon">
            <CalendarCheck size={21} />
          </div>
          <div>
            <p>Cần chăm sóc hôm nay</p>
            <strong>12</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <ClipboardCheck size={21} />
          </div>
          <div>
            <p>Đã hẹn lịch</p>
            <strong>8</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat blue">
          <div className="card-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p>Đã chốt</p>
            <strong>6</strong>
          </div>
          <BarChart3 size={19} />
        </article>
      </section>

      <div className="leads-grid">
        <div className="lead-list-column">
          <section className="call-panel lead-list-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">DANH SÁCH</p>
                <h2>Danh sách khách tiềm năng</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => refetchList()}
                title="Tải lại danh sách"
              >
                <RotateCw size={17} />
              </button>
            </div>

            <div className="lead-filters">
              <label>
                <Search size={17} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên, mã hoặc 4 số cuối SĐT..."
                />
              </label>
              <button type="button" onClick={() => notify('Lọc trạng thái')}>
                Trạng thái <ChevronDown size={15} />
              </button>
              <button type="button" onClick={() => notify('Lọc theo ngày hẹn')}>
                <CalendarDays size={15} /> Hôm nay <ChevronDown size={15} />
              </button>
            </div>

            <div className="lead-tabs">
              <button
                type="button"
                className={clsx({ active: activeTab === 'all' })}
                onClick={() => {
                  setActiveTab('all')
                  setPage(1)
                }}
              >
                Tất cả ({totalItems})
              </button>
              <button
                type="button"
                className={clsx({ active: activeTab === 'callback' })}
                onClick={() => {
                  setActiveTab('callback')
                  setPage(1)
                }}
              >
                Cần chăm sóc (12)
              </button>
              <button
                type="button"
                className={clsx({ active: activeTab === 'scheduled' })}
                onClick={() => {
                  setActiveTab('scheduled')
                  setPage(1)
                }}
              >
                Đã hẹn (8)
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
                    <TableSkeleton rows={5} cols={4} />
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
                          onClick={() => setSelectedCustomerId(lead.customer_id)}
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
                        setActiveTab('all')
                      }}
                    />
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={5}
              total={totalItems}
              onChange={setPage}
              itemLabel="khách hàng"
            />
          </section>

          {/* Lịch sử chăm sóc */}
          <section className="call-panel timeline-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">TƯƠNG TÁC</p>
                <h2>Lịch sử chăm sóc ({customerDetail?.customer_name || '...'})</h2>
              </div>
              <button className="subtle-select" type="button">
                Tất cả <ChevronDown size={14} />
              </button>
            </div>
            <div className="timeline">
              {isLoadingHistory ? (
                <p style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  Đang tải lịch sử tương tác...
                </p>
              ) : customerHistory && customerHistory.length > 0 ? (
                customerHistory.map((h, idx) => (
                  <div key={idx}>
                    <i />
                    <time>
                      {formatDate(h.at, 'DD/MM/YYYY')}
                      <br />
                      <b>{formatDate(h.at, 'HH:mm')}</b>
                    </time>
                    <p>
                      <b>{h.result}</b>
                      {h.note && <span> · {h.note}</span>}
                    </p>
                  </div>
                ))
              ) : (
                <p style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                  Chưa có lịch sử liên hệ trước đó.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Cột Chi tiết khách hàng & Form chăm sóc */}
        <aside className="lead-detail-column">
          <section className="call-panel lead-detail">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p>
                <h2>Chi tiết khách hàng</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => notify(`Mã KH: ${customerDetail?.customer_code}`)}
              >
                <MoreHorizontal size={19} />
              </button>
            </div>

            <div className="customer-brief lead-brief">
              <div className="customer-avatar small">
                <UserRound size={26} />
              </div>
              <div>
                <h3>{customerDetail?.customer_name || 'Đang tải...'}</h3>
                <p>
                  <Phone size={13} /> {customerDetail?.phone_masked || '—'}
                </p>
                <p>
                  <MapPin size={13} /> {customerDetail?.dia_chi || `${customerDetail?.district || ''} · ${customerDetail?.province || ''}`}
                </p>
              </div>
            </div>

            <div className="customer-details">
              <span>
                Nhu cầu <b>{customerDetail?.needs || 'Bảo dưỡng / Thay lõi'}</b>
              </span>
              <span>
                Loại máy <b>{customerDetail?.machine_model || 'Chưa cập nhật'}</b>
              </span>
              <span>
                Thay lõi gần nhất <b>{formatDate(customerDetail?.last_filter_change_at)}</b>
              </span>
              <span>
                Trạng thái{' '}
                <b className="amber-text">
                  <Timer size={13} />{' '}
                  {customerDetail?.care_status === 'scheduled'
                    ? 'Đã hẹn lịch'
                    : customerDetail?.care_status === 'callback'
                      ? 'Cần gọi lại'
                      : 'Đang tư vấn'}
                </b>
              </span>
            </div>

            <button className="contact-button" onClick={handleCallLead} type="button">
              <Phone size={18} /> Gọi khách hàng
            </button>
          </section>

          {/* Dữ liệu đa phương tiện CSKH (API 19b - Tự động re-fetch Signed URL khi hết hạn 403) */}
          {((customerDetail?.record && customerDetail.record.length > 0) ||
            (customerDetail?.list_images && customerDetail.list_images.some((img) => img.type === 'video'))) && (
            <section className="call-panel media-panel" style={{ padding: '14px 16px' }}>
              <div className="call-panel-heading" style={{ marginBottom: '10px' }}>
                <div>
                  <p className="eyebrow">DỮ LIỆU ĐA PHƯƠNG TIỆN</p>
                  <h2 style={{ fontSize: '13px' }}>Ghi âm & Video CSKH</h2>
                </div>
              </div>

              {/* Danh sách ghi âm cuộc gọi */}
              {customerDetail?.record && customerDetail.record.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', margin: 0 }}>
                    Ghi âm cuộc gọi ({customerDetail.record.length}):
                  </p>
                  {customerDetail.record.map((rec) => (
                    <SecureAudioPlayer
                      key={rec.recording_id || rec.call_id}
                      src={rec.url}
                      title={`Cuộc gọi #${rec.call_id}${rec.at ? ` · ${rec.at}` : ''}`}
                      onRefreshUrl={async () => {
                        if (!selectedCustomerId) return null
                        const refreshed = await customerService.getCustomerDetail(selectedCustomerId)
                        const matched = refreshed.record?.find((r) => r.recording_id === rec.recording_id)
                        return matched?.url || null
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Danh sách video hiện trường */}
              {customerDetail?.list_images &&
                customerDetail.list_images.filter((img) => img.type === 'video').length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', margin: 0 }}>
                      Video bảo dưỡng / lắp ráp:
                    </p>
                    {customerDetail.list_images
                      .filter((img) => img.type === 'video')
                      .map((vid) => (
                        <SecureVideoPlayer
                          key={vid.image_id}
                          src={vid.url}
                          onRefreshUrl={async () => {
                            if (!selectedCustomerId) return null
                            const refreshed = await customerService.getCustomerDetail(selectedCustomerId)
                            const matched = refreshed.list_images?.find((img) => img.image_id === vid.image_id)
                            return matched?.url || null
                          }}
                        />
                      ))}
                  </div>
                )}
            </section>
          )}

          {/* Form Cập nhật kết quả chăm sóc */}
          <section className="call-panel care-form">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">CẬP NHẬT</p>
                <h2>Chăm sóc khách hàng</h2>
              </div>
            </div>

            <div className="appointment-fields">
              <label>
                Ngày hẹn{' '}
                <span>
                  <CalendarDays size={15} />
                  <input
                    type="date"
                    value={nextCareDate}
                    onChange={(e) => setNextCareDate(e.target.value)}
                  />
                  <ChevronDown size={14} />
                </span>
              </label>
              <label>
                Giờ hẹn{' '}
                <span>
                  <Clock3 size={15} />
                  <input
                    type="time"
                    value={nextCareTime}
                    onChange={(e) => setNextCareTime(e.target.value)}
                  />
                  <ChevronDown size={14} />
                </span>
              </label>
            </div>

            <p className="result-label">Kết quả chăm sóc</p>
            <div className="result-grid lead-outcomes">
              {careOutcomes.map(({ key, label, icon: Icon, tone }) => (
                <button
                  key={key}
                  type="button"
                  className={clsx(tone, { chosen: outcome === key })}
                  onClick={() => setOutcome(key)}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>

            <label className="field-label">
              Ghi chú
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú chi tiết lần chăm sóc..."
              />
            </label>

            <button
              onClick={handleSaveCare}
              disabled={saveCareLogMutation.isPending}
              className="save-result"
              type="button"
            >
              <Save size={18} />{' '}
              {saveCareLogMutation.isPending ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Leads
