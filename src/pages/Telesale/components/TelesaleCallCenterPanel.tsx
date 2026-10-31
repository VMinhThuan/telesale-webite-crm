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
  // Trạng thái SIP Softphone tổng đài
  sipRegStatus?:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'registered'
    | 'unregistered'
    | 'registrationFailed'
  sipExtension?: string
  onReconnectSip?: () => void
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
  sipRegStatus = 'registered',
  sipExtension,
  onReconnectSip,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Badge chỉ báo kết nối SIP máy nhánh tổng đài */}
            <span
              onClick={
                sipRegStatus === 'registrationFailed' ||
                sipRegStatus === 'disconnected'
                  ? onReconnectSip
                  : undefined
              }
              title={
                sipRegStatus === 'registered'
                  ? `Máy nhánh #${sipExtension || '1126'} đã đăng ký online với tổng đài Grandstream`
                  : sipRegStatus === 'connecting'
                    ? 'Đang bắt tay kết nối WebSocket WSS tới tổng đài...'
                    : 'Bấm để kết nối lại máy nhánh SIP'
              }
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '4px 9px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background:
                  sipRegStatus === 'registered'
                    ? '#dcfce7'
                    : sipRegStatus === 'connecting'
                      ? '#fef3c7'
                      : '#fee2e2',
                color:
                  sipRegStatus === 'registered'
                    ? '#15803d'
                    : sipRegStatus === 'connecting'
                      ? '#b45309'
                      : '#b91c1c',
                cursor:
                  sipRegStatus === 'registrationFailed' ||
                  sipRegStatus === 'disconnected'
                    ? 'pointer'
                    : 'default',
              }}
            >
              <i
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background:
                    sipRegStatus === 'registered'
                      ? '#16a34a'
                      : sipRegStatus === 'connecting'
                        ? '#f59e0b'
                        : '#ef4444',
                }}
              />
              {sipRegStatus === 'registered'
                ? `SIP #${sipExtension || '1126'}: Sẵn sàng`
                : sipRegStatus === 'connecting'
                  ? `SIP #${sipExtension || '1126'}: Đang kết nối...`
                  : `SIP #${sipExtension || '1126'}: Mất kết nối (Thử lại)`}
            </span>

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
            {(() => {
              const isInCall =
                activeTab.status === 'calling' ||
                activeTab.status === 'connected' ||
                activeTab.status === 'paused'
              const isCallEnded = activeTab.status === 'ended'
              const isIdle = activeTab.status === 'idle'
              const selectedMember =
                currentCustomer.members?.find(
                  (m) =>
                    m.member_id ===
                    (activeTab.selectedMemberId ||
                      currentCustomer.members?.[0]?.member_id),
                ) || currentCustomer.members?.[0]

              return (
                <>
                  <div className="caller">
                    <div className="customer-avatar">
                      <UserRound size={35} />
                    </div>
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <h3 style={{ margin: 0 }}>
                          {currentCustomer.customer_name}
                        </h3>
                        {isInCall && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color:
                                activeTab.status === 'connected'
                                  ? '#16a34a'
                                  : activeTab.status === 'paused'
                                    ? '#d97706'
                                    : '#2563eb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ●{' '}
                            {activeTab.status === 'connected'
                              ? 'Đang đàm thoại'
                              : activeTab.status === 'paused'
                                ? 'Đang giữ máy'
                                : 'Đang đổ chuông...'}
                          </span>
                        )}
                        {isIdle && (
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#64748b',
                              background: '#f1f5f9',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            Chưa gọi
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0' }}>
                        <MapPin size={14} />{' '}
                        {currentCustomer.masked_address || 'Địa chỉ bảo mật'}
                      </p>
                    </div>

                    {/* Chỉ hiển thị đồng hồ thời gian khi cuộc gọi đang diễn ra */}
                    {isInCall && (
                      <strong
                        style={{
                          letterSpacing: '0.5px',
                          fontSize: '18px',
                          color: '#0f172a',
                        }}
                      >
                        {formatDuration(activeTab.durationSec)}
                      </strong>
                    )}
                  </div>

                  <div
                    className="caller-number"
                    style={{ padding: '0 16px 10px' }}
                  >
                    <Phone size={15} />{' '}
                    {selectedMember?.phone_masked ||
                      activeTab.callerNumber ||
                      currentCustomer.members?.[0]?.phone_masked ||
                      'Số điện thoại bảo mật'}
                  </div>

                  {/* Danh sách thành viên liên hệ để chọn trước khi quay số */}
                  {currentCustomer.members &&
                    currentCustomer.members.length > 0 && (
                      <div style={{ padding: '0 16px 10px' }}>
                        <p
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#475569',
                            margin: '0 0 6px 0',
                          }}
                        >
                          Người nghe máy ({activeTab.label}):
                        </p>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {currentCustomer.members.map((m) => {
                            const isChosen =
                              (activeTab.selectedMemberId ||
                                currentCustomer.members?.[0]?.member_id) ===
                              m.member_id
                            return (
                              <button
                                key={m.member_id}
                                type="button"
                                disabled={isInCall}
                                onClick={() => onSelectMemberId(m.member_id)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  border: isChosen
                                    ? '1.5px solid #2563eb'
                                    : '1px solid #cbd5e1',
                                  background: isChosen ? '#eff6ff' : '#fff',
                                  color: isChosen ? '#1d4ed8' : '#334155',
                                  fontSize: '11px',
                                  cursor: isInCall ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  fontWeight: isChosen ? 600 : 400,
                                }}
                              >
                                <PhoneCall
                                  size={12}
                                  style={{
                                    color: isChosen ? '#2563eb' : '#64748b',
                                  }}
                                />
                                <b>{m.name}</b> ({m.phone_masked})
                                {m.relationship && (
                                  <span
                                    style={{
                                      fontSize: '9.5px',
                                      background: '#e2e8f0',
                                      color: '#475569',
                                      padding: '1px 4px',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    {m.relationship}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                  {/* TRẠNG THÁI 1: CHƯA GỌI -> Hiển thị nút Gọi nổi bật, telesale chủ động bấm khi sẵn sàng */}
                  {isIdle && (
                    <div style={{ padding: '6px 16px 14px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          onDial(
                            activeTab.selectedMemberId ||
                            selectedMember?.member_id,
                          )
                        }
                        style={{
                          width: '100%',
                          padding: '11px 18px',
                          borderRadius: '8px',
                          background: '#16a34a', // Màu xanh lá cây viễn thông chuẩn
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '13.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <PhoneCall size={18} />
                        <span>
                          Bắt đầu gọi cho{' '}
                          {selectedMember?.name ||
                            currentCustomer.customer_name}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* TRẠNG THÁI 2: ĐANG TRONG CUỘC GỌI -> Mới hiển thị bộ 3 nút điều khiển đàm thoại */}
                  {isInCall && (
                    <div className="call-controls">
                      <button
                        type="button"
                        onClick={onToggleMute}
                        className={clsx({ selected: activeTab.isMuted })}
                      >
                        <span>
                          {activeTab.isMuted ? (
                            <MicOff size={20} />
                          ) : (
                            <Mic size={20} />
                          )}
                        </span>
                        {activeTab.isMuted ? 'Bật mic' : 'Tắt mic'}
                      </button>

                      <button
                        type="button"
                        onClick={onToggleHold}
                        className={clsx({ selected: activeTab.isHeld })}
                      >
                        <span>
                          {activeTab.isHeld ? (
                            <Play size={20} />
                          ) : (
                            <Pause size={20} />
                          )}
                        </span>
                        {activeTab.isHeld ? 'Tiếp tục' : 'Giữ máy'}
                      </button>

                      <button
                        className="end"
                        type="button"
                        onClick={onEndCall}
                      >
                        <span>
                          <PhoneOff size={20} />
                        </span>
                        Kết thúc
                      </button>
                    </div>
                  )}

                  {/* TRẠNG THÁI 3: CUỘC GỌI ĐÃ KẾT THÚC -> Hiển thị kết quả & Nút Gọi lại nếu cần */}
                  {isCallEnded && (
                    <div
                      style={{
                        padding: '6px 16px 14px',
                        textAlign: 'center',
                      }}
                    >
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          marginBottom: '10px',
                          fontSize: '12px',
                          color: '#475569',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>
                          ● Cuộc gọi đã kết thúc
                        </span>
                        {activeTab.durationSec > 0 && (
                          <span>
                            {' '}
                            (Thời lượng:{' '}
                            {formatDuration(activeTab.durationSec)})
                          </span>
                        )}
                        <p
                          style={{
                            margin: '4px 0 0',
                            color: '#64748b',
                            fontSize: '11px',
                          }}
                        >
                          Vui lòng ghi nhận kết quả ở cột bên phải để hoàn tất
                          và nhận khách tiếp theo.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onDial(
                            activeTab.selectedMemberId ||
                            selectedMember?.member_id,
                          )
                        }
                        style={{
                          padding: '7px 16px',
                          borderRadius: '6px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <PhoneCall size={14} />
                        <span>Gọi lại</span>
                      </button>
                    </div>
                  )}
                </>
              )
            })()}
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
