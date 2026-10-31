import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import dayjs from '../../../lib/dayjs'
import { useBranchSlots } from '../../../hooks/useOrders'
import { BranchSlotDto } from '../../../types/api'

export interface TelesaleSchedulePanelProps {
  branchName?: string
  branchId: number
  orderDate: string
  onDateChange: (date: string) => void
  selectedSlotId?: number
  onSelectSlot: (slotId: number, slotTime: string, date?: string) => void
}

export const TelesaleSchedulePanel: React.FC<TelesaleSchedulePanelProps> = ({
  branchName,
  branchId,
  orderDate,
  onDateChange,
  selectedSlotId,
  onSelectSlot,
}) => {
  // Quản lý ngày bắt đầu của cửa sổ 3 ngày (mặc định từ hôm nay)
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    return orderDate ? dayjs(orderDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
  })

  // Tính toán danh sách 3 ngày liên tiếp trong cửa sổ hiển thị
  const dates = useMemo(() => {
    const start = dayjs(startDateStr)
    return [0, 1, 2].map((offset) => {
      const d = start.add(offset, 'day')
      const dayNum = d.day()
      const dayOfWeek = dayNum === 0 ? 'CN' : `T${dayNum + 1}`
      return {
        dateStr: d.format('YYYY-MM-DD'),
        displayDate: d.format('DD/MM'),
        dayOfWeek,
      }
    })
  }, [startDateStr])

  // Khoảng ngày hiển thị (VD: 31/10 - 02/11)
  const rangeLabel = `${dates[0].displayDate} - ${dates[2].displayDate}`

  // Gọi API lấy toàn bộ slot của cả 3 ngày liên tiếp
  const fromDate = dates[0].dateStr
  const toDate = dates[2].dateStr
  const { data: rawSlots = [], isLoading } = useBranchSlots(branchId, fromDate, toDate)

  // Chuẩn hóa dữ liệu slot luôn là mảng
  const branchSlots: BranchSlotDto[] = useMemo(() => {
    if (Array.isArray(rawSlots)) return rawSlots
    if (Array.isArray((rawSlots as any)?.items)) return (rawSlots as any).items
    return []
  }, [rawSlots])

  // Bản đồ tra cứu slot theo khóa: `${date}_${slot_time}`
  const slotMap = useMemo(() => {
    const map = new Map<string, BranchSlotDto>()
    branchSlots.forEach((slot) => {
      map.set(`${slot.date}_${slot.slot_time}`, slot)
    })
    return map
  }, [branchSlots])

  // Danh sách các khung giờ cố định phân loại theo Ca Sáng và Ca Chiều
  const morningTimes = useMemo(() => {
    const defaultMorning = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30']
    const timesFromApi = Array.from(
      new Set(
        branchSlots
          .map((s) => s.slot_time)
          .filter((t) => {
            const h = parseInt(t.split(':')[0], 10)
            return h < 12
          }),
      ),
    ).sort()
    return timesFromApi.length > 0 ? timesFromApi : defaultMorning
  }, [branchSlots])

  const afternoonTimes = useMemo(() => {
    const defaultAfternoon = [
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
      '19:30',
      '20:00',
      '20:30',
    ]
    const timesFromApi = Array.from(
      new Set(
        branchSlots
          .map((s) => s.slot_time)
          .filter((t) => {
            const h = parseInt(t.split(':')[0], 10)
            return h >= 12
          }),
      ),
    ).sort()
    return timesFromApi.length > 0 ? timesFromApi : defaultAfternoon
  }, [branchSlots])

  // Điều hướng cửa sổ 3 ngày (không cho lùi về ngày trước hôm nay)
  const isPrevDisabled = !dayjs(startDateStr).isAfter(dayjs().startOf('day'))
  const handlePrev = () => {
    if (!isPrevDisabled) {
      setStartDateStr(dayjs(startDateStr).subtract(3, 'day').format('YYYY-MM-DD'))
    }
  }

  const handleNext = () => {
    setStartDateStr(dayjs(startDateStr).add(3, 'day').format('YYYY-MM-DD'))
  }

  // Render một hàng slot (hàng khung giờ và 3 ô của 3 ngày)
  const renderSlotRow = (time: string) => {
    // Kiểm tra xem trong 3 ngày có ô nào đang được chọn tại giờ này không
    const isRowChecked = dates.some((d) => {
      const slot = slotMap.get(`${d.dateStr}_${time}`)
      return slot && slot.slot_id === selectedSlotId && orderDate === d.dateStr
    })

    return (
      <div key={time} className="slot-row">
        <input
          type="checkbox"
          readOnly
          checked={isRowChecked}
          style={{ cursor: 'pointer' }}
        />
        <b>{time}</b>
        {dates.map((d) => {
          const slot = slotMap.get(`${d.dateStr}_${time}`)
          if (!slot) {
            return (
              <span
                key={d.dateStr}
                style={{ color: '#cbd5e1', fontSize: '11px', textAlign: 'center' }}
              >
                —
              </span>
            )
          }

          const conTrong = slot.con_trong ?? 0
          const isAvailable = conTrong > 0 && !slot.is_expired && !slot.is_inactive
          const isChosen = selectedSlotId === slot.slot_id && orderDate === d.dateStr

          return (
            <button
              key={d.dateStr}
              type="button"
              disabled={!isAvailable}
              className={clsx('slot-count', {
                available: isAvailable,
              })}
              style={{
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: slot.is_expired ? 0.45 : 1,
                border: 'none',
                outline: isChosen ? '2px solid #2563eb' : 'none',
                outlineOffset: '1px',
                transform: isChosen ? 'scale(1.15)' : 'none',
                transition: 'all 0.15s ease',
              }}
              onClick={() => {
                if (isAvailable) {
                  onSelectSlot(slot.slot_id, slot.slot_time, d.dateStr)
                  onDateChange(d.dateStr)
                }
              }}
              title={
                slot.is_expired
                  ? 'Ca đã quá giờ hẹn hôm nay'
                  : isAvailable
                    ? `Ngày ${d.displayDate} lúc ${time}: Còn ${conTrong} chỗ (Bấm để chọn)`
                    : `Ngày ${d.displayDate} lúc ${time}: Hết chỗ`
              }
            >
              {conTrong}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <section className="call-panel schedule-panel">
      {/* Tiêu đề Lịch hẹn chi nhánh */}
      <div className="call-panel-heading">
        <div>
          <p className="eyebrow">LỊCH HẸN CHI NHÁNH</p>
          <h2>{branchName || 'Trụ sở Hà Nội'}</h2>
        </div>
      </div>

      {/* Thanh điều hướng 3 ngày liên tiếp */}
      <div className="week-control">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          style={{
            cursor: isPrevDisabled ? 'not-allowed' : 'pointer',
            opacity: isPrevDisabled ? 0.35 : 1,
          }}
          title="3 ngày trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600 }}>{rangeLabel}</span>
        <button
          type="button"
          onClick={handleNext}
          style={{ cursor: 'pointer' }}
          title="3 ngày tiếp theo"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Tiêu đề các cột trong bảng */}
      <div className="slot-header">
        <span></span>
        <span>Giờ</span>
        {dates.map((d) => (
          <span key={d.dateStr}>
            {d.dayOfWeek} <small>{d.displayDate}</small>
          </span>
        ))}
      </div>

      {/* Bảng ma trận slot theo mẫu ban đầu */}
      <div style={{ paddingBottom: '12px' }}>
        {isLoading && branchSlots.length === 0 ? (
          <p
            style={{
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '11px',
              padding: '24px 0',
            }}
          >
            Đang tải dữ liệu ca hẹn...
          </p>
        ) : (
          <>
            {/* Nhóm CA SÁNG */}
            <div className="slot-section">CA SÁNG</div>
            {morningTimes.map((time) => renderSlotRow(time))}

            {/* Nhóm CA CHIỀU */}
            <div className="slot-section afternoon">CA CHIỀU</div>
            {afternoonTimes.map((time) => renderSlotRow(time))}
          </>
        )}
      </div>
    </section>
  )
}
