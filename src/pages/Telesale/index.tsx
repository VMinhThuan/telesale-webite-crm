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
import { useAuthStore } from '../../store/useAuthStore'
import { useCallStore } from '../../store/useCallStore'
import sipService from '../../services/sipService'
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
  // 0. Thông tin user và cấu hình SIP Softphone của nhân viên
  const { user } = useAuthStore()

  const effectiveSipConfig = useMemo(() => {
    const rawSip = user?.sipConfig
    const userExt = user?.userExtension || '1126'
    return {
      impi: rawSip?.impi || userExt,
      impu: rawSip?.impu || `sip:${userExt}@tongdai.zozin.vn`,
      password: rawSip?.password || 'locnuoc365',
      websocketProxyUrl: rawSip?.websocketProxyUrl || 'wss://tongdai.zozin.vn:7443/ws',
      iceServerUrl: rawSip?.iceServerUrl || 'stun:stun.l.google.com:19302',
      realm: rawSip?.realm || 'grandstream',
      displayName: rawSip?.displayName || user?.name || userExt,
    }
  }, [user])

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

  // Trạng thái đăng ký SIP của máy nhánh tổng đài
  const [sipRegStatus, setSipRegStatus] = useState<
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'registered'
    | 'unregistered'
    | 'registrationFailed'
  >(() => sipService.getRegistrationStatus())

  // Tự động kết nối và đăng ký máy nhánh SIP khi vào màn hình Telesale
  useEffect(() => {
    if (effectiveSipConfig) {
      sipService.init(effectiveSipConfig)
    }

    const unsubscribeReg = sipService.onRegistrationStatusChange((status) => {
      setSipRegStatus(status)
    })

    const unsubscribeCall = sipService.onCallStateChange((event) => {
      if (event.status === 'calling' || event.status === 'progress') {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'calling' } : t,
          ),
        )
      } else if (event.status === 'connected') {
        useCallStore.getState().connectCall()
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'connected' } : t,
          ),
        )
      } else if (event.status === 'paused') {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'paused', isHeld: true } : t,
          ),
        )
      } else if (event.status === 'ended') {
        useCallStore.getState().endCall()
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'ended' } : t,
          ),
        )
      } else if (event.status === 'failed') {
        useCallStore.getState().endCall()
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeTabId ? { ...t, status: 'ended' } : t,
          ),
        )
        if (event.cause) {
          notify(`Cuộc gọi kết thúc: ${event.cause}`)
        }
      }
    })

    return () => {
      unsubscribeReg()
      unsubscribeCall()
    }
  }, [effectiveSipConfig, activeTabId])

  // Chuyển đổi giữa 3 tab cuộc gọi
  const handleSelectTab = (newTabId: number) => {
    if (newTabId === activeTabId) return

    // Nếu tab cũ đang đàm thoại, tự động gửi lệnh SIP hold giữ máy khách
    if (activeTab.status === 'connected') {
      sipService.hold()
    }

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
      // 1. Đảm bảo SIP UA đã sẵn sàng với tài khoản nhân viên
      if (effectiveSipConfig) {
        sipService.init(effectiveSipConfig)
      }

      // 2. Gọi API 16: POST /api/telesale/calls với customer_id và member_id để lấy chuỗi quay số thật
      const dialInfo = await dialCallMutation.mutateAsync({
        customer_id: currentCustomer.customer_id,
        member_id: targetMemberId,
      })

      // 3. Đặt tab hiện tại thành 'calling' và cập nhật callerNumber = dialInfo.phone_masked
      // Đồng thời đồng bộ Zustand Call Store để hiển thị widget toàn hệ thống
      useCallStore.getState().startCall({
        customerId: currentCustomer.customer_id,
        customerName: currentCustomer.customer_name,
        phoneMasked: dialInfo.phone_masked,
        memberId: dialInfo.member_id,
        memberName: dialInfo.member_name,
      })

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

      // 4. Nếu tab khác đang có cuộc gọi SIP thì giữ máy
      if (sipService.getCurrentSession() && sipService.getCallStatus() === 'connected') {
        sipService.hold()
      }

      // 5. Softphone thực hiện quay số thực tế bằng dial_number
      if (dialInfo.dial_number) {
        await sipService.call(dialInfo.dial_number)
        notify(
          `Đang quay số tới ${dialInfo.member_name || 'khách hàng'} qua máy nhánh #${effectiveSipConfig.impi}...`,
        )
      } else {
        notify('Không nhận được mã quay số từ hệ thống tổng đài.')
      }
    } catch (err: any) {
      console.error('Lỗi khi quay số:', err)
      useCallStore.getState().endCall()
      // Nếu lỗi cuộc gọi hoặc lỗi mic, reset trạng thái tab
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId && t.status === 'calling'
            ? { ...t, status: 'idle' }
            : t,
        ),
      )
    }
  }

  // Bật/tắt micro của tab đang active
  const handleToggleMute = () => {
    const isNowMuted = sipService.toggleMute()
    useCallStore.getState().toggleMute()
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          notify(isNowMuted ? 'Đã tắt micro' : 'Đã bật micro')
          return { ...t, isMuted: isNowMuted }
        }
        return t
      }),
    )
  }

  // Giữ máy / Tiếp tục cuộc gọi của tab đang active
  const handleToggleHold = () => {
    const isNowHeld = sipService.toggleHold()
    useCallStore.getState().toggleHold()
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
          notify(isNowHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
          return {
            ...t,
            isHeld: isNowHeld,
            status: isNowHeld ? 'paused' : 'connected',
          }
        }
        return t
      }),
    )
  }

  // Kết thúc cuộc gọi của tab đang active
  const handleEndCall = () => {
    sipService.hangup()
    useCallStore.getState().endCall()
    notify('Đã kết thúc cuộc gọi')
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === activeTabId) {
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
          sipRegStatus={sipRegStatus}
          sipExtension={effectiveSipConfig.impi}
          onReconnectSip={() => {
            sipService.init(effectiveSipConfig)
            notify('Đang gửi lệnh kết nối lại tổng đài...')
          }}
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
