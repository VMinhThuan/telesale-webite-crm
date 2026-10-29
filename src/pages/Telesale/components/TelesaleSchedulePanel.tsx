import React, { useMemo } from 'react'
import { MoreHorizontal, RotateCw } from 'lucide-react'
import clsx from 'clsx'
import dayjs from '../../../lib/dayjs'
import { useBranchSlots } from '../../../hooks/useOrders'
import { BranchSlotDto } from '../../../types/api'
import { notify } from '../../../utils/notify'

export interface TelesaleSchedulePanelProps {
  branchName?: string
  branchId: number
  orderDate: string
  onDateChange: (date: string) => void
  selectedSlotId?: number
  onSelectSlot: (slotId: number, slotTime: string) => void
  isAutoDial: boolean
  onToggleAutoDial: () => void
}

export const TelesaleSchedulePanel: React.FC<TelesaleSchedulePanelProps> = ({
  branchName,
  branchId,
  orderDate,
  onDateChange,
  selectedSlotId,
  onSelectSlot,
  isAutoDial,
  onToggleAutoDial,
}) => {
  // Lấy danh sách ca hẹn slot theo chi nhánh và ngày chọn
  const { data: rawSlots = [] } = useBranchSlots(
    branchId,
    orderDate || undefined,
    orderDate || undefined,
  )

  // Chuẩn hóa dữ liệu slot luôn là mảng để tránh lỗi không render được
  const branchSlots: BranchSlotDto[] = useMemo(() => {
    if (Array.isArray(rawSlots)) return rawSlots
    if (Array.isArray((rawSlots as any)?.items)) return (rawSlots as any).items
    return []
  }, [rawSlots])

  return (
    <section className="call-panel schedule-panel">
      <div className="call-panel-heading">
        <div>
          <p className="eyebrow">LỊCH HẸN CHI NHÁNH</p>
          <h2>{branchName || 'Trụ sở Hà Nội'}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => notify('Cập nhật slot chi nhánh')}
          title="Tùy chọn"
        >
          <MoreHorizontal size={19} />
        </button>
      </div>

      <div style={{ padding: '0 14px 10px' }}>
        <label
          style={{
            fontSize: '10px',
            color: '#6d7f9c',
            display: 'block',
            marginBottom: '4px',
          }}
        >
          Xem slot theo ngày:
        </label>
        <input
          type="date"
          value={orderDate}
          min={dayjs().format('YYYY-MM-DD')}
          onChange={(e) => onDateChange(e.target.value)}
          style={{
            width: '100%',
            height: '32px',
            border: '1px solid #dfe6f0',
            borderRadius: '6px',
            padding: '0 8px',
            fontSize: '11px',
            color: '#344767',
            outline: 'none',
          }}
        />
      </div>

      <div
        className="slot-header"
        style={{
          display: 'grid',
          gridTemplateColumns: '55px 1fr 85px',
          alignItems: 'center',
          padding: '8px 12px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '10px',
          fontWeight: 700,
          color: '#64748b',
        }}
      >
        <span style={{ textAlign: 'left' }}>Ca hẹn</span>
        <span style={{ textAlign: 'center' }}>Khung giờ</span>
        <span style={{ textAlign: 'right' }}>Trạng thái</span>
      </div>

      <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
        {branchSlots.length > 0 ? (
          branchSlots.map((slot, index) => {
            const isFull = slot.con_trong <= 0 || slot.is_expired
            const isChosen = selectedSlotId === slot.slot_id
            return (
              <div
                key={slot.slot_id}
                className="slot-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '55px 1fr 85px',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderBottom: '1px solid #edf1f6',
                  background: isChosen ? '#eff6ff' : 'transparent',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onClick={() => {
                  if (!isFull) {
                    onSelectSlot(slot.slot_id, slot.slot_time)
                  }
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#64748b',
                    textAlign: 'left',
                  }}
                >
                  Ca #{index + 1}
                </span>
                <b
                  style={{
                    fontSize: '11px',
                    color: isChosen ? '#2563eb' : '#334155',
                    textAlign: 'center',
                  }}
                >
                  {slot.to_time && slot.to_time !== slot.slot_time
                    ? `${slot.slot_time} - ${slot.to_time}`
                    : slot.slot_time}
                </b>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#fff',
                      background: isFull ? '#ef4444' : '#10b981',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isFull ? 'Hết chỗ' : `Còn ${slot.con_trong} chỗ`}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <p
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '20px 0',
            }}
          >
            {orderDate
              ? 'Không có ca hẹn nào trong ngày đã chọn'
              : 'Chọn ngày để kiểm tra slot khả dụng'}
          </p>
        )}
      </div>

      <button
        className={clsx('auto-dial', { active: isAutoDial })}
        onClick={onToggleAutoDial}
        type="button"
        style={{ marginTop: '12px' }}
      >
        <RotateCw size={18} />{' '}
        {isAutoDial ? 'Dừng quay tự động' : 'Tự động quay số'}
      </button>
    </section>
  )
}
