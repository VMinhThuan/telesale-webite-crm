import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  CircleX,
  Clock3,
  FileText,
  MapPin,
  Phone,
  RotateCw,
  Save,
  ShoppingCart,
  Timer,
  UserRound,
  Users,
  Voicemail,
} from 'lucide-react'
import clsx from 'clsx'
import dayjs from '../../../lib/dayjs'
import { useEnums } from '../../../hooks/useEnums'
import { useSaveCallResultMutation } from '../../../hooks/useTelesale'
import {
  CallResultOutcome,
  NextCustomerDto,
  SaveCallResultPayload,
} from '../../../types/api'
import { generateIdempotencyKey } from '../../../services/apiClient'
import { formatVND } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'

export const resultOptions: {
  key: CallResultOutcome
  label: string
  icon: any
  tone: string
}[] = [
    { key: 'potential', label: 'Khách tiềm năng', icon: Users, tone: 'green' },
    { key: 'closed', label: 'Đã chốt đơn', icon: ShoppingCart, tone: 'blue' },
    { key: 'callback', label: 'Hẹn gọi lại', icon: Timer, tone: 'amber' },
    { key: 'not_interested', label: 'Không nhu cầu', icon: CircleX, tone: 'rose' },
    { key: 'no_answer', label: 'Không nghe máy', icon: Voicemail, tone: 'gray' },
    { key: 'wrong_number', label: 'Sai số', icon: CircleX, tone: 'gray' },
  ]

export interface TelesaleCustomerPanelProps {
  currentCustomer: NextCustomerDto | null
  selectedCampaignName?: string
  branchId: number
  orderDate: string
  onOrderDateChange: (date: string) => void
  orderTime: string
  onOrderTimeChange: (time: string) => void
  orderSlotId?: number
  onFetchNextCustomer: () => void
  onSaveResultSuccess: () => void
}

