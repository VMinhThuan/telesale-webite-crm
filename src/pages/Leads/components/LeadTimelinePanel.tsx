import React, { useEffect, useRef, useState } from 'react'
import {
  Bot,
  ChevronDown,
  ClipboardCheck,
  History,
  Phone,
  Tag,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useCustomerHistory } from '../../../hooks/useCustomers'
import { formatDate } from '../../../utils/formatters'

export const HISTORY_TYPE_OPTIONS: {
  value: 'all' | 'call' | 'care' | 'service'
  label: string
  icon: any
}[] = [
  { value: 'all', label: 'Tất cả loại', icon: History },
  { value: 'call', label: 'Cuộc gọi', icon: Phone },
  { value: 'care', label: 'CSKH', icon: ClipboardCheck },
  { value: 'service', label: 'Dịch vụ', icon: Wrench },
]

export interface LeadTimelinePanelProps {
  customerId: number | null
  customerName?: string
}

export const LeadTimelinePanel: React.FC<LeadTimelinePanelProps> = ({
  customerId,
  customerName,
}) => {
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'call' | 'care' | 'service'>('all')
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false)
  const historyMenuRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi nhấp chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (historyMenuRef.current && !historyMenuRef.current.contains(target)) {
        setHistoryMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: customerHistory, isLoading: isLoadingHistory } = useCustomerHistory(
    customerId || undefined,
    historyTypeFilter === 'all' ? undefined : historyTypeFilter,
  )

  return (
    <section className="call-panel timeline-panel">
      <div className="call-panel-heading">
        <div>
          <p className="eyebrow">TƯƠNG TÁC ĐA KÊNH</p>
          <h2>Lịch sử chăm sóc ({customerName || '...'})</h2>
        </div>

        {/* Bộ lọc loại tương tác */}
        <div style={{ position: 'relative' }} ref={historyMenuRef}>
          <button
            className="subtle-select"
            type="button"
            onClick={() => setHistoryMenuOpen(!historyMenuOpen)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: historyTypeFilter !== 'all' ? '#eff6ff' : '#f5f8fc',
              color: historyTypeFilter !== 'all' ? '#1d4ed8' : '#647895',
              fontWeight: historyTypeFilter !== 'all' ? 600 : 500,
              border: '1px solid',
              borderColor: historyTypeFilter !== 'all' ? '#bfdbfe' : 'transparent',
              borderRadius: '6px',
              padding: '6px 10px',
            }}
            title="Lọc theo loại tương tác"
          >
            {historyTypeFilter === 'all' && <span>Tất cả</span>}
            {historyTypeFilter === 'call' && <span>Cuộc gọi</span>}
            {historyTypeFilter === 'care' && <span>CSKH</span>}
            {historyTypeFilter === 'service' && <span>Dịch vụ</span>}
            <ChevronDown
              size={14}
              style={{
                transform: historyMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          </button>

          {historyMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                minWidth: '145px',
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
              {HISTORY_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = historyTypeFilter === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setHistoryTypeFilter(opt.value)
                      setHistoryMenuOpen(false)
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

      <div className="timeline">
        {isLoadingHistory ? (
          <p style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            Đang tải lịch sử tương tác...
          </p>
        ) : customerHistory && customerHistory.length > 0 ? (
          customerHistory.map((h, idx) => {
            const isCall = h.history_type === 'call'
            const isService = h.history_type === 'service'

            const dotColor = isCall ? '#2563eb' : isService ? '#059669' : '#9333ea'
            const dotBorder = isCall ? '#dbeafe' : isService ? '#d1fae5' : '#f3e8ff'

            return (
              <div key={idx}>
                <i
                  style={{
                    backgroundColor: dotColor,
                    borderColor: dotBorder,
                  }}
                />
                <time>
                  {formatDate(h.at, 'DD/MM/YYYY')}
                  <br />
                  <b>{formatDate(h.at, 'HH:mm')}</b>
                </time>

                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  {/* Hàng metadata: Loại tương tác, Người thực hiện, Mã đơn hàng */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                      fontSize: '10.5px',
                    }}
                  >
                    {/* Badge phân loại history_type */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '10px',
                        backgroundColor: isCall
                          ? '#eff6ff'
                          : isService
                            ? '#ecfdf5'
                            : '#faf5ff',
                        color: isCall
                          ? '#1d4ed8'
                          : isService
                            ? '#047857'
                            : '#7e22ce',
                        border: `1px solid ${
                          isCall ? '#bfdbfe' : isService ? '#a7f3d0' : '#e9d5ff'
                        }`,
                      }}
                    >
                      {isCall ? (
                        <>
                          <Phone size={10} /> Cuộc gọi
                        </>
                      ) : isService ? (
                        <>
                          <Wrench size={10} /> Dịch vụ
                        </>
                      ) : (
                        <>
                          <ClipboardCheck size={10} /> CSKH
                        </>
                      )}
                    </span>

                    {/* Người thực hiện (user_name) */}
                    {h.user_name ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                        title="Người thực hiện"
                      >
                        {h.user_name.includes('CHIẾN DỊCH') ||
                        h.user_name.includes('Hệ thống') ? (
                          <Bot size={12} style={{ color: '#0284c7' }} />
                        ) : (
                          <UserRound size={12} style={{ color: '#64748b' }} />
                        )}
                        {h.user_name}
                      </span>
                    ) : (
                      <span
                        style={{
                          color: '#94a3b8',
                          fontSize: '10.5px',
                          fontStyle: 'italic',
                        }}
                      >
                        Tổng đài tự động
                      </span>
                    )}

                    {/* Mã đơn hàng liên quan (ord_code) */}
                    {h.ord_code && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          backgroundColor: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '10px',
                        }}
                        title={`Mã đơn hàng dịch vụ: ${h.ord_code}`}
                      >
                        <Tag size={10} />
                        {h.ord_code}
                      </span>
                    )}
                  </div>

                  {/* Kết quả tương tác (result) */}
                  {h.result && (
                    <div style={{ fontSize: '11px', lineHeight: 1.4 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          color: h.result.includes('Nghe máy')
                            ? '#15803d'
                            : h.result.includes('Không nghe')
                              ? '#b91c1c'
                              : h.result.includes('Phát sinh')
                                ? '#0284c7'
                                : h.result.includes('chốt')
                                  ? '#be123c'
                                  : '#1e293b',
                        }}
                      >
                        {h.result}
                      </span>
                    </div>
                  )}

                  {/* Ghi chú chi tiết (note) */}
                  {h.note && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#334155',
                        backgroundColor: '#ffffff',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '5px',
                        padding: '5px 8px',
                        lineHeight: 1.4,
                      }}
                    >
                      {h.note}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <p style={{ padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
            Chưa có lịch sử liên hệ phù hợp với bộ lọc.
          </p>
        )}
      </div>
    </section>
  )
}

export default LeadTimelinePanel

