import React, { useEffect, useMemo, useState } from 'react'
import dayjs from '../../lib/dayjs'
import {
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Phone,
  ShoppingCart,
  Users,
} from 'lucide-react'
import {
  useCampaigns,
  useDailyResults,
  useDialCallMutation,
  useNextCustomerMutation,
} from '../../hooks/useTelesale'
import { useCallStore } from '../../store/useCallStore'
import { NextCustomerDto } from '../../types/api'
import { notify } from '../../utils/notify'

// 3 Khối Panels lớn của module Telesale
import { TelesaleSchedulePanel } from './components/TelesaleSchedulePanel'
import { TelesaleCallCenterPanel } from './components/TelesaleCallCenterPanel'
import {
  TelesaleCustomerPanel,
  resultOptions,
} from './components/TelesaleCustomerPanel'

// Re-export để đảm bảo tính tương thích ngược toàn dự án
export {
  TelesaleSchedulePanel,
  TelesaleCallCenterPanel,
  TelesaleCustomerPanel,
  resultOptions,
}

export const Telesale: React.FC = () => {
  // 1. Quản lý danh sách chiến dịch đàm thoại
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

  const branchId = selectedCampaign?.branch_id || 3

  // 2. Thống kê kết quả đàm thoại trong ngày
  const { data: dailyResults } = useDailyResults()

  // 3. Quản lý khách hàng đang tương tác
  const [currentCustomer, setCurrentCustomer] = useState<NextCustomerDto | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<number | undefined>(undefined)

  // Ngày và ca hẹn đồng bộ giữa Cột 1 (SchedulePanel) và Cột 3 (CustomerPanel)
  const [orderDate, setOrderDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [orderTime, setOrderTime] = useState('08:30')
  const [orderSlotId, setOrderSlotId] = useState<number | undefined>(undefined)

  // 4. Trạng thái cuộc gọi toàn cục (Zustand Store)
  const status = useCallStore((s) => s.status)
  const isAutoDial = useCallStore((s) => s.isAutoDial)
  const startCall = useCallStore((s) => s.startCall)
  const connectCall = useCallStore((s) => s.connectCall)
  const resetCall = useCallStore((s) => s.resetCall)
  const setAutoDial = useCallStore((s) => s.setAutoDial)
  const tickDuration = useCallStore((s) => s.tickDuration)

  // Mutations nghiệp vụ Telesale
  const nextCustomerMutation = useNextCustomerMutation()
  const dialCallMutation = useDialCallMutation()

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

  // Hàm lấy khách hàng tiếp theo từ chiến dịch
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
      notify(`Đã nạp khách hàng: ${nextCust.customer_name}`)
    } catch {
      // Lỗi đã được xử lý trong hook mutation
    }
  }

  // Hàm quay số gọi cho thành viên liên hệ
  const handleDial = async (memberId?: number) => {
    if (!currentCustomer) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }

    const targetMemberId =
      memberId || selectedMemberId || currentCustomer.members?.[0]?.member_id

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
      // Lỗi đã được xử lý trong hook mutation
    }
  }

  // Hàm chuyển đổi chế độ gọi tự động cuốn chiếu
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

  // Xử lý sau khi lưu kết quả cuộc gọi thành công
  const handleSaveResultSuccess = () => {
    resetCall()
    if (isAutoDial) {
      setTimeout(() => {
        handleFetchNextCustomer()
      }, 800)
    }
  }

  return (
    <div className="content telesale-content">
      {/* Tiêu đề trang & Chọn chiến dịch */}
      <div className="page-title telesale-title">
        <div>
          <p>
            Bàn làm việc đàm thoại{' '}
            <span className="live-dot">
              ●{' '}
              {status === 'connected'
                ? 'Đang đàm thoại'
                : status === 'calling'
                  ? 'Đang đổ chuông'
                  : 'Đang sẵn sàng'}
            </span>
          </p>
          <h1>Telesale</h1>
        </div>

        {/* Dropdown chọn chiến dịch đàm thoại */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#6d7f9c', fontWeight: 600 }}>
              Chiến dịch:
            </span>
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
            onClick={() =>
              notify('Phím tắt: [Space]: Giữ máy, [M]: Bật/tắt mic, [Esc]: Gác máy')
            }
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
              {dailyResults?.tong_tg_dam_thoai
                ? `${dailyResults.tong_tg_dam_thoai} phút`
                : '00:00:00'}
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
        <TelesaleSchedulePanel
          branchName={selectedCampaign?.branch_name}
          branchId={branchId}
          orderDate={orderDate}
          onDateChange={setOrderDate}
          selectedSlotId={orderSlotId}
          onSelectSlot={(slotId, slotTime) => {
            setOrderSlotId(slotId)
            setOrderTime(slotTime)
          }}
          isAutoDial={isAutoDial}
          onToggleAutoDial={handleToggleAutoDial}
        />

        {/* CỘT 2: Điều khiển cuộc gọi & Kịch bản tư vấn */}
        <TelesaleCallCenterPanel
          currentCustomer={currentCustomer}
          selectedMemberId={selectedMemberId}
          onSelectMemberId={setSelectedMemberId}
          onDial={handleDial}
          onFetchNextCustomer={handleFetchNextCustomer}
          isFetchingCustomer={nextCustomerMutation.isPending}
        />

        {/* CỘT 3: Hồ sơ khách hàng & Form kết quả cuộc gọi */}
        <TelesaleCustomerPanel
          currentCustomer={currentCustomer}
          selectedCampaignName={selectedCampaign?.name}
          branchId={branchId}
          orderDate={orderDate}
          onOrderDateChange={setOrderDate}
          orderTime={orderTime}
          onOrderTimeChange={setOrderTime}
          orderSlotId={orderSlotId}
          onFetchNextCustomer={handleFetchNextCustomer}
          onSaveResultSuccess={handleSaveResultSuccess}
        />
      </div>
    </div>
  )
}

export default Telesale
