import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CircleX,
  Clock3,
  FileText,
  Lightbulb,
  MapPin,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  RotateCw,
  Save,
  ShoppingCart,
  Timer,
  UserRound,
  Users,
  Voicemail,
} from 'lucide-react'
import clsx from 'clsx'
import { useEnums } from '../../hooks/useEnums'
import { useBranchSlots } from '../../hooks/useOrders'
import {
  useCampaigns,
  useDailyResults,
  useDialCallMutation,
  useNextCustomerMutation,
  useSaveCallResultMutation,
} from '../../hooks/useTelesale'
import { useCallStore } from '../../store/useCallStore'
import {
  CallResultOutcome,
  NextCustomerDto,
  SaveCallResultPayload,
} from '../../types/api'
import { generateIdempotencyKey } from '../../services/apiClient'
import { formatDuration, formatVND } from '../../utils/formatters'
import { notify } from '../../utils/notify'

const resultOptions: {
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

export const Telesale: React.FC = () => {
  // Lấy dữ liệu danh mục Enums hệ thống
  const { data: enums } = useEnums()

  // 1. Quản lý danh sách chiến dịch
  const { data: campaignsData, isLoading: isLoadingCampaigns } = useCampaigns()
  const campaignsList = useMemo(() => campaignsData?.items || [], [campaignsData?.items])
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | undefined>(undefined)

  // Tự động chọn chiến dịch đầu tiên khi danh sách tải xong
  useEffect(() => {
    if (campaignsList.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaignsList[0].campaign_id)
    }
  }, [campaignsList, selectedCampaignId])

  const selectedCampaign = useMemo(() => {
    return campaignsList.find((c) => c.campaign_id === selectedCampaignId) || campaignsList[0]
  }, [campaignsList, selectedCampaignId])

  // 2. Thống kê kết quả đàm thoại trong ngày
  const { data: dailyResults } = useDailyResults()

  // 3. Quản lý khách hàng đang tương tác
  const [currentCustomer, setCurrentCustomer] = useState<NextCustomerDto | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<number | undefined>(undefined)

  // Khóa chống double-click tức thời và quản lý Idempotency-Key theo vòng đời phiên chốt đơn
  const isSubmittingResultRef = useRef(false)
  const currentOrderKeyRef = useRef<string>(generateIdempotencyKey())

  // Tự động cấp mới Idempotency-Key khi chuyển sang khách hàng khác
  useEffect(() => {
    currentOrderKeyRef.current = generateIdempotencyKey()
  }, [currentCustomer?.customer_id])

  // 4. Form lưu kết quả cuộc gọi
  const [selectedOutcome, setSelectedOutcome] = useState<CallResultOutcome>('potential')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('14:30')
  const [note, setNote] = useState('')
  const [deniedReason, setDeniedReason] = useState('')

  // Các trường khi chốt đơn (closed)
  const [orderDate, setOrderDate] = useState('')
  const [orderTime, setOrderTime] = useState('08:30')
  const [orderSlotId, setOrderSlotId] = useState<number | undefined>(undefined)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedDoCanMang, setSelectedDoCanMang] = useState<string[]>([])

  // 5. Quản lý trạng thái cuộc gọi toàn cục (Zustand Store)
  const {
    status,
    caller,
    durationSec,
    isMuted,
    isHeld,
    isAutoDial,
    startCall,
    connectCall,
    toggleMute,
    toggleHold,
    endCall,
    tickDuration,
    setAutoDial,
    resetCall,
  } = useCallStore()

  // 6. Slot ca hẹn chi nhánh cho chiến dịch đang chọn
  const branchId = selectedCampaign?.branch_id || 3
  const { data: branchSlots = [] } = useBranchSlots(branchId, orderDate || undefined, orderDate || undefined)

  // 7. Mutations nghiệp vụ Telesale
  const nextCustomerMutation = useNextCustomerMutation()
  const dialCallMutation = useDialCallMutation()
  const saveCallResultMutation = useSaveCallResultMutation()

  // Bộ đếm thời gian khi cuộc gọi đang kết nối
  useEffect(() => {
    let intervalId: number | undefined
    if (status === 'connected') {
      intervalId = window.setInterval(() => {
        tickDuration()
      }, 1000)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [status, tickDuration])

  // Tự động chọn thành viên đầu tiên khi nạp khách hàng
  useEffect(() => {
    if (currentCustomer && currentCustomer.members?.length > 0) {
      setSelectedMemberId(currentCustomer.members[0].member_id)
    } else {
      setSelectedMemberId(undefined)
    }
  }, [currentCustomer])

  // Hàm lấy khách hàng tiếp theo
  const handleFetchNextCustomer = async () => {
    if (!selectedCampaign) {
      notify('Vui lòng chọn chiến dịch trước khi lấy khách')
      return
    }

    try {
      const nextCust = await nextCustomerMutation.mutateAsync({
        campaign_id: selectedCampaign.campaign_id,
        call_mode: 'chien_dich',
      })
      setCurrentCustomer(nextCust)
      resetCall()
      setNote('')
      setCallbackDate('')
      setSelectedServices([])
      setSelectedDoCanMang([])
      notify(`Đã nạp khách hàng: ${nextCust.customer_name}`)
    } catch {
      // Error handled in hook
    }
  }

  // Hàm quay số gọi cho thành viên
  const handleDial = async (memberId?: number) => {
    if (!currentCustomer) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }

    const targetMemberId = memberId || selectedMemberId || currentCustomer.members?.[0]?.member_id

    try {
      const dialInfo = await dialCallMutation.mutateAsync({
        customer_id: currentCustomer.customer_id,
        member_id: targetMemberId,
      })

      // Đưa thông tin vào Zustand Call Store
      startCall({
        customerId: currentCustomer.customer_id,
        customerName: currentCustomer.customer_name,
        phoneMasked: dialInfo.phone_masked,
        address: currentCustomer.masked_address,
        memberId: dialInfo.member_id,
        memberName: dialInfo.member_name,
        dialNumber: dialInfo.dial_number,
      })

      // Mô phỏng kết nối cuộc gọi sau 1.5s
      setTimeout(() => {
        connectCall()
      }, 1500)
    } catch {
      // Error handled in hook
    }
  }

  // Hàm chuyển đổi chế độ gọi tự động
  const handleToggleAutoDial = () => {
    const nextState = !isAutoDial
    setAutoDial(nextState)
    notify(
      nextState
        ? 'Đã bật chế độ tự động quay số cuốn chiếu'
        : 'Đã tắt chế độ quay số tự động',
    )
    if (nextState && !currentCustomer) {
      handleFetchNextCustomer()
    }
  }

  // Hàm lưu kết quả cuộc gọi
  const handleSaveResult = async () => {
    // Chặn tức thời mọi double-click hoặc spam click trước khi React re-render
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
      if (callbackDate) {
        payload.callback_at = `${callbackDate} ${callbackTime}:00`
      }
    } else if (selectedOutcome === 'not_interested') {
      payload.denied_note = deniedReason || 'Khách không có nhu cầu'
    } else if (selectedOutcome === 'closed') {
      if (!orderDate) {
        notify('Vui lòng chọn ngày hẹn khi chốt đơn')
        return
      }
      if (selectedServices.length === 0) {
        notify('Vui lòng chọn ít nhất một dịch vụ khi chốt đơn')
        return
      }
      payload.ngay_hen_khach = orderDate
      payload.gio_hen_khach = orderTime
      payload.slot_id = orderSlotId
      payload.branch_id = branchId
      payload.services = selectedServices
      payload.do_can_mang = selectedDoCanMang
    }

    isSubmittingResultRef.current = true

    try {
      await saveCallResultMutation.mutateAsync({
        customerId: currentCustomer.customer_id,
        payload,
        idempotencyKey: currentOrderKeyRef.current,
      })

      // Chốt đơn thành công: làm mới key cho lần lên đơn tiếp theo
      currentOrderKeyRef.current = generateIdempotencyKey()

      // Kết thúc phiên đàm thoại
      resetCall()

      // Nếu đang bật chế độ tự động cuốn chiếu, tiếp tục lấy khách tiếp theo
      if (isAutoDial) {
        setTimeout(() => {
          handleFetchNextCustomer()
        }, 800)
      }
    } catch (err: any) {
      // Bắt lỗi 409 xung đột đơn hàng nếu phát sinh
      if (err?.status === 409) {
        notify('Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.')
      }
    } finally {
      isSubmittingResultRef.current = false
    }
  }

  // Danh mục dịch vụ mặc định từ Enums
  const serviceOptions = enums?.services || [
    { code: 'thay_loi_123', label: 'Thay lõi 1, 2, 3', price: 250000 },
    { code: 'thay_loi_ro', label: 'Thay màng RO', price: 450000 },
    { code: 'bao_duong_toan_dien', label: 'Bảo dưỡng toàn diện', price: 150000 },
    { code: 'kiem_tra_may', label: 'Kiểm tra máy & đo TDS', price: 0 },
  ]

  return (
    <div className="content telesale-content">
      {/* Tiêu đề trang & Chọn chiến dịch */}
      <div className="page-title telesale-title">
        <div>
          <p>
            Bàn làm việc đàm thoại{' '}
            <span className="live-dot">
              ● {status === 'connected' ? 'Đang đàm thoại' : status === 'calling' ? 'Đang đổ chuông' : 'Đang sẵn sàng'}
            </span>
          </p>
          <h1>Telesale</h1>
        </div>

        {/* Dropdown chọn chiến dịch đàm thoại */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6d7f9c', fontWeight: 600 }}>Chiến dịch:</span>
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
              disabled={isLoadingCampaigns}
              style={{
                height: '36px',
                border: '1px solid #dce5f0',
                borderRadius: '8px',
                padding: '0 12px',
                background: '#fff',
                fontSize: '12px',
                color: '#263b63',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {campaignsList.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  {c.name} ({c.branch_name})
                </option>
              ))}
            </select>
          </div>

          <button
            className="help"
            type="button"
            onClick={() => notify('Phím tắt: [Space]: Giữ máy, [M]: Bật/tắt mic, [Esc]: Gác máy')}
          >
            <CircleHelp size={17} /> Phím tắt
          </button>
        </div>
      </div>

      {/* 4 Thẻ thống kê hiệu suất thực tế */}
      <section className="call-stat-grid">
        <article className="call-stat blue">
          <div className="card-icon">
            <Clock3 size={21} />
          </div>
          <div>
            <p>Thời gian đàm thoại</p>
            <strong>
              {dailyResults?.tong_tg_dam_thoai ? `${dailyResults.tong_tg_dam_thoai} phút` : '00:00:00'}
            </strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat blue">
          <div className="card-icon">
            <Phone size={21} />
          </div>
          <div>
            <p>Tổng số cuộc gọi</p>
            <strong>{dailyResults?.tong_total_call ?? 0} cuộc</strong>
          </div>
          <BarChart3 size={19} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <Users size={21} />
          </div>
          <div>
            <p>Kết nối thành công</p>
            <strong>{dailyResults?.tong_call_answer ?? 0} cuộc</strong>
          </div>
          <CheckCircle2 size={19} />
        </article>

        <article className="call-stat blue">
          <div className="card-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p>Đã chốt hôm nay</p>
            <strong>{dailyResults?.tong_da_chot ?? 0} đơn</strong>
          </div>
          <BarChart3 size={19} />
        </article>
      </section>

      {/* Layout 3 cột Telesale chuẩn CRM */}
      <div className="telesale-grid">
        {/* CỘT 1: Lịch Slot hẹn chi nhánh & Nút quay số tự động */}
        <section className="call-panel schedule-panel">
          <div className="call-panel-heading">
            <div>
              <p className="eyebrow">LỊCH HẸN CHI NHÁNH</p>
              <h2>{selectedCampaign?.branch_name || 'Trụ sở Hà Nội'}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => notify('Cập nhật slot chi nhánh')}
            >
              <MoreHorizontal size={19} />
            </button>
          </div>

          <div style={{ padding: '0 14px 10px' }}>
            <label style={{ fontSize: '10px', color: '#6d7f9c', display: 'block', marginBottom: '4px' }}>
              Xem slot theo ngày:
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
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

          <div className="slot-header">
            <span>Ca hẹn</span>
            <span>Khung giờ</span>
            <span>Trạng thái chỗ</span>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {branchSlots.length > 0 ? (
              branchSlots.map((slot) => {
                const isFull = slot.con_trong <= 0 || slot.is_expired
                return (
                  <div
                    key={slot.slot_id}
                    className="slot-row"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 14px',
                      borderBottom: '1px solid #edf1f6',
                      background: orderSlotId === slot.slot_id ? '#eff6ff' : 'transparent',
                      cursor: isFull ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => {
                      if (!isFull) {
                        setOrderSlotId(slot.slot_id)
                        setOrderTime(slot.slot_time)
                      }
                    }}
                  >
                    <b style={{ color: orderSlotId === slot.slot_id ? '#2563eb' : '#334155' }}>
                      {slot.slot_time} - {slot.to_time}
                    </b>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#fff',
                        background: isFull ? '#ef4444' : '#10b981',
                      }}
                    >
                      {isFull ? 'Hết chỗ' : `Còn ${slot.con_trong} chỗ`}
                    </span>
                  </div>
                )
              })
            ) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', padding: '20px 0' }}>
                Chọn ngày để kiểm tra slot khả dụng
              </p>
            )}
          </div>

          <button
            className={clsx('auto-dial', { active: isAutoDial })}
            onClick={handleToggleAutoDial}
            type="button"
            style={{ marginTop: '12px' }}
          >
            <RotateCw size={18} /> {isAutoDial ? 'Dừng quay tự động' : 'Tự động quay số'}
          </button>
        </section>

        {/* CỘT 2: Điều khiển cuộc gọi & Kịch bản tư vấn */}
        <div className="center-call-column">
          <section className="call-panel active-call">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">PHIÊN ĐÀM THOẠI</p>
                <h2>Điều khiển cuộc gọi</h2>
              </div>
              <span className="calling-status">
                <i />{' '}
                {status === 'connected'
                  ? 'Đang đàm thoại'
                  : status === 'paused'
                    ? 'Đang giữ máy'
                    : status === 'calling'
                      ? 'Đang đổ chuông...'
                      : 'Sẵn sàng quay số'}
              </span>
            </div>

            {/* Thông tin khách hàng & thời lượng cuộc gọi */}
            {currentCustomer ? (
              <>
                <div className="caller">
                  <div className="customer-avatar">
                    <UserRound size={35} />
                  </div>
                  <div>
                    <h3>{currentCustomer.customer_name}</h3>
                    <p>
                      <MapPin size={14} /> {currentCustomer.masked_address || 'Địa chỉ bảo mật'}
                    </p>
                  </div>
                  <strong>{formatDuration(durationSec)}</strong>
                </div>

                <div className="caller-number" style={{ padding: '0 16px 10px' }}>
                  <Phone size={15} />{' '}
                  {caller?.phoneMasked || currentCustomer.members?.[0]?.phone_masked || 'Số điện thoại bảo mật'}
                </div>

                {/* Danh sách thành viên để chọn quay số */}
                {currentCustomer.members && currentCustomer.members.length > 0 && (
                  <div style={{ padding: '0 16px 12px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#475569', margin: '0 0 6px 0' }}>
                      Thành viên liên hệ:
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {currentCustomer.members.map((m) => (
                        <button
                          key={m.member_id}
                          type="button"
                          onClick={() => {
                            setSelectedMemberId(m.member_id)
                            handleDial(m.member_id)
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: selectedMemberId === m.member_id ? '#eff6ff' : '#fff',
                            color: selectedMemberId === m.member_id ? '#1d4ed8' : '#334155',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <PhoneCall size={12} />
                          <b>{m.name}</b> ({m.phone_masked})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Các nút điều khiển cuộc gọi */}
                <div className="call-controls">
                  <button
                    type="button"
                    onClick={() => {
                      toggleMute()
                      notify(!isMuted ? 'Đã tắt micro' : 'Đã bật micro')
                    }}
                    className={clsx({ selected: isMuted })}
                    disabled={status === 'idle'}
                  >
                    <span>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}</span>
                    {isMuted ? 'Bật mic' : 'Tắt mic'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleHold()
                      notify(!isHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
                    }}
                    className={clsx({ selected: isHeld })}
                    disabled={status === 'idle'}
                  >
                    <span>{isHeld ? <Play size={20} /> : <Pause size={20} />}</span>
                    {isHeld ? 'Tiếp tục' : 'Giữ máy'}
                  </button>

                  <button
                    className="end"
                    type="button"
                    onClick={() => {
                      endCall()
                      notify('Đã kết thúc cuộc gọi')
                    }}
                    disabled={status === 'idle'}
                  >
                    <span>
                      <PhoneOff size={20} />
                    </span>
                    Kết thúc
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px 0' }}>
                  Chưa nạp khách hàng. Bấm nút bên dưới để nhận khách tiếp theo từ chiến dịch.
                </p>
                <button
                  type="button"
                  className="dialog-primary"
                  onClick={handleFetchNextCustomer}
                  disabled={nextCustomerMutation.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Users size={16} />
                  {nextCustomerMutation.isPending ? 'Đang nạp...' : 'Lấy khách tiếp theo'}
                </button>
              </div>
            )}
          </section>

          {/* Kịch bản tư vấn theo tình huống */}
          <section className="call-panel script-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">KỊCH BẢN TƯ VẤN</p>
                <h2>Tư vấn máy lọc nước</h2>
              </div>
              <button className="subtle-select" type="button">
                Bảo dưỡng / Thay lõi <ChevronDown size={15} />
              </button>
            </div>
            <ol>
              <li>
                Em chào anh/chị, em là tư vấn viên từ Lọc Nước 365. Em liên hệ để hỗ trợ kiểm tra định kỳ chất lượng nguồn nước nhà mình ạ.
              </li>
              <li>Dạ không biết lần gần nhất gia đình mình thay bộ lõi thô 1, 2, 3 là khi nào rồi ạ?</li>
              <li>Hiện tại vòi nước nhà mình chảy có mạnh không, nước có mùi vị lạ hay máy có phát ra tiếng ồn không ạ?</li>
              <li>
                Bên em đang có chương trình kỹ thuật viên qua kiểm tra máy, đo nồng độ TDS miễn phí tại nhà. Em hẹn lịch vào ca sáng hay chiều tiện cho gia đình mình ạ?
              </li>
            </ol>
            <button
              className="next-tip"
              type="button"
              onClick={() => notify('Gợi ý: Nhấn mạnh dịch vụ kiểm tra miễn phí áp lực nước và nồng độ TDS')}
            >
              <Lightbulb size={17} /> Gợi ý tiếp theo
            </button>
          </section>
        </div>

        {/* CỘT 3: Hồ sơ khách & Form lưu kết quả */}
        <aside className="right-call-column">
          <section className="call-panel customer-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">HỒ SƠ KHÁCH HÀNG</p>
                <h2>Thông tin liên hệ</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={handleFetchNextCustomer}
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
                Chiến dịch <b>{selectedCampaign?.name || 'Mặc định'}</b>
              </span>
              <span>
                Khóa thông tin chi tiết <b>{currentCustomer?.lock_info ? 'Đang khóa' : 'Mở'}</b>
              </span>
            </div>
          </section>

          {/* Form lưu kết quả cuộc gọi */}
          <section className="call-panel outcome-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">KẾT QUẢ CUỘC GỌI</p>
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
                  Ngày hẹn gọi lại
                  <span>
                    <CalendarCheck size={15} />
                    <input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                    />
                  </span>
                </label>
                <label>
                  Giờ hẹn
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
              <div style={{ padding: '0 16px 12px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Lý do từ chối:
                </label>
                <select
                  value={deniedReason}
                  onChange={(e) => setDeniedReason(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    border: '1px solid #dce5f0',
                    borderRadius: '6px',
                    padding: '0 10px',
                    fontSize: '11px',
                    color: '#334155',
                    background: '#fff',
                  }}
                >
                  <option value="Khách tự thay thế hoặc người nhà thay">Khách tự thay thế / người nhà thay</option>
                  <option value="Chê giá cao / không đồng ý chi phí">Chê giá cao / không đồng ý chi phí</option>
                  <option value="Out vùng / Quá xa chi nhánh">Out vùng / Quá xa chi nhánh</option>
                  <option value="Đã dùng hãng khác / Bán máy cũ">Đã dùng hãng khác / Bán máy cũ</option>
                </select>
              </div>
            )}

            {/* Nếu là Chốt đơn (closed) */}
            {selectedOutcome === 'closed' && (
              <div style={{ padding: '0 16px 12px', display: 'grid', gap: '10px' }}>
                <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                    <CheckCircle2 size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
                    Thiết lập đơn hàng hẹn khách
                  </p>
                </div>

                <div className="appointment-fields" style={{ padding: 0 }}>
                  <label>
                    Ngày hẹn
                    <span>
                      <CalendarCheck size={15} />
                      <input
                        type="date"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                      />
                    </span>
                  </label>
                  <label>
                    Giờ hẹn
                    <span>
                      <Clock3 size={15} />
                      <input
                        type="time"
                        value={orderTime}
                        onChange={(e) => setOrderTime(e.target.value)}
                      />
                    </span>
                  </label>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Gói dịch vụ:
                  </label>
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {serviceOptions.map((srv) => {
                      const isSelected = selectedServices.includes(srv.code)
                      return (
                        <label
                          key={srv.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            background: isSelected ? '#f0fdf4' : '#fff',
                          }}
                        >
                          <span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedServices([...selectedServices, srv.code])
                                } else {
                                  setSelectedServices(selectedServices.filter((s) => s !== srv.code))
                                }
                              }}
                              style={{ marginRight: '6px' }}
                            />
                            {srv.label}
                          </span>
                          {srv.price ? <b>{formatVND(srv.price)}</b> : <span style={{ color: '#16a34a' }}>Miễn phí</span>}
                        </label>
                      )
                    })}
                  </div>
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
              {saveCallResultMutation.isPending ? 'Đang lưu kết quả...' : 'Lưu kết quả cuộc gọi'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Telesale
