import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit2,
  MapPin,
  RotateCcw,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import dayjs from '../../../lib/dayjs'
import { useBranchSlots } from '../../../hooks/useOrders'
import { BranchSlotDto, ErpSource } from '../../../types/api'

export interface TelesaleScheduleBranchItem {
  key: string
  id: number
  name: string
  source_erp: ErpSource
}

export interface TelesaleSchedulePanelProps {
  branchName?: string
  branchId: number
  availableBranches?: TelesaleScheduleBranchItem[]
  currentBranchKey?: string
  campaignBranchKey?: string
  campaignBranchName?: string
  branchAddress?: string
  isAdmin?: boolean
  onBranchChange?: (branchId: number, source_erp?: ErpSource) => void
  onResetToCampaignBranch?: () => void
  onUpdateAddress?: (newAddress: string) => Promise<void> | void
  orderDate: string
  onDateChange: (date: string) => void
  selectedSlotId?: number
  onSelectSlot: (slotId: number, slotTime: string, date?: string) => void
  source_erp?: ErpSource
}

export const TelesaleSchedulePanel: React.FC<TelesaleSchedulePanelProps> = ({
  branchName,
  branchId,
  availableBranches = [],
  currentBranchKey,
  campaignBranchKey,
  campaignBranchName,
  branchAddress,
  isAdmin,
  onBranchChange,
  onResetToCampaignBranch,
  onUpdateAddress,
  orderDate,
  onDateChange,
  selectedSlotId,
  onSelectSlot,
  source_erp,
}) => {
  // Trạng thái mở menu dropdown chi nhánh
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Trạng thái chỉnh sửa địa chỉ inline của Admin
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [editingAddressValue, setEditingAddressValue] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Xác định xem tab này có đang chọn một chi nhánh khác chi nhánh gốc của chiến dịch không
  const isDifferentFromCampaign = Boolean(
    campaignBranchKey && currentBranchKey && currentBranchKey !== campaignBranchKey,
  )

  // Chi nhánh gốc của chiến dịch
  const campaignBranch = useMemo(() => {
    if (!campaignBranchKey || !availableBranches.length) return null
    return availableBranches.find((b) => b.key === campaignBranchKey) || null
  }, [campaignBranchKey, availableBranches])

  // Xử lý lưu địa chỉ inline
  const handleSaveAddress = async () => {
    if (!onUpdateAddress) return
    setIsSavingAddress(true)
    try {
      await onUpdateAddress(editingAddressValue)
      setIsEditingAddress(false)
    } finally {
      setIsSavingAddress(false)
    }
  }
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

  // Gọi API lấy toàn bộ slot của cả 3 ngày liên tiếp theo đúng nguồn ERP của chiến dịch
  const fromDate = dates[0].dateStr
  const toDate = dates[2].dateStr
  const { data: rawSlots = [], isLoading } = useBranchSlots(branchId, fromDate, toDate, {
    source_erp,
  })

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
      <div className="call-panel-heading" style={{ position: 'relative', paddingBottom: '8px' }}>
        <div style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <p className="eyebrow" style={{ margin: 0 }}>LỊCH HẸN CHI NHÁNH</p>
            {isDifferentFromCampaign && onResetToCampaignBranch && (
              <button
                type="button"
                onClick={onResetToCampaignBranch}
                title={`Khôi phục về chi nhánh gốc của chiến dịch: ${campaignBranchName || 'Chi nhánh gốc'}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <RotateCcw size={11} />
                <span>Về {campaignBranchName || 'Gốc'}</span>
              </button>
            )}
          </div>

          {/* Tên chi nhánh dạng Dropdown linh hoạt */}
          <div style={{ position: 'relative', width: '100%' }} ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                width: '100%',
                background: isDifferentFromCampaign ? '#fffbeb' : '#f8fafc',
                border: isDifferentFromCampaign ? '1px solid #fde68a' : '1px solid #e2e8f0',
                borderRadius: '7px',
                padding: '5px 8px',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isDifferentFromCampaign ? '0 1px 2px rgba(245, 158, 11, 0.1)' : 'none',
              }}
              title="Nhấn để chọn hiển thị slot của chi nhánh khác"
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <Building2 size={14} style={{ color: isDifferentFromCampaign ? '#d97706' : '#2563eb', flexShrink: 0 }} />
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: '13px',
                    color: isDifferentFromCampaign ? '#b45309' : '#0f172a',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {branchName || 'Chi nhánh'}
                </span>
                {isDifferentFromCampaign && (
                  <span
                    style={{
                      fontSize: '9.5px',
                      background: '#fef3c7',
                      color: '#b45309',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    Tùy chọn
                  </span>
                )}
              </span>
              <ChevronDown
                size={14}
                style={{
                  color: '#64748b',
                  flexShrink: 0,
                  transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              />
            </button>

            {/* Menu Dropdown danh sách chi nhánh */}
            {isMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  width: '100%',
                  minWidth: '270px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
                  zIndex: 80,
                  padding: '6px',
                }}
              >
                {/* 1. Chi nhánh gốc của chiến dịch (Ghim dòng 1) */}
                {campaignBranch && (
                  <>
                    <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Chi nhánh gốc chiến dịch
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onBranchChange?.(campaignBranch.id, campaignBranch.source_erp)
                        setIsMenuOpen(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        background: currentBranchKey === campaignBranch.key ? '#eff6ff' : 'transparent',
                        color: currentBranchKey === campaignBranch.key ? '#1d4ed8' : '#1e293b',
                        fontWeight: currentBranchKey === campaignBranch.key ? 700 : 500,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} style={{ color: '#2563eb' }} />
                        <span>{campaignBranch.name}</span>
                      </div>
                      <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>
                        Gốc
                      </span>
                    </button>
                    <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }} />
                  </>
                )}

                {/* 2. Danh sách các chi nhánh khác */}
                <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Các chi nhánh khác ({availableBranches.filter((b) => b.key !== campaignBranchKey).length})
                </div>
                {availableBranches
                  .filter((b) => b.key !== campaignBranchKey)
                  .map((b) => {
                    const isSelected = currentBranchKey === b.key
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => {
                          onBranchChange?.(b.id, b.source_erp)
                          setIsMenuOpen(false)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isSelected ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#1d4ed8' : '#334155',
                          fontWeight: isSelected ? 700 : 400,
                          fontSize: '11px',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} style={{ color: isSelected ? '#2563eb' : '#94a3b8' }} />
                          <span>{b.name}</span>
                        </div>
                        <span style={{ fontSize: '9.5px', color: '#64748b' }}>
                          {b.source_erp === 'zomzem' ? 'Zomzem' : 'LN365'}
                        </span>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Dòng hiển thị địa chỉ chi nhánh + Nút sửa inline của Admin */}
          <div style={{ marginTop: '5px', fontSize: '11px', color: '#64748b', minHeight: '22px', display: 'flex', alignItems: 'center' }}>
            {isEditingAddress ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                <input
                  type="text"
                  value={editingAddressValue}
                  onChange={(e) => setEditingAddressValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveAddress()
                    if (e.key === 'Escape') setIsEditingAddress(false)
                  }}
                  placeholder="Nhập địa chỉ chi nhánh..."
                  autoFocus
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid #3b82f6',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  style={{
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '3px 7px',
                    fontSize: '10.5px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {isSavingAddress ? '...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(false)}
                  style={{
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#64748b',
                    borderRadius: '4px',
                    padding: '3px 6px',
                    fontSize: '10.5px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', width: '100%' }}>
                <span
                  title={branchAddress || 'Chưa cập nhật địa chỉ'}
                  style={{
                    flex: 1,
                    color: branchAddress ? '#475569' : '#94a3b8',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.35,
                    fontSize: '11px',
                  }}
                >
                  📍 {branchAddress || 'Chưa cập nhật địa chỉ'}
                </span>
                {isAdmin && onUpdateAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddressValue(branchAddress || '')
                      setIsEditingAddress(true)
                    }}
                    title="Chỉnh sửa địa chỉ chi nhánh này (Admin)"
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#2563eb',
                      cursor: 'pointer',
                      padding: '1px 3px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    <Edit2 size={11} />
                  </button>
                )}
              </div>
            )}
          </div>
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
