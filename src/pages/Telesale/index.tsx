import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Phone,
  ShoppingCart,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import {
  useCampaigns,
  useDailyResults,
  useDialCallMutation,
  useNextCustomerMutation,
} from '../../hooks/useTelesale'
import { notify } from '../../utils/notify'

// 3 Khối Panels lớn của module Telesale
import { TelesaleSchedulePanel } from './components/TelesaleSchedulePanel'
import {
  TelesaleCallCenterPanel,
  TelesaleCallTab,
} from './components/TelesaleCallCenterPanel'
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

  // 3. Quản lý mô hình 3 Tab / 3 Line cuộc gọi độc lập
  const [tabs, setTabs] = useState<TelesaleCallTab[]>([
    {
      id: 1,
      label: 'Số 1',
      customer: null,
      status: 'idle',
      durationSec: 0,
      isMuted: false,
      isHeld: false,
    },
    {
      id: 2,
      label: 'Số 2',
      customer: null,
      status: 'idle',
      durationSec: 0,
      isMuted: false,
      isHeld: false,
    },
    {
      id: 3,
      label: 'Số 3',
      customer: null,
      status: 'idle',
      durationSec: 0,
      isMuted: false,
      isHeld: false,
    },
  ])
  const [activeTabId, setActiveTabId] = useState<number>(1)

  // Tab đang hoạt động
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0]
  }, [tabs, activeTabId])

  const currentCustomer = activeTab?.customer

  // Ngày và ca hẹn đồng bộ giữa Cột 1 (SchedulePanel) và Cột 3 (CustomerPanel)
  const [orderDate, setOrderDate] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [orderTime, setOrderTime] = useState('08:30')
  const [orderSlotId, setOrderSlotId] = useState<number | undefined>(undefined)

  // Mutations nghiệp vụ Telesale
  const nextCustomerMutation = useNextCustomerMutation()
  const dialCallMutation = useDialCallMutation()

  // Hàm nạp khách hàng từ chiến dịch vào một Tab cụ thể
  const handleFetchCustomerForTab = React.useCallback(
    async (targetTabId: number, campaignIdOverride?: number) => {
      const activeCampId = campaignIdOverride || selectedCampaign?.campaign_id
      if (!activeCampId) {
        notify('Vui lòng chọn chiến dịch trước khi lấy khách')
        return
      }

      try {
        const nextCust = await nextCustomerMutation.mutateAsync({
          campaign_id: activeCampId,
          call_mode: 'chien_dich',
        })

        setTabs((prev) =>
          prev.map((t) => {
            if (t.id === targetTabId) {
              return {
                ...t,
                customer: nextCust,
                selectedMemberId: nextCust.members?.[0]?.member_id,
                status: 'idle',
                durationSec: 0,
                isMuted: false,
                isHeld: false,
                callerNumber: undefined,
              }
            }
            return t
          }),
        )

        notify(`Đã nạp khách hàng cho Số ${targetTabId}: ${nextCust.customer_name}`)
      } catch {
        // Lỗi đã được xử lý trong hook mutation
      }
    },
    [nextCustomerMutation, selectedCampaign?.campaign_id],
  )

  // Nạp khách hàng ban đầu cho Tab 1 khi chiến dịch sẵn sàng (Cách 2: nạp Tab 1 trước)
  const initializedCampaignIdRef = useRef<number | null>(null)
  useEffect(() => {
    if (
      selectedCampaign &&
      initializedCampaignIdRef.current !== selectedCampaign.campaign_id
    ) {
      initializedCampaignIdRef.current = selectedCampaign.campaign_id
      // Reset cả 3 tab khi chuyển chiến dịch
      setTabs([
        {
          id: 1,
          label: 'Số 1',
          customer: null,
          status: 'idle',
          durationSec: 0,
          isMuted: false,
          isHeld: false,
        },
        {
          id: 2,
          label: 'Số 2',
          customer: null,
          status: 'idle',
          durationSec: 0,
          isMuted: false,
          isHeld: false,
        },
        {
          id: 3,
          label: 'Số 3',
          customer: null,
          status: 'idle',
          durationSec: 0,
          isMuted: false,
          isHeld: false,
        },
      ])
      setActiveTabId(1)
      handleFetchCustomerForTab(1, selectedCampaign.campaign_id)
    }
  }, [handleFetchCustomerForTab, selectedCampaign])

  // Bộ đếm thời gian khi các tab đang ở trạng thái 'connected'
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTabs((prev) => {
        const hasConnected = prev.some((t) => t.status === 'connected')
        if (!hasConnected) return prev
        return prev.map((t) =>
          t.status === 'connected' ? { ...t, durationSec: t.durationSec + 1 } : t,
        )
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [])

  // Chuyển đổi giữa 3 tab cuộc gọi
  const handleSelectTab = (newTabId: number) => {
    if (newTabId === activeTabId) return

    setTabs((prev) =>
      prev.map((t) => {
        // Nếu tab cũ đang đàm thoại, tự động chuyển sang trạng thái Giữ máy (Hold)
        if (t.id === activeTabId && t.status === 'connected') {
          return { ...t, status: 'paused', isHeld: true }
        }
        return t
      }),
    )

    setActiveTabId(newTabId)
  }

  // Chọn thành viên cần gọi của Tab đang active
  const handleSelectMemberId = (memberId: number) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, selectedMemberId: memberId } : t,
      ),
    )
  }

  // Quay số cho thành viên của Tab đang active
  const handleDial = async (memberId?: number) => {
    if (!currentCustomer) {
      notify('Chưa có thông tin khách hàng để gọi')
      return
    }

    const targetMemberId =
      memberId || activeTab.selectedMemberId || currentCustomer.members?.[0]?.member_id

    try {
      const dialInfo = await dialCallMutation.mutateAsync({
        customer_id: currentCustomer.customer_id,
        member_id: targetMemberId,
      })

      // Đặt tab hiện tại thành 'calling' và tạm giữ máy các tab khác nếu đang connected
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id === activeTabId) {
            return {
              ...t,
              status: 'calling',
              durationSec: 0,
              isMuted: false,
              isHeld: false,
              callerNumber: dialInfo.phone_masked,
              selectedMemberId: dialInfo.member_id,
            }
          }
          if (t.status === 'connected') {
            return { ...t, status: 'paused', isHeld: true }
          }
          return t
        }),
      )

      // Mô phỏng kết nối cuộc gọi sau 1.5s
      setTimeout(() => {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'connected' } : t,
          ),
        )
      }, 1500)
    } catch {
      // Lỗi đã được xử lý trong hook mutation
    }
  }

  // Bật/tắt micro của tab đang active
  const handleToggleMute = () => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          const nextMuted = !t.isMuted
          notify(!nextMuted ? 'Đã bật micro' : 'Đã tắt micro')
          return { ...t, isMuted: nextMuted }
        }
        return t
      }),
    )
  }

  // Giữ máy / Tiếp tục cuộc gọi của tab đang active
  const handleToggleHold = () => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          const nextHeld = !t.isHeld
          notify(nextHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
          return {
            ...t,
            isHeld: nextHeld,
            status: nextHeld ? 'paused' : 'connected',
          }
        }
        return t
      }),
    )
  }

  // Kết thúc cuộc gọi của tab đang active
  const handleEndCall = () => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          notify('Đã kết thúc cuộc gọi')
          return { ...t, status: 'ended' }
        }
        return t
      }),
    )
  }

  // Xử lý sau khi lưu kết quả cuộc gọi thành công ở Cột 3
  const handleSaveResultSuccess = () => {
    // 1. Reset trạng thái của tab vừa lưu
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          return {
            ...t,
            customer: null,
            status: 'idle',
            durationSec: 0,
            isMuted: false,
            isHeld: false,
            callerNumber: undefined,
            selectedMemberId: undefined,
          }
        }
        return t
      }),
    )

    // 2. Tự động nạp khách hàng tiếp theo vào chính tab vừa lưu
    setTimeout(() => {
      handleFetchCustomerForTab(activeTabId)
    }, 400)
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
              {activeTab.status === 'connected'
                ? 'Đang đàm thoại'
                : activeTab.status === 'calling'
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
                  {c.name}
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
        {/* CỘT 1: Lịch Slot hẹn chi nhánh theo ma trận 3 ngày */}
        <TelesaleSchedulePanel
          branchName={selectedCampaign?.branch_name}
          branchId={branchId}
          orderDate={orderDate}
          onDateChange={setOrderDate}
          selectedSlotId={orderSlotId}
          onSelectSlot={(slotId, slotTime, date) => {
            setOrderSlotId(slotId)
            setOrderTime(slotTime)
            if (date) {
              setOrderDate(date)
            }
          }}
        />

        {/* CỘT 2: Điều khiển cuộc gọi theo mô hình 3 Tab độc lập */}
        <TelesaleCallCenterPanel
          tabs={tabs}
          activeTabId={activeTabId}
          onSelectTab={handleSelectTab}
          onSelectMemberId={handleSelectMemberId}
          onDial={handleDial}
          onToggleMute={handleToggleMute}
          onToggleHold={handleToggleHold}
          onEndCall={handleEndCall}
          onFetchCustomerForTab={handleFetchCustomerForTab}
          isFetchingCustomer={nextCustomerMutation.isPending}
          currentCustomer={currentCustomer}
          onFetchNextCustomer={() => handleFetchCustomerForTab(activeTabId)}
        />

        {/* CỘT 3: Hồ sơ khách hàng & Form kết quả cuộc gọi (đồng bộ theo Tab active) */}
        <TelesaleCustomerPanel
          currentCustomer={currentCustomer}
          selectedCampaignName={selectedCampaign?.name}
          branchId={branchId}
          orderDate={orderDate}
          onOrderDateChange={setOrderDate}
          orderTime={orderTime}
          onOrderTimeChange={setOrderTime}
          orderSlotId={orderSlotId}
          onFetchNextCustomer={() => handleFetchCustomerForTab(activeTabId)}
          onSaveResultSuccess={handleSaveResultSuccess}
        />
      </div>
    </div>
  )
}

export default Telesale
