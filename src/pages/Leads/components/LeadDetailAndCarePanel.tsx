import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
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
import { useCampaigns } from '../../../hooks/useTelesale'
import { useBranchSlots } from '../../../hooks/useOrders'
import { useMakeCall } from '../../../hooks/useMakeCall'
import { useAuthStore } from '../../../store/useAuthStore'
import { CallActionControl } from '../../../components/common/CallActionControl'
import { useEnums } from '../../../hooks/useEnums'
import { BranchSlotDto } from '../../../types/api'
import { DialogState } from '../../../types'
import { formatDate, formatVND } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'
import { generateIdempotencyKey } from '../../../services/apiClient'
import dayjs from '../../../lib/dayjs'

export const careOutcomes: {
  key: 'consulting' | 'scheduled' | 'closed' | 'no_need' | 'unreachable'
  label: string
  icon: any
  tone: string
}[] = [
    { key: 'consulting', label: 'Đang tư vấn', icon: Phone, tone: 'blue' },
    { key: 'scheduled', label: 'Đã hẹn lịch', icon: CalendarCheck, tone: 'green' },
    { key: 'closed', label: 'Đã chốt', icon: ShoppingCart, tone: 'green' },
    { key: 'no_need', label: 'Chưa có nhu cầu', icon: Voicemail, tone: 'gray' },
    { key: 'unreachable', label: 'Không liên lạc được', icon: CircleX, tone: 'purple' },
  ]

export interface LeadDetailAndCarePanelProps {
  customerId: number | null
  onOpenDialog?: (dialog: DialogState) => void
}

