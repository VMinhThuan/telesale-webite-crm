import React, { useMemo, useState } from 'react'
import {
  Calendar,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
} from 'lucide-react'
import dayjs from '../../../lib/dayjs'
import { useBranchSlots } from '../../../hooks/useOrders'
import { BranchSlotDto, ErpSource } from '../../../types/api'

export interface LeadSlotBarProps {
  branchId: number
  branchName?: string
  availableBranches?: { id: number; name: string; source_erp?: ErpSource }[]
  onBranchChange?: (branchId: number) => void
  source_erp?: ErpSource
}

export const LeadSlotBar: React.FC<LeadSlotBarProps> = ({
  branchId,
  branchName,
  availableBranches = [],
  onBranchChange,
  source_erp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  // Tra cứu danh sách Slot ca hẹn của chi nhánh theo ngày đang chọn và nguồn ERP
  const { data: rawSlots = [], isLoading } = useBranchSlots(
    branchId,
    selectedDate,
    selectedDate,
    { source_erp },
  )

  // Chuẩn hóa dữ liệu slot luôn là mảng
  const branchSlots: BranchSlotDto[] = useMemo(() => {
    if (Array.isArray(rawSlots)) return rawSlots
    if (Array.isArray((rawSlots as any)?.items)) return (rawSlots as any).items
    return []
  }, [rawSlots])

  // Thống kê tổng slot còn trống
  const totalAvailable = useMemo(() => {
    return branchSlots.reduce((acc, s) => acc + (s.con_trong ?? Math.max(0, s.available - s.count_orders)), 0)
  }, [branchSlots])

  const formattedDateLabel = useMemo(() => {
    const isToday = selectedDate === dayjs().format('YYYY-MM-DD')
    const isTomorrow = selectedDate === dayjs().add(1, 'day').format('YYYY-MM-DD')
    if (isToday) return `Hôm nay (${dayjs(selectedDate).format('DD/MM')})`
    if (isTomorrow) return `Ngày mai (${dayjs(selectedDate).format('DD/MM')})`
    return dayjs(selectedDate).format('DD/MM/YYYY')
  }, [selectedDate])

  const currentBranchLabel =
    branchName || availableBranches.find((b) => b.id === branchId)?.name || `Chi nhánh #${branchId}`

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        marginBottom: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header thanh Slot Bar (Thanh điều khiển & Nút Thu gọn/Mở rộng) */}
      <div
        style={{
          padding: '10px 16px',
          background: isCollapsed ? '#ffffff' : '#f8fafc',
          borderBottom: isCollapsed ? 'none' : '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            <CalendarCheck size={16} style={{ color: '#2563eb' }} />
            <span>LỊCH SLOT CHIẾN DỊCH</span>
          </div>

          {/* Chọn Chi nhánh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={13} style={{ color: '#64748b' }} />
            {availableBranches.length > 0 && onBranchChange ? (
              <select
                value={branchId}
                onChange={(e) => onBranchChange(Number(e.target.value))}
                style={{
                  height: '30px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1d4ed8',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {availableBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8' }}>
                {currentBranchLabel}
              </span>
            )}
          </div>

          {/* Tóm tắt nhanh số slot */}
          <span
            style={{
              fontSize: '11.5px',
              background: totalAvailable > 0 ? '#dcfce7' : '#fee2e2',
              color: totalAvailable > 0 ? '#15803d' : '#b91c1c',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600,
            }}
          >
            {totalAvailable > 0 ? `Còn ${totalAvailable} slot trống` : 'Đã kín slot'}
          </span>
        </div>

        {/* Cụm chọn ngày & nút Toggle Thu gọn */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => setSelectedDate(dayjs().format('YYYY-MM-DD'))}
                style={{
                  padding: '4px 9px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: selectedDate === dayjs().format('YYYY-MM-DD') ? '#eff6ff' : '#fff',
                  color: selectedDate === dayjs().format('YYYY-MM-DD') ? '#1d4ed8' : '#475569',
                  fontSize: '11px',
                  fontWeight: selectedDate === dayjs().format('YYYY-MM-DD') ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(dayjs().add(1, 'day').format('YYYY-MM-DD'))}
                style={{
                  padding: '4px 9px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: selectedDate === dayjs().add(1, 'day').format('YYYY-MM-DD') ? '#eff6ff' : '#fff',
                  color: selectedDate === dayjs().add(1, 'day').format('YYYY-MM-DD') ? '#1d4ed8' : '#475569',
                  fontSize: '11px',
                  fontWeight: selectedDate === dayjs().add(1, 'day').format('YYYY-MM-DD') ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                Ngày mai
              </button>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '5px',
                  padding: '0 6px',
                  height: '26px',
                }}
              >
                <Calendar size={12} style={{ color: '#64748b', marginRight: '4px' }} />
                <input
                  type="date"
                  value={selectedDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    fontSize: '11px',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
          )}

          {/* Nút Thu gọn / Mở rộng */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {isCollapsed ? (
              <>
                <span>Xem slot ({formattedDateLabel})</span>
                <ChevronDown size={14} />
              </>
            ) : (
              <>
                <span>Thu gọn</span>
                <ChevronUp size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nội dung danh sách Slot nằm ngang (Horizontal Bar) */}
      {!isCollapsed && (
        <div style={{ padding: '12px 16px' }}>
          {isLoading ? (
            <div style={{ padding: '14px 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
              Đang tải danh sách ca hẹn chi nhánh...
            </div>
          ) : branchSlots.length === 0 ? (
            <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
              Chưa có dữ liệu ca hẹn (slot) cho {formattedDateLabel}.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '10px',
                overflowX: 'auto',
                paddingBottom: '4px',
              }}
            >
              {branchSlots.map((slot) => {
                const remaining = slot.con_trong ?? Math.max(0, slot.available - slot.count_orders)
                const isFull = remaining <= 0
                const isExpired = slot.is_expired

                let statusColor = '#16a34a'
                let statusBg = '#f0fdf4'
                let statusBorder = '#bbf7d0'
                let badgeText = `Còn ${remaining}/${slot.available}`

                if (isExpired) {
                  statusColor = '#64748b'
                  statusBg = '#f8fafc'
                  statusBorder = '#e2e8f0'
                  badgeText = 'Đã hết giờ'
                } else if (isFull) {
                  statusColor = '#e11d48'
                  statusBg = '#fff1f2'
                  statusBorder = '#fecdd3'
                  badgeText = 'Đã kín ca'
                }

                return (
                  <div
                    key={`${slot.date}_${slot.slot_id}_${slot.slot_time}`}
                    style={{
                      flex: '0 0 auto',
                      width: '135px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${statusBorder}`,
                      background: statusBg,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 700,
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Clock size={12} style={{ color: '#64748b' }} />
                        {slot.slot_time}
                      </span>
                      {slot.to_time && (
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          - {slot.to_time}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          color: statusColor,
                        }}
                      >
                        {badgeText}
                      </span>
                      <span style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                        {slot.count_orders || 0} đơn
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LeadSlotBar