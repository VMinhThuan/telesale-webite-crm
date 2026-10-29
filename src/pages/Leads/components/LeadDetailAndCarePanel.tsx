import React, { useEffect, useRef, useState } from 'react'
import {
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleX,
  Clock3,
  MapPin,
  MoreHorizontal,
  Phone,
  Save,
  ShieldCheck,
  ShoppingCart,
  Timer,
  UserRound,
  Voicemail,
} from 'lucide-react'
import clsx from 'clsx'
import { useCustomerDetail, useSaveCareLogMutation } from '../../../hooks/useCustomers'
import { DialogState } from '../../../types'
import { formatDate } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'
import { generateIdempotencyKey } from '../../../services/apiClient'
import dayjs from '../../../lib/dayjs'

export const careOutcomes: {
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

export interface LeadDetailAndCarePanelProps {
  customerId: number | null
  onOpenDialog?: (dialog: DialogState) => void
}

export const LeadDetailAndCarePanel: React.FC<LeadDetailAndCarePanelProps> = ({
  customerId,
  onOpenDialog,
}) => {
  const { data: customerDetail } = useCustomerDetail(customerId || undefined)
  const saveCareLogMutation = useSaveCareLogMutation()

  const [outcome, setOutcome] = useState<'consulting' | 'scheduled' | 'closed' | 'callback' | 'no_need' | 'unreachable'>('consulting')
  const [nextCareDate, setNextCareDate] = useState('')
  const [nextCareTime, setNextCareTime] = useState('')
  const [note, setNote] = useState('')

  // Khóa chống double-click và quản lý Idempotency-Key
  const isSubmittingCareRef = useRef(false)
  const currentCareKeyRef = useRef<string>(generateIdempotencyKey())

  useEffect(() => {
    currentCareKeyRef.current = generateIdempotencyKey()
  }, [customerId])

  // Cập nhật form khi thông tin chi tiết khách hàng thay đổi
  useEffect(() => {
    if (customerDetail) {
      setNote(customerDetail.note || '')
      if (customerDetail.next_care_at) {
        const d = dayjs(customerDetail.next_care_at)
        if (d.isValid() && d.year() >= 1970 && d.year() <= 2100) {
          const parts = customerDetail.next_care_at.split(' ')
          if (parts[0]) setNextCareDate(parts[0])
          if (parts[1]) setNextCareTime(parts[1].slice(0, 5))
        } else {
          setNextCareDate('')
          setNextCareTime('')
        }
      } else {
        setNextCareDate('')
        setNextCareTime('')
      }
    }
  }, [customerDetail])

  const handleSaveCare = async () => {
    if (isSubmittingCareRef.current) return

    if (!customerId) {
      notify('Vui lòng chọn khách hàng cần cập nhật')
      return
    }

    // 1. Ràng buộc Lịch hẹn (next_care_at): Bắt buộc khi 'consulting', 'callback', 'scheduled'
    const isAppointmentRequired = ['consulting', 'callback', 'scheduled'].includes(outcome)
    if (isAppointmentRequired) {
      if (!nextCareDate) {
        notify('Vui lòng chọn Ngày hẹn cho khách hàng (bắt buộc với kết quả này).')
        return
      }
      if (dayjs(nextCareDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
    }

    // 2. Ràng buộc Lý do từ chối (denied_note): Bắt buộc khi 'no_need'
    if (outcome === 'no_need') {
      if (!note.trim()) {
        notify('Vui lòng nhập lý do khách chưa có nhu cầu / từ chối vào ô Ghi chú.')
        return
      }
    }

    // 3. Ràng buộc khi Chốt đơn ('closed'): Bắt buộc ngày hẹn triển khai kỹ thuật
    if (outcome === 'closed') {
      if (!nextCareDate) {
        notify('Vui lòng chọn Ngày hẹn triển khai kỹ thuật để tạo đơn hàng.')
        return
      }
    }

    isSubmittingCareRef.current = true

    try {
      const nextCareAtFormatted = nextCareDate
        ? `${nextCareDate} ${nextCareTime || '09:00'}:00`
        : undefined

      await saveCareLogMutation.mutateAsync({
        customerId,
        payload: {
          result: outcome,
          next_care_at: isAppointmentRequired || outcome === 'closed' ? nextCareAtFormatted : undefined,
          note: note.trim() || undefined,
          denied_note: outcome === 'no_need' ? note.trim() : undefined,
          ngay_hen_khach: outcome === 'closed' ? nextCareDate : undefined,
          gio_hen_khach: outcome === 'closed' ? (nextCareTime || '09:00') : undefined,
          idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
        },
        idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
      })

      if (outcome === 'closed') {
        currentCareKeyRef.current = generateIdempotencyKey()
      }
    } catch (err: any) {
      if (err?.status === 409) {
        notify('Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.')
      } else if (err?.status === 422) {
        notify(err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.')
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

  return (
    <>
      {/* 1. HỒ SƠ KHÁCH HÀNG */}
      <section className="call-panel lead-detail">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => notify(`Mã KH: ${customerDetail?.customer_code || '—'}`)}
            title="Tùy chọn khách hàng"
          >
            <MoreHorizontal size={19} />
          </button>
        </div>

        <div className="customer-brief lead-brief">
          <div className="customer-avatar small">
            <UserRound size={26} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{customerDetail?.customer_name || 'Đang tải...'}</h3>
            <p>
              <Phone size={13} /> {customerDetail?.phone_masked || '—'}
            </p>
            <p>
              <MapPin size={13} />{' '}
              {customerDetail?.dia_chi ||
                `${customerDetail?.district || ''} · ${customerDetail?.province || ''}`}
            </p>
            {customerDetail?.customer_status_reason && (
              <div style={{ marginTop: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#0369a1',
                    background: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    borderRadius: '12px',
                    padding: '2px 8px',
                  }}
                >
                  <ShieldCheck size={13} />
                  {customerDetail.customer_status_reason}
                </span>
              </div>
            )}
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
          {customerDetail?.customer_status_reason && (
            <span>
              Lý do phân loại{' '}
              <b style={{ color: '#0284c7' }}>
                {customerDetail.customer_status_reason}
              </b>
            </span>
          )}
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

        {/* Danh sách thành viên gia đình / liên hệ */}
        {customerDetail?.members && customerDetail.members.length > 0 && (
          <div style={{ margin: '12px 16px 0', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Thành viên liên hệ ({customerDetail.members.length}):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {customerDetail.members.map((m) => (
                <div
                  key={m.member_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #eef2f6',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <strong style={{ color: '#1e293b' }}>{m.name}</strong>
                    {m.relationship && (
                      <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '10px' }}>
                        ({m.relationship})
                      </span>
                    )}
                    <div style={{ color: '#0284c7', fontSize: '10px', fontWeight: 500 }}>
                      {m.phone_masked}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="contact-button" onClick={handleCallLead} type="button">
          <Phone size={18} /> Gọi khách hàng
        </button>
      </section>

      {/* 2. CẬP NHẬT CHĂM SÓC KHÁCH HÀNG */}
      <section className="call-panel care-form">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">CẬP NHẬT</p>
            <h2>Chăm sóc khách hàng</h2>
          </div>
        </div>

        <div className="appointment-fields">
          <label>
            <span>
              Ngày hẹn{' '}
              {['consulting', 'callback', 'scheduled', 'closed'].includes(outcome) && (
                <b style={{ color: '#e11d48' }}>*</b>
              )}
            </span>
            <span>
              <CalendarDays size={15} />
              <input
                type="date"
                value={nextCareDate}
                onChange={(e) => setNextCareDate(e.target.value)}
                min={dayjs().format('YYYY-MM-DD')}
              />
              <ChevronDown size={14} />
            </span>
          </label>
          <label>
            <span>Giờ hẹn</span>
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
          {outcome === 'no_need' ? (
            <span>
              Lý do từ chối <b style={{ color: '#e11d48' }}>*</b>
            </span>
          ) : (
            'Ghi chú'
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              outcome === 'no_need'
                ? 'Nhập lý do khách chưa có nhu cầu / từ chối (bắt buộc để ERP xử lý)...'
                : 'Nhập ghi chú chi tiết lần chăm sóc...'
            }
            style={{
              borderColor: outcome === 'no_need' && !note.trim() ? '#fda4af' : undefined,
            }}
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
    </>
  )
}

export default LeadDetailAndCarePanel