export const LeadDetailAndCarePanel: React.FC<LeadDetailAndCarePanelProps> = ({
  customerId,
  onOpenDialog: _onOpenDialog,
}) => {
  const { data: customerDetail } = useCustomerDetail(customerId || undefined)
  const saveCareLogMutation = useSaveCareLogMutation()
  const { data: campaignsData } = useCampaigns()
  const userBranchId = useAuthStore((s) => s.user?.branchId)
  const { services: serviceOptions = [] } = useEnums()
  const { makeCall, isDialing } = useMakeCall()
  const [selectedMemberId, setSelectedMemberId] = useState<number | undefined>(undefined)

  // Trích xuất danh sách các chi nhánh khả dụng từ chiến dịch, fallback theo chi nhánh của nhân viên
  const availableBranches = useMemo(() => {
    const map = new Map<number, string>()
    const list = campaignsData?.items || []
    list.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        map.set(c.branch_id, c.branch_name)
      }
    })
    if (userBranchId) {
      if (!map.has(userBranchId)) {
        map.set(userBranchId, `Chi nhánh #${userBranchId}`)
      }
    }
    if (map.size === 0) {
      map.set(3, 'Trụ sở Hà Nội')
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [campaignsData, userBranchId])

  const [outcome, setOutcome] = useState<'consulting' | 'scheduled' | 'closed' | 'no_need' | 'unreachable'>('consulting')
  const [nextCareDate, setNextCareDate] = useState('')
  const [nextCareTime, setNextCareTime] = useState('')
  const [note, setNote] = useState('')

  // Các trường phục vụ chốt đơn (closed) tạo đơn hàng trên ERP
  const [selectedBranchId, setSelectedBranchId] = useState<number>(() => userBranchId || 3)
  const [selectedSlotId, setSelectedSlotId] = useState<number | undefined>(undefined)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [serviceSearch, setServiceSearch] = useState('')

  // Tra cứu danh sách Slot ca hẹn KTV của Chi nhánh khi chốt đơn
  const querySlotDate = outcome === 'closed' && nextCareDate ? nextCareDate : undefined
  const { data: rawSlots = [], isLoading: isLoadingSlots } = useBranchSlots(
    selectedBranchId,
    querySlotDate,
    querySlotDate,
    { enabled: outcome === 'closed' && Boolean(nextCareDate) },
  )

  const branchSlots: BranchSlotDto[] = useMemo(() => {
    if (Array.isArray(rawSlots)) return rawSlots
    if (Array.isArray((rawSlots as any)?.items)) return (rawSlots as any).items
    return []
  }, [rawSlots])

  const filteredServices = useMemo(() => {
    if (!serviceOptions) return []
    if (!serviceSearch.trim()) return serviceOptions
    const query = serviceSearch.toLowerCase().trim()
    return serviceOptions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query),
    )
  }, [serviceOptions, serviceSearch])

  // Đồng bộ selectedBranchId nếu danh sách chi nhánh khả dụng thay đổi và giá trị hiện tại không thuộc danh sách
  useEffect(() => {
    if (availableBranches.length > 0) {
      const exists = availableBranches.some((b) => b.id === selectedBranchId)
      if (!exists) {
        setSelectedBranchId(availableBranches[0].id)
      }
    }
  }, [availableBranches, selectedBranchId])

  // Khóa chống double-click và quản lý Idempotency-Key
  const isSubmittingCareRef = useRef(false)
  const currentCareKeyRef = useRef<string>(generateIdempotencyKey())

  useEffect(() => {
    currentCareKeyRef.current = generateIdempotencyKey()
    setSelectedServices([])
    setServiceSearch('')
    setSelectedSlotId(undefined)
  }, [customerId])

  // Cập nhật form khi thông tin chi tiết khách hàng thay đổi
  useEffect(() => {
    if (customerDetail) {
      if (customerDetail.members && customerDetail.members.length > 0) {
        setSelectedMemberId(customerDetail.members[0].member_id)
      } else {
        setSelectedMemberId(undefined)
      }
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

    // 1. Ràng buộc Lịch hẹn (next_care_at): Bắt buộc khi 'consulting', 'scheduled'
    const isAppointmentRequired = ['consulting', 'scheduled'].includes(outcome)
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

    // 3. Ràng buộc khi Chốt đơn ('closed'): Bắt buộc ngày hẹn triển khai kỹ thuật, chi nhánh, giờ hẹn/ca hẹn và dịch vụ
    if (outcome === 'closed') {
      if (!nextCareDate) {
        notify('Vui lòng chọn Ngày hẹn triển khai kỹ thuật để tạo đơn hàng.')
        return
      }
      if (dayjs(nextCareDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
      if (!selectedBranchId) {
        notify('Vui lòng chọn Chi nhánh thực hiện đơn hàng.')
        return
      }
      if (!nextCareTime && !selectedSlotId) {
        notify('Vui lòng chọn ca hẹn (slot) hoặc nhập giờ hẹn triển khai.')
        return
      }
      if (selectedServices.length === 0) {
        notify('Vui lòng chọn ít nhất một dịch vụ khi chốt đơn.')
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
          slot_id: outcome === 'closed' ? selectedSlotId : undefined,
          branch_id: outcome === 'closed' ? selectedBranchId : undefined,
          services: outcome === 'closed' ? selectedServices : undefined,
          idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
        },
        idempotencyKey: outcome === 'closed' ? currentCareKeyRef.current : undefined,
      })

      if (outcome === 'closed') {
        setSelectedServices([])
        setSelectedSlotId(undefined)
        setServiceSearch('')
        currentCareKeyRef.current = generateIdempotencyKey()
        notify('Đã tạo đơn hàng thành công trên hệ thống ERP!')
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

  const handleCallLead = async (overrideMemberId?: number) => {
    if (!customerDetail) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }

    const targetMemberId =
      overrideMemberId || selectedMemberId || customerDetail.members?.[0]?.member_id
    const targetMember = customerDetail.members?.find((m) => m.member_id === targetMemberId)

    await makeCall({
      customerId: customerDetail.customer_id,
      customerName: customerDetail.customer_name,
      memberId: targetMemberId,
      memberName: targetMember?.name,
      customer: customerDetail,
    })
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', margin: 0 }}>
                Thành viên liên hệ ({customerDetail.members.length}):
              </p>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>Bấm để chọn người nhận</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {customerDetail.members.map((m) => {
                const isSelected = selectedMemberId === m.member_id
                return (
                  <div
                    key={m.member_id}
                    onClick={() => setSelectedMemberId(m.member_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: isSelected ? '#eff6ff' : '#f8fafc',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #3b82f6' : '1px solid #eef2f6',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontSize: '11px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: isSelected ? '#1d4ed8' : '#1e293b' }}>{m.name}</strong>
                        {isSelected && (
                          <span
                            style={{
                              fontSize: '9px',
                              background: '#3b82f6',
                              color: '#fff',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            Đang chọn
                          </span>
                        )}
                        {m.relationship && (
                          <span style={{ color: '#64748b', fontSize: '10px' }}>
                            ({m.relationship})
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#0284c7', fontSize: '10px', fontWeight: 500, marginTop: '2px' }}>
                        {m.phone_masked}
                      </div>
                    </div>

                    <button
                      type="button"
                      title={`Gọi cho ${m.name}`}
                      disabled={isDialing}
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMemberId(m.member_id)
                        handleCallLead(m.member_id)
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: 'none',
                        background: isSelected ? '#2563eb' : '#e0e7ff',
                        color: isSelected ? '#ffffff' : '#4338ca',
                        cursor: isDialing ? 'not-allowed' : 'pointer',
                        opacity: isDialing ? 0.6 : 1,
                        transition: 'background 0.2s',
                      }}
                    >
                      <Phone size={13} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <CallActionControl
          customerId={customerDetail?.customer_id || 0}
          customerName={customerDetail?.customer_name}
          memberId={selectedMemberId}
          memberName={customerDetail?.members?.find((m) => m.member_id === selectedMemberId)?.name}
          customerData={customerDetail}
          buttonText="Gọi khách hàng"
          disabled={!customerDetail}
        />
      </section>

      {/* 2. CẬP NHẬT CHĂM SÓC KHÁCH HÀNG */}
      <section className="call-panel care-form">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">CẬP NHẬT</p>
            <h2>Chăm sóc khách hàng</h2>
          </div>
        </div>

        <p className="result-label">Kết quả chăm sóc</p>
        <div className="result-grid lead-outcomes">
          {careOutcomes.map(({ key, label, icon: Icon, tone }) => (
            <button
              key={key}
              type="button"
              className={clsx(tone, { chosen: outcome === key })}
              style={key === 'unreachable' ? { gridColumn: 'span 2' } : undefined}
              onClick={() => {
                setOutcome(key)
                if (key === 'closed' && !nextCareDate) {
                  setNextCareDate(dayjs().format('YYYY-MM-DD'))
                }
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </div>

        <div className="appointment-fields">
          <label>
            <span>
              Ngày hẹn{' '}
              {['consulting', 'scheduled', 'closed'].includes(outcome) && (
                <b style={{ color: '#e11d48' }}>*</b>
              )}
            </span>
            <span>
              <CalendarDays size={15} />
              <input
                type="date"
                value={nextCareDate}
                onChange={(e) => {
                  setNextCareDate(e.target.value)
                  setSelectedSlotId(undefined)
                }}
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
                onChange={(e) => {
                  setNextCareTime(e.target.value)
                  if (selectedSlotId) {
                    const match = branchSlots.find((s) => s.slot_id === selectedSlotId)
                    if (match && match.slot_time !== e.target.value) {
                      setSelectedSlotId(undefined)
                    }
                  }
                }}
              />
              <ChevronDown size={14} />
            </span>
          </label>
        </div>

        {/* Khối cấu hình đơn hàng ERP khi chọn 'Đã chốt' (closed) */}
        {outcome === 'closed' && (
          <div
            style={{
              margin: '12px 0',
              padding: '12px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Tiêu đề khối */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#c2410c',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              <ShoppingCart size={15} />
              <span>THIẾT LẬP ĐƠN HÀNG CHỐT (ERP)</span>
            </div>

            {/* Chọn Chi nhánh */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginBottom: '5px',
                }}
              >
                <Building2 size={13} style={{ color: '#2563eb' }} />
                Chi nhánh thực hiện đơn hàng <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              {availableBranches && availableBranches.length > 1 ? (
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(Number(e.target.value))
                    setSelectedSlotId(undefined)
                  }}
                  style={{
                    width: '100%',
                    height: '35px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0 10px',
                    fontSize: '12px',
                    color: '#0f172a',
                    background: '#fff',
                    fontWeight: 600,
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
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1e293b',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '7px 10px',
                  }}
                >
                  {availableBranches[0]?.name || `Chi nhánh #${selectedBranchId}`}
                </div>
              )}
            </div>

            {/* Khung giờ / Ca KTV còn trống */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                }}
              >
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Clock3 size={13} style={{ color: '#2563eb' }} />
                  Khung giờ / Ca KTV còn trống <b style={{ color: '#e11d48' }}>*</b>:
                </label>
                {selectedSlotId && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#166534',
                      background: '#dcfce7',
                      border: '1px solid #bbf7d0',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}
                  >
                    ĐÃ KHỚP SLOT #{selectedSlotId}
                  </span>
                )}
              </div>

              {!nextCareDate ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    background: '#fff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  Vui lòng chọn Ngày hẹn ở trên để tải danh sách ca KTV còn trống
                </div>
              ) : isLoadingSlots ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  Đang kiểm tra ca hẹn của chi nhánh...
                </div>
              ) : branchSlots.length === 0 ? (
                <div
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    background: '#fff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    textAlign: 'center',
                  }}
                >
                  Chi nhánh không có ca hẹn cố định trong ngày {dayjs(nextCareDate).format('DD/MM/YYYY')}. Bạn có thể tự nhập giờ hẹn lẻ ở ô Giờ hẹn phía trên.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
                    gap: '6px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                    padding: '2px',
                  }}
                >
                  {branchSlots.map((slot) => {
                    const isAvailable = slot.con_trong > 0 && !slot.is_expired && !slot.is_inactive
                    const isSelected = selectedSlotId === slot.slot_id
                    return (
                      <button
                        key={slot.slot_id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSlotId(undefined)
                          } else {
                            setSelectedSlotId(slot.slot_id)
                            setNextCareTime(slot.slot_time)
                          }
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: isSelected
                            ? '#16a34a'
                            : isAvailable
                              ? '#86efac'
                              : '#e2e8f0',
                          background: isSelected
                            ? '#dcfce7'
                            : isAvailable
                              ? '#f0fdf4'
                              : '#f1f5f9',
                          color: isSelected
                            ? '#14532d'
                            : isAvailable
                              ? '#15803d'
                              : '#94a3b8',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          opacity: isAvailable ? 1 : 0.65,
                          transition: 'all 0.15s ease',
                          outline: 'none',
                        }}
                        title={
                          isAvailable
                            ? `Ca ${slot.slot_time} - Còn ${slot.con_trong} chỗ`
                            : slot.is_expired
                              ? `Ca ${slot.slot_time} - Đã qua giờ hẹn`
                              : `Ca ${slot.slot_time} - Đã hết ca KTV`
                        }
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 600,
                            letterSpacing: '0.2px',
                          }}
                        >
                          {slot.slot_time}
                        </span>
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 500,
                            marginTop: '2px',
                            color: isSelected
                              ? '#166534'
                              : isAvailable
                                ? '#15803d'
                                : '#ef4444',
                          }}
                        >
                          {isAvailable ? `Còn ${slot.con_trong}` : slot.is_expired ? 'Quá giờ' : 'Hết chỗ'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Chọn Gói dịch vụ */}
            <div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Gói dịch vụ ({selectedServices.length} đã chọn){' '}
                <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="🔍 Tìm nhanh gói dịch vụ hoặc lõi lọc..."
                style={{
                  width: '100%',
                  height: '32px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                  marginBottom: '6px',
                  boxSizing: 'border-box',
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gap: '5px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {filteredServices.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#94a3b8', padding: '6px' }}>
                    Không tìm thấy gói dịch vụ phù hợp
                  </div>
                ) : (
                  filteredServices.map((srv) => {
                    const isSelected = selectedServices.includes(srv.code)
                    return (
                      <label
                        key={srv.code}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          border: '1px solid',
                          borderColor: isSelected ? '#86efac' : '#e2e8f0',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          background: isSelected ? '#f0fdf4' : '#fff',
                          userSelect: 'none',
                        }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            style={{
                              width: '14px',
                              height: '14px',
                              accentColor: '#16a34a',
                              cursor: 'pointer',
                            }}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedServices([...selectedServices, srv.code])
                              } else {
                                setSelectedServices(
                                  selectedServices.filter((s) => s !== srv.code),
                                )
                              }
                            }}
                          />
                          <span
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontSize: '11px',
                              color: isSelected ? '#166534' : '#1e293b',
                              fontWeight: isSelected ? 600 : 400,
                            }}
                            title={srv.label}
                          >
                            {srv.label}
                          </span>
                        </span>
                        {srv.price ? (
                          <b
                            style={{
                              whiteSpace: 'nowrap',
                              marginLeft: '8px',
                              fontSize: '11px',
                              color: '#0f172a',
                            }}
                          >
                            {formatVND(srv.price)}
                          </b>
                        ) : null}
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

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