export const TelesaleCustomerPanel: React.FC<TelesaleCustomerPanelProps> = ({
  currentCustomer,
  selectedCampaignName,
  branchId,
  orderDate,
  onOrderDateChange,
  orderTime,
  onOrderTimeChange,
  orderSlotId,
  onFetchNextCustomer,
  onSaveResultSuccess,
}) => {
  // Lấy dữ liệu danh mục Enums hệ thống
  const {
    services: serviceOptions,
    doCanMang: doCanMangOptions,
    machineProblems: machineProblemOptions,
    moreRequest: moreRequestOptions,
    painPoint: painPointOptions,
    deniedReasons,
  } = useEnums()

  const saveCallResultMutation = useSaveCallResultMutation()

  // Khóa chống double-click tức thời và quản lý Idempotency-Key
  const isSubmittingResultRef = useRef(false)
  const currentOrderKeyRef = useRef<string>(generateIdempotencyKey())

  // Form states cho kết quả cuộc gọi
  const [selectedOutcome, setSelectedOutcome] = useState<CallResultOutcome>('potential')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('14:30')
  const [note, setNote] = useState('')

  // Cây lý do từ chối 3 tầng & Nỗi đau KH
  const [deniedLevel1, setDeniedLevel1] = useState<string>('')
  const [deniedLevel2, setDeniedLevel2] = useState<string>('')
  const [deniedLevel3, setDeniedLevel3] = useState<string>('')
  const [deniedCustomText, setDeniedCustomText] = useState<string>('')
  const [selectedPainPoint, setSelectedPainPoint] = useState<string>('')

  // Các trường khi chốt đơn (closed)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDoCanMang, setSelectedDoCanMang] = useState<string[]>([])
  const [selectedMachineProblem, setSelectedMachineProblem] = useState<string>('')
  const [otherMachineProblem, setOtherMachineProblem] = useState<string>('')
  const [selectedMoreRequest, setSelectedMoreRequest] = useState<string>('')
  const [otherMoreRequest, setOtherMoreRequest] = useState<string>('')
  const [serviceSearch, setServiceSearch] = useState<string>('')

  // Reset form khi chuyển sang khách hàng khác
  useEffect(() => {
    currentOrderKeyRef.current = generateIdempotencyKey()
    setNote('')
    setCallbackDate('')
    setCallbackTime('14:30')
    setSelectedServices([])
    setSelectedDoCanMang([])
    setSelectedMachineProblem('')
    setOtherMachineProblem('')
    setSelectedMoreRequest('')
    setOtherMoreRequest('')
    setDeniedCustomText('')
    setSelectedPainPoint('')
    setServiceSearch('')
  }, [currentCustomer?.customer_id])

  // Xử lý cây lý do từ chối 3 tầng
  const level1Options = useMemo(() => deniedReasons || [], [deniedReasons])
  const selectedL1Node = useMemo(() => {
    return level1Options.find((node) => node.code === deniedLevel1)
  }, [level1Options, deniedLevel1])

  const level2Options = useMemo(() => {
    return selectedL1Node?.children || []
  }, [selectedL1Node])

  const selectedL2Node = useMemo(() => {
    return level2Options.find((node) => node.code === deniedLevel2)
  }, [level2Options, deniedLevel2])

  const level3Options = useMemo(() => {
    return selectedL2Node?.children || []
  }, [selectedL2Node])

  const selectedL3Node = useMemo(() => {
    return level3Options.find((node) => node.code === deniedLevel3)
  }, [level3Options, deniedLevel3])

  const needsTextInput =
    selectedL2Node?.input === 'text' ||
    selectedL3Node?.input === 'text' ||
    deniedLevel2 === 'Out vùng' ||
    deniedLevel2 === 'Khác' ||
    deniedLevel2 === 'Lí do khác'

  // Tự động khởi tạo giá trị mặc định cho tầng từ chối khi danh mục sẵn sàng
  useEffect(() => {
    if (level1Options.length > 0 && !deniedLevel1) {
      const defaultL1 = level1Options[1] || level1Options[0]
      setDeniedLevel1(defaultL1.code)
      if (defaultL1.children && defaultL1.children.length > 0) {
        setDeniedLevel2(defaultL1.children[0].code)
      }
    }
  }, [level1Options, deniedLevel1])

  const handleLevel1Change = (newCode: string) => {
    setDeniedLevel1(newCode)
    const node = level1Options.find((n) => n.code === newCode)
    const firstChild = node?.children?.[0]
    setDeniedLevel2(firstChild ? firstChild.code : '')
    setDeniedLevel3(firstChild?.children?.[0] ? firstChild.children[0].code : '')
    setDeniedCustomText('')
  }

  const handleLevel2Change = (newCode: string) => {
    setDeniedLevel2(newCode)
    const node = level2Options.find((n) => n.code === newCode)
    const firstGrandChild = node?.children?.[0]
    setDeniedLevel3(firstGrandChild ? firstGrandChild.code : '')
    setDeniedCustomText('')
  }

  const handleLevel3Change = (newCode: string) => {
    setDeniedLevel3(newCode)
    setDeniedCustomText('')
  }

  // Danh sách dịch vụ lọc theo ô tìm kiếm
  const filteredServices = useMemo(() => {
    if (!serviceSearch.trim()) return serviceOptions
    const s = serviceSearch.toLowerCase()
    return serviceOptions.filter(
      (srv) =>
        srv.label.toLowerCase().includes(s) ||
        (srv.group && srv.group.toLowerCase().includes(s)) ||
        (srv.description && srv.description.toLowerCase().includes(s)),
    )
  }, [serviceOptions, serviceSearch])

  // Toggle đồ cần mang
  const handleToggleDoCanMang = (itemCode: string) => {
    if (selectedDoCanMang.includes(itemCode)) {
      setSelectedDoCanMang(selectedDoCanMang.filter((c) => c !== itemCode))
    } else {
      setSelectedDoCanMang([...selectedDoCanMang, itemCode])
    }
  }

  // Lưu kết quả cuộc gọi với validation chuẩn API 18
  const handleSaveResult = async () => {
    if (isSubmittingResultRef.current) return

    if (!currentCustomer) {
      notify('Chưa có khách hàng để lưu kết quả')
      return
    }

    const payload: SaveCallResultPayload = {
      result: selectedOutcome,
      note: note.trim() || undefined,
    }

    if (selectedOutcome === 'callback' || selectedOutcome === 'potential') {
      if (!callbackDate) {
        notify('Vui lòng chọn ngày hẹn gọi lại cho khách hàng.')
        return
      }
      if (!callbackTime) {
        notify('Vui lòng chọn giờ hẹn gọi lại.')
        return
      }
      if (dayjs(callbackDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn gọi lại không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
      payload.callback_at = `${callbackDate} ${callbackTime}:00`
    } else if (selectedOutcome === 'not_interested') {
      if (!deniedLevel1) {
        notify('Vui lòng chọn nhóm lý do từ chối (Cấp 1).')
        return
      }
      if (needsTextInput && !deniedCustomText.trim()) {
        notify('Vui lòng nhập chi tiết cụ thể cho lý do từ chối (Out vùng / Khác).')
        return
      }
      payload.denied_note = deniedLevel1
      if (deniedLevel2) {
        payload.sub_denied_note = deniedLevel2
      }
      if (deniedCustomText.trim()) {
        payload.sub_sub_denied_note = deniedCustomText.trim()
      } else if (deniedLevel3) {
        payload.sub_sub_denied_note = deniedLevel3
      }
      if (selectedPainPoint) {
        payload.pain_point = selectedPainPoint
      }
    } else if (selectedOutcome === 'closed') {
      if (!orderDate) {
        notify('Vui lòng chọn ngày hẹn khi chốt đơn.')
        return
      }
      if (dayjs(orderDate).isBefore(dayjs().startOf('day'))) {
        notify('Ngày hẹn đơn hàng không được ở trong quá khứ. Vui lòng chọn từ hôm nay trở đi.')
        return
      }
      if (!orderTime && !orderSlotId) {
        notify('Vui lòng chọn giờ hẹn hoặc ca hẹn khi chốt đơn.')
        return
      }
      if (!branchId) {
        notify('Vui lòng chọn chi nhánh thực hiện đơn hàng.')
        return
      }
      if (selectedServices.length === 0) {
        notify('Vui lòng chọn ít nhất một dịch vụ khi chốt đơn.')
        return
      }
      payload.ngay_hen_khach = orderDate
      payload.gio_hen_khach = orderTime
      payload.slot_id = orderSlotId
      payload.branch_id = branchId
      payload.services = selectedServices
      payload.do_can_mang = selectedDoCanMang
      if (selectedMachineProblem) {
        payload.machine_problem = selectedMachineProblem
        if (selectedMachineProblem === 'Khác' && otherMachineProblem.trim()) {
          payload.other_machine_problem = otherMachineProblem.trim()
        }
      }
      if (selectedMoreRequest) {
        payload.more_request = selectedMoreRequest
        if (selectedMoreRequest === 'Khác' && otherMoreRequest.trim()) {
          payload.other_more_request = otherMoreRequest.trim()
        }
      }
    }

    isSubmittingResultRef.current = true

    try {
      await saveCallResultMutation.mutateAsync({
        customerId: currentCustomer.customer_id,
        payload,
        idempotencyKey: currentOrderKeyRef.current,
      })

      // Làm mới key sau khi lưu thành công
      currentOrderKeyRef.current = generateIdempotencyKey()

      // Gọi callback để thông báo hoàn thành
      onSaveResultSuccess()
    } catch (err: any) {
      if (err?.status === 409) {
        notify('Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.')
      } else if (err?.status === 422) {
        notify(err.message || 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.')
      }
    } finally {
      isSubmittingResultRef.current = false
    }
  }

  return (
    <aside className="right-call-column">
      {/* Khối hồ sơ thông tin khách hàng */}
      <section className="call-panel customer-panel">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p>
            <h2>Thông tin liên hệ</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onFetchNextCustomer}
            title="Đổi sang khách khác"
          >
            <RotateCw size={16} />
          </button>
        </div>

        <div className="customer-brief">
          <div className="customer-avatar small">
            <UserRound size={26} />
          </div>
          <div>
            <h3>{currentCustomer?.customer_name || 'Chưa chọn khách'}</h3>
            <p>
              <Phone size={13} /> {currentCustomer?.members?.[0]?.phone_masked || '—'}
            </p>
            <p>
              <MapPin size={13} /> {currentCustomer?.masked_address || '—'}
            </p>
          </div>
        </div>

        <div className="customer-details">
          <span>
            Mã khách hàng <b>{currentCustomer?.customer_code || '—'}</b>
          </span>
          <span>
            Chiến dịch <b>{selectedCampaignName || 'Mặc định'}</b>
          </span>
          <span>
            Khóa thông tin chi tiết <b>{currentCustomer?.lock_info ? 'Đang khóa' : 'Mở'}</b>
          </span>
        </div>
      </section>

      {/* Khối form ghi nhận kết quả cuộc gọi */}
      <section className="call-panel outcome-panel">
        <div className="call-panel-heading">
          <div>
            <h2>Ghi nhận kết quả</h2>
          </div>
        </div>

        {/* Các nút lựa chọn kết quả */}
        <div className="result-grid">
          {resultOptions.map(({ key, label, icon: Icon, tone }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedOutcome(key)}
              className={clsx(tone, { chosen: selectedOutcome === key })}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Nếu là hẹn gọi lại hoặc tiềm năng */}
        {(selectedOutcome === 'callback' || selectedOutcome === 'potential') && (
          <div className="appointment-fields">
            <label>
              Ngày hẹn gọi lại <b style={{ color: '#e11d48' }}>*</b>
              <span>
                <CalendarCheck size={15} />
                <input
                  type="date"
                  value={callbackDate}
                  min={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setCallbackDate(e.target.value)}
                />
              </span>
            </label>
            <label>
              Giờ hẹn <b style={{ color: '#e11d48' }}>*</b>
              <span>
                <Clock3 size={15} />
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                />
              </span>
            </label>
          </div>
        )}

        {/* Nếu là từ chối / không có nhu cầu */}
        {selectedOutcome === 'not_interested' && (
          <div style={{ padding: '0 16px 12px', display: 'grid', gap: '8px' }}>
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                1. Nhóm từ chối (Cấp 1) <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <select
                value={deniedLevel1}
                onChange={(e) => handleLevel1Change(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                {level1Options.map((n) => (
                  <option key={n.code} value={n.code}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>

            {level2Options.length > 0 && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  2. Lý do chi tiết (Cấp 2):
                </label>
                <select
                  value={deniedLevel2}
                  onChange={(e) => handleLevel2Change(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                >
                  {level2Options.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {level3Options.length > 0 && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  3. Phân loại sâu (Cấp 3):
                </label>
                <select
                  value={deniedLevel3}
                  onChange={(e) => handleLevel3Change(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                >
                  {level3Options.map((n) => (
                    <option key={n.code} value={n.code}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {needsTextInput && (
              <div>
                <label
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'block',
                    marginBottom: '4px',
                  }}
                >
                  Chi tiết cụ thể (Out vùng / Khác) <b style={{ color: '#e11d48' }}>*</b>:
                </label>
                <input
                  type="text"
                  value={deniedCustomText}
                  onChange={(e) => setDeniedCustomText(e.target.value)}
                  placeholder="Ghi rõ khu vực out vùng hoặc chi tiết lý do..."
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                  }}
                />
              </div>
            )}

            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Nỗi đau khách hàng (Pain Point):
              </label>
              <select
                value={selectedPainPoint}
                onChange={(e) => setSelectedPainPoint(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Không xác định nỗi đau --</option>
                {painPointOptions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Nếu là Chốt đơn (closed) */}
        {selectedOutcome === 'closed' && (
          <div style={{ padding: '0 16px 14px', display: 'grid', gap: '12px' }}>
            <div
              style={{
                background: '#f0fdf4',
                padding: '9px 12px',
                borderRadius: '7px',
                border: '1px solid #bbf7d0',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2
                  size={14}
                  style={{
                    display: 'inline',
                    verticalAlign: '-2px',
                    marginRight: '6px',
                  }}
                />
                Thiết lập đơn hàng hẹn khách
              </p>
            </div>

            <div className="appointment-fields" style={{ padding: 0 }}>
              <label>
                Ngày hẹn <b style={{ color: '#e11d48' }}>*</b>
                <span>
                  <CalendarCheck size={16} />
                  <input
                    type="date"
                    value={orderDate}
                    min={dayjs().format('YYYY-MM-DD')}
                    onChange={(e) => onOrderDateChange(e.target.value)}
                  />
                </span>
              </label>
              <label>
                Giờ hẹn <b style={{ color: '#e11d48' }}>*</b>
                <span>
                  <Clock3 size={16} />
                  <input
                    type="time"
                    value={orderTime}
                    onChange={(e) => onOrderTimeChange(e.target.value)}
                  />
                </span>
              </label>
            </div>

            {/* Chọn gói dịch vụ */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Gói dịch vụ ({selectedServices.length} đã chọn) <b style={{ color: '#e11d48' }}>*</b>:
              </label>
              <input
                type="text"
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                placeholder="🔍 Tìm nhanh gói dịch vụ hoặc lõi lọc..."
                style={{
                  width: '100%',
                  height: '35px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 10px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                  marginBottom: '6px',
                }}
              />
              <div
                style={{
                  display: 'grid',
                  gap: '5px',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  paddingRight: '2px',
                }}
              >
                {filteredServices.map((srv) => {
                  const isSelected = selectedServices.includes(srv.code)
                  return (
                    <label
                      key={srv.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        background: isSelected ? '#f0fdf4' : '#fff',
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
                            width: '15px',
                            height: '15px',
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
                            fontSize: '12px',
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
                            fontSize: '12px',
                            color: '#0f172a',
                          }}
                        >
                          {formatVND(srv.price)}
                        </b>
                      ) : (
                        <span
                          style={{
                            color: '#16a34a',
                            whiteSpace: 'nowrap',
                            marginLeft: '8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          Miễn phí
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Đồ KTV cần mang đi (do_can_mang) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Đồ / Thiết bị KTV cần mang ({selectedDoCanMang.length}):
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '5px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}
              >
                {doCanMangOptions.map((item) => {
                  const isChecked = selectedDoCanMang.includes(item.code)
                  return (
                    <label
                      key={item.code}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: '5px',
                        border: '1px solid #e2e8f0',
                        background: isChecked ? '#eff6ff' : '#fff',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        color: isChecked ? '#1d4ed8' : '#334155',
                        fontWeight: isChecked ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        style={{
                          width: '14px',
                          height: '14px',
                          accentColor: '#2563eb',
                          cursor: 'pointer',
                        }}
                        onChange={() => handleToggleDoCanMang(item.code)}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '11.5px',
                        }}
                      >
                        {item.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Tình trạng lỗi máy (machine_problem) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Tình trạng lỗi máy (nếu có):
              </label>
              <select
                value={selectedMachineProblem}
                onChange={(e) => setSelectedMachineProblem(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Máy hoạt động bình thường --</option>
                {machineProblemOptions.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
              {selectedMachineProblem === 'Khác' && (
                <input
                  type="text"
                  value={otherMachineProblem}
                  onChange={(e) => setOtherMachineProblem(e.target.value)}
                  placeholder="Nhập mô tả lỗi máy khác..."
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #dce5f0',
                    borderRadius: '5px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    marginTop: '5px',
                  }}
                />
              )}
            </div>

            {/* Yêu cầu thêm (more_request) */}
            <div>
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'block',
                  marginBottom: '5px',
                }}
              >
                Yêu cầu kỹ thuật viên (more_request):
              </label>
              <select
                value={selectedMoreRequest}
                onChange={(e) => setSelectedMoreRequest(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  border: '1px solid #dce5f0',
                  borderRadius: '6px',
                  padding: '0 8px',
                  fontSize: '12px',
                  color: '#334155',
                  background: '#fff',
                }}
              >
                <option value="">-- Không có yêu cầu đặc biệt --</option>
                {moreRequestOptions.map((req) => (
                  <option key={req.code} value={req.code}>
                    {req.label}
                  </option>
                ))}
              </select>
              {selectedMoreRequest === 'Khác' && (
                <input
                  type="text"
                  value={otherMoreRequest}
                  onChange={(e) => setOtherMoreRequest(e.target.value)}
                  placeholder="Nhập yêu cầu thêm khác..."
                  style={{
                    width: '100%',
                    height: '34px',
                    border: '1px solid #dce5f0',
                    borderRadius: '5px',
                    padding: '0 8px',
                    fontSize: '12px',
                    color: '#334155',
                    background: '#fff',
                    marginTop: '5px',
                  }}
                />
              )}
            </div>
          </div>
        )}

        <label className="field-label">
          <FileText size={15} /> Ghi chú cuộc gọi
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú hoặc yêu cầu của khách hàng..."
          />
        </label>

        <button
          onClick={handleSaveResult}
          className="save-result"
          type="button"
          disabled={saveCallResultMutation.isPending || !currentCustomer}
        >
          <Save size={18} />
          {saveCallResultMutation.isPending
            ? 'Đang lưu kết quả...'
            : 'Lưu kết quả cuộc gọi'}
        </button>
      </section>
    </aside>
  )
}
