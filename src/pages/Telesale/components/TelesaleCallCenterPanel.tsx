import React from 'react'
import {
  ChevronDown,
  Lightbulb,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  UserRound,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { NextCustomerDto } from '../../../types/api'
import { formatDuration } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'

export interface TelesaleCallTab {
  id: number
  label: string
  customer: NextCustomerDto | null
  selectedMemberId?: number
  status: 'idle' | 'calling' | 'connected' | 'paused' | 'ended'
  durationSec: number
  isMuted: boolean
  isHeld: boolean
  callerNumber?: string
}

export interface TelesaleCallCenterPanelProps {
  tabs: TelesaleCallTab[]
  activeTabId: number
  onSelectTab: (tabId: number) => void
  onSelectMemberId: (memberId: number) => void
  onDial: (memberId?: number) => void
  onToggleMute: () => void
  onToggleHold: () => void
  onEndCall: () => void
  onFetchCustomerForTab: (tabId: number) => void
  isFetchingCustomer: boolean
  // Các props tương thích ngược và cache IDE
  currentCustomer?: NextCustomerDto | null
  onFetchNextCustomer?: () => void
}

export const TelesaleCallCenterPanel: React.FC<TelesaleCallCenterPanelProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onSelectMemberId,
  onDial,
  onToggleMute,
  onToggleHold,
  onEndCall,
  onFetchCustomerForTab,
  isFetchingCustomer,
}) => {
  // Lấy tab đang active
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const currentCustomer = activeTab?.customer

  return (
    <div className="center-call-column">
      {/* Khối điều khiển phiên đàm thoại */}
      <section className="call-panel active-call">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">PHIÊN ĐÀM THOẠI</p>
            <h2>Điều khiển cuộc gọi</h2>
          </div>
          <span className="calling-status">
            <i />{' '}
            {activeTab.status === 'connected'
              ? 'Đang đàm thoại'
              : activeTab.status === 'paused'
                ? 'Đang giữ máy'
                : activeTab.status === 'calling'
                  ? 'Đang đổ chuông...'
                  : activeTab.customer
                    ? 'Sẵn sàng quay số'
                    : 'Chờ nạp khách'}
          </span>
        </div>

        {/* Thanh 3 Tab / 3 Line cuộc gọi theo mẫu thiết kế ban đầu */}
        <div
          className="line-list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            padding: '0 16px 12px',
          }}
        >
          {tabs.map((tab) => {
            const isCurrentActive = tab.id === activeTabId
            const isConnected = tab.status === 'connected'
            const isPaused = tab.status === 'paused'
            const isCalling = tab.status === 'calling'

            let statusText = 'Chờ gọi'
            if (isConnected) statusText = 'Đang gọi'
            else if (isPaused) statusText = 'Giữ máy'
            else if (isCalling) statusText = 'Đang gọi...'
            else if (tab.customer) statusText = 'Đã nạp'

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={clsx('line', { active: isCurrentActive })}
                style={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isCurrentActive ? '#f0f7ff' : '#fff',
                  border: isCurrentActive ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isCurrentActive ? '0 2px 6px rgba(59, 130, 246, 0.12)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Phone
                  size={14}
                  style={{
                    color: isConnected ? '#16a34a' : isCurrentActive ? '#2563eb' : '#64748b',
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: '11px', color: '#1e293b' }}>
                  {tab.label}
                </span>
                <b
                  style={{
                    marginLeft: 'auto',
                    fontSize: '9px',
                    fontWeight: 600,
                    color: isConnected ? '#16a34a' : isPaused ? '#d97706' : '#64748b',
                  }}
                >
                  {statusText}
                </b>
              </button>
            )
          })}
        </div>

        {/* Thông tin khách hàng & thời lượng cuộc gọi của tab đang chọn */}
        {currentCustomer ? (
          <>
            <div className="caller">
              <div className="customer-avatar">
                <UserRound size={35} />
              </div>
              <div>
                <h3>{currentCustomer.customer_name}</h3>
                <p>
                  <MapPin size={14} />{' '}
                  {currentCustomer.masked_address || 'Địa chỉ bảo mật'}
                </p>
              </div>
              <strong style={{ letterSpacing: '0.5px' }}>
                {formatDuration(activeTab.durationSec)}
              </strong>
            </div>

            <div className="caller-number" style={{ padding: '0 16px 10px' }}>
              <Phone size={15} />{' '}
              {activeTab.callerNumber ||
                currentCustomer.members?.[0]?.phone_masked ||
                'Số điện thoại bảo mật'}
            </div>

            {/* Danh sách thành viên liên hệ để chọn quay số */}
            {currentCustomer.members && currentCustomer.members.length > 0 && (
              <div style={{ padding: '0 16px 12px' }}>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#475569',
                    margin: '0 0 6px 0',
                  }}
                >
                  Thành viên liên hệ ({activeTab.label}):
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {currentCustomer.members.map((m) => {
                    const isChosen = activeTab.selectedMemberId === m.member_id
                    return (
                      <button
                        key={m.member_id}
                        type="button"
                        onClick={() => {
                          onSelectMemberId(m.member_id)
                          onDial(m.member_id)
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: isChosen ? '#eff6ff' : '#fff',
                          color: isChosen ? '#1d4ed8' : '#334155',
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
                    )
                  })}
                </div>
              </div>
            )}

            {/* Các nút điều khiển cuộc gọi của tab đang chọn */}
            <div className="call-controls">
              <button
                type="button"
                onClick={onToggleMute}
                className={clsx({ selected: activeTab.isMuted })}
                disabled={activeTab.status === 'idle'}
              >
                <span>
                  {activeTab.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </span>
                {activeTab.isMuted ? 'Bật mic' : 'Tắt mic'}
              </button>

              <button
                type="button"
                onClick={onToggleHold}
                className={clsx({ selected: activeTab.isHeld })}
                disabled={activeTab.status === 'idle'}
              >
                <span>
                  {activeTab.isHeld ? <Play size={20} /> : <Pause size={20} />}
                </span>
                {activeTab.isHeld ? 'Tiếp tục' : 'Giữ máy'}
              </button>

              <button
                className="end"
                type="button"
                onClick={onEndCall}
                disabled={activeTab.status === 'idle'}
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
            <p
              style={{
                color: '#64748b',
                fontSize: '13px',
                margin: '0 0 16px 0',
              }}
            >
              <b>{activeTab.label}</b> chưa nạp khách hàng. Bấm nút bên dưới để
              nhận khách tiếp theo từ chiến dịch.
            </p>
            <button
              type="button"
              className="dialog-primary"
              onClick={() => onFetchCustomerForTab(activeTab.id)}
              disabled={isFetchingCustomer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} />
              {isFetchingCustomer
                ? 'Đang nạp...'
                : `Lấy khách cho ${activeTab.label}`}
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
            Em chào anh/chị, em là tư vấn viên từ Lọc Nước 365. Em liên hệ để hỗ
            trợ kiểm tra định kỳ chất lượng nguồn nước nhà mình ạ.
          </li>
          <li>
            Dạ không biết lần gần nhất gia đình mình thay bộ lõi thô 1, 2, 3 là
            khi nào rồi ạ?
          </li>
          <li>
            Hiện tại vòi nước nhà mình chảy có mạnh không, nước có mùi vị lạ hay
            máy có phát ra tiếng ồn không ạ?
          </li>
          <li>
            Bên em đang có chương trình kỹ thuật viên qua kiểm tra máy, đo nồng
            độ TDS miễn phí tại nhà. Em hẹn lịch vào ca sáng hay chiều tiện cho
            gia đình mình ạ?
          </li>
        </ol>
        <button
          className="next-tip"
          type="button"
          onClick={() =>
            notify(
              'Gợi ý: Nhấn mạnh dịch vụ kiểm tra miễn phí áp lực nước và nồng độ TDS',
            )
          }
        >
          <Lightbulb size={17} /> Gợi ý tiếp theo
        </button>
      </section>
    </div>
  )
}
