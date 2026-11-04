import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronDown,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Pencil,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  RotateCw,
  SkipForward,
  UserRound,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { NextCustomerDto } from '../../../types/api'
import { formatDuration } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'
import { useTelesaleConfig } from '../../../hooks/useTelesaleConfig'
import { defaultTelesaleConfig } from '../../../services/telesaleConfig.service'
import { ParsedCallTermination } from '../../../utils/sipCallParser'
import { TelesaleScriptEditModal } from './TelesaleScriptEditModal'

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
  terminationInfo?: ParsedCallTermination | null
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
  isDialing?: boolean
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
  isDialing = false,
  sipRegStatus = 'registered',
  sipExtension,
  onReconnectSip,
}) => {
  // Lấy tab đang active
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const currentCustomer = activeTab?.customer

  // Hook nạp kịch bản từ Cloudflare R2
  const { data: config } = useTelesaleConfig()
  const scripts =
    config?.scripts && config.scripts.length > 0
      ? config.scripts
      : defaultTelesaleConfig.scripts

  const [activeScriptId, setActiveScriptId] = useState<string>('')
  const [isScriptDropdownOpen, setIsScriptDropdownOpen] = useState(false)
  const [isEditScriptModalOpen, setIsEditScriptModalOpen] = useState(false)
  const scriptDropdownRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown kịch bản khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    if (!isScriptDropdownOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        scriptDropdownRef.current &&
        !scriptDropdownRef.current.contains(event.target as Node)
      ) {
        setIsScriptDropdownOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsScriptDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isScriptDropdownOpen])

  // Script đang hiển thị
  const currentScript =
    scripts.find((s) => s.id === activeScriptId) || scripts[0]

  return (
    <div className="center-call-column">
      {/* Khối điều khiển phiên đàm thoại */}
      <section className="call-panel active-call">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">PHIÊN ĐÀM THOẠI</p>
            <h2>Điều khiển cuộc gọi</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Badge chỉ báo kết nối SIP máy nhánh tổng đài */}
            <span
              onClick={
                sipRegStatus === 'registrationFailed' ||
                  sipRegStatus === 'disconnected'
                  ? onReconnectSip
                  : undefined
              }
              title={
                !sipExtension
                  ? 'Chưa nhận được cấu hình máy nhánh SIP từ máy chủ'
                  : sipRegStatus === 'registered'
                    ? `Máy nhánh #${sipExtension} đã đăng ký online với tổng đài`
                    : sipRegStatus === 'connecting'
                      ? 'Đang bắt tay kết nối tới tổng đài...'
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
              {!sipExtension
                ? 'SIP: Chưa cấu hình'
                : sipRegStatus === 'registered'
                  ? `SIP #${sipExtension}: Sẵn sàng`
                  : sipRegStatus === 'connecting'
                    ? `SIP #${sipExtension}: Đang kết nối...`
                    : `SIP #${sipExtension}: Mất kết nối (Thử lại)`}
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
            else if (tab.status === 'ended') {
              statusText = tab.terminationInfo?.shortLabel || 'Đã kết thúc'
            } else if (tab.customer) statusText = 'Đã nạp'

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

                  {/* TRẠNG THÁI 1: CHƯA GỌI -> Điều chỉnh UX chống xung đột theo trạng thái SIP */}
                  {isIdle && (
                    <div style={{ padding: '6px 16px 14px', width: '100%' }}>
                          {sipRegStatus === 'connecting' ? (
                            <button
                              type="button"
                              disabled
                              title="Hệ thống đang bắt tay kết nối WebSocket WSS với tổng đài, nút gọi sẽ tự động sẵn sàng sau giây lát"
                              style={{
                                width: '100%',
                                padding: '11px 18px',
                                borderRadius: '8px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                              }}
                            >
                              <Loader2
                                size={18}
                                style={{
                                  color: '#2563eb',
                                  animation: 'spin 1s linear infinite',
                                }}
                              />
                              <span>
                                Đang kết nối tổng đài... Vui lòng đợi
                              </span>
                            </button>
                          ) : sipRegStatus === 'registered' ? (
                            <button
                              type="button"
                              disabled={isDialing || activeTab.status === 'calling'}
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
                                background: isDialing ? '#94a3b8' : '#16a34a', // Màu xám khi đang kết nối, xanh lá cây khi sẵn sàng
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                cursor: isDialing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: isDialing
                                  ? 'none'
                                  : '0 4px 12px rgba(22, 163, 74, 0.25)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isDialing ? (
                                <>
                                  <Loader2
                                    size={18}
                                    style={{
                                      color: '#ffffff',
                                      animation: 'spin 1s linear infinite',
                                    }}
                                  />
                                  <span>Đang kết nối...</span>
                                </>
                              ) : (
                                <>
                                  <PhoneCall size={18} />
                                  <span>Bắt đầu gọi</span>
                                </>
                              )}
                            </button>
                          ) : !sipExtension ? (
                            <div
                              style={{
                                width: '100%',
                                padding: '11px 18px',
                                borderRadius: '8px',
                                background: '#fff1f2',
                                color: '#b91c1c',
                                border: '1.5px solid #fecdd3',
                                fontSize: '13px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                              }}
                            >
                              <PhoneOff size={17} style={{ color: '#b91c1c' }} />
                              <span>Chưa cấu hình máy nhánh SIP từ máy chủ</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={onReconnectSip}
                              title="Bấm để kích hoạt kết nối lại máy nhánh SIP với tổng đài"
                              style={{
                                width: '100%',
                                padding: '11px 18px',
                                borderRadius: '8px',
                                background: '#fff1f2',
                                color: '#e11d48',
                                border: '1.5px solid #fecdd3',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 2px 8px rgba(225, 29, 72, 0.1)',
                              }}
                            >
                              <RotateCw size={17} style={{ color: '#e11d48' }} />
                              <span>Tổng đài chưa kết nối — Bấm để kết nối lại</span>
                            </button>
                          )}
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
                          padding: '12px 14px',
                          borderRadius: '8px',
                          background:
                            activeTab.terminationInfo?.tone === 'amber'
                              ? '#fffbeb'
                              : activeTab.terminationInfo?.tone === 'rose'
                                ? '#fef2f2'
                                : activeTab.terminationInfo?.tone === 'blue'
                                  ? '#eff6ff'
                                  : '#f8fafc',
                          border: `1px solid ${
                            activeTab.terminationInfo?.tone === 'amber'
                              ? '#fde68a'
                              : activeTab.terminationInfo?.tone === 'rose'
                                ? '#fecaca'
                                : activeTab.terminationInfo?.tone === 'blue'
                                  ? '#bfdbfe'
                                  : '#e2e8f0'
                          }`,
                          marginBottom: '10px',
                          fontSize: '12px',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '12.5px',
                              color:
                                activeTab.terminationInfo?.tone === 'amber'
                                  ? '#b45309'
                                  : activeTab.terminationInfo?.tone === 'rose'
                                    ? '#dc2626'
                                    : activeTab.terminationInfo?.tone === 'blue'
                                      ? '#1d4ed8'
                                      : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            ● {activeTab.terminationInfo?.label || 'Cuộc gọi đã kết thúc'}
                          </span>
                          {activeTab.durationSec > 0 && (
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                              Thời lượng: {formatDuration(activeTab.durationSec)}
                            </span>
                          )}
                        </div>

                        {activeTab.terminationInfo?.detail && (
                          <p
                            style={{
                              margin: '5px 0 0',
                              color: '#64748b',
                              fontSize: '11px',
                              lineHeight: 1.45,
                            }}
                          >
                            {activeTab.terminationInfo.detail}
                          </p>
                        )}

                        {activeTab.terminationInfo?.suggestedOutcome && (
                          <div
                            style={{
                              marginTop: '8px',
                              paddingTop: '6px',
                              borderTop: '1px dashed rgba(0,0,0,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '11px',
                              color: '#2563eb',
                              fontWeight: 600,
                            }}
                          >
                            <span>💡 Đã tự động gợi ý kết quả:</span>
                            <span
                              style={{
                                background: '#dbeafe',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                color: '#1e40af',
                              }}
                            >
                              {activeTab.terminationInfo.suggestedOutcome === 'callback'
                                ? 'Gọi chốt'
                                : activeTab.terminationInfo.suggestedOutcome === 'no_answer'
                                  ? 'Không nghe máy'
                                  : 'Sai số'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          marginTop: '4px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          disabled={sipRegStatus === 'connecting' || isDialing}
                          onClick={() => {
                            if (sipRegStatus !== 'registered') {
                              onReconnectSip?.()
                              return
                            }
                            onDial(
                              activeTab.selectedMemberId ||
                              selectedMember?.member_id,
                            )
                          }}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            background:
                              sipRegStatus === 'connecting' || isDialing
                                ? '#94a3b8'
                                : '#2563eb',
                            color: '#fff',
                            border: 'none',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor:
                              sipRegStatus === 'connecting' || isDialing
                                ? 'not-allowed'
                                : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {sipRegStatus === 'connecting' || isDialing ? (
                            <Loader2
                              size={14}
                              style={{ animation: 'spin 1s linear infinite' }}
                            />
                          ) : (
                            <PhoneCall size={14} />
                          )}
                          <span>
                            {sipRegStatus === 'connecting'
                              ? 'Đang kết nối lại tổng đài...'
                              : isDialing
                                ? 'Đang kết nối...'
                                : 'Gọi lại'}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isFetchingCustomer || isDialing}
                          onClick={() => onFetchCustomerForTab(activeTab.id)}
                          title="Chuyển sang khách hàng tiếp theo trong chiến dịch cho tab này"
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1.5px solid #cbd5e1',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor:
                              isFetchingCustomer || isDialing ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isFetchingCustomer ? (
                            <Loader2
                              size={14}
                              style={{
                                color: '#2563eb',
                                animation: 'spin 1s linear infinite',
                              }}
                            />
                          ) : (
                            <SkipForward size={14} style={{ color: '#475569' }} />
                          )}
                          <span>
                            {isFetchingCustomer ? 'Đang đổi...' : 'Đổi khách khác'}
                          </span>
                        </button>
                      </div>
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
      <section className="call-panel script-panel" style={{ overflow: 'visible' }}>
        <div className="call-panel-heading">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <p className="eyebrow" style={{ margin: 0 }}>KỊCH BẢN TƯ VẤN</p>
              {/* Nút Chỉnh sửa Kịch bản */}
              <button
                type="button"
                title="Chỉnh sửa kịch bản tư vấn"
                onClick={() => setIsEditScriptModalOpen(true)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <Pencil size={13} />
              </button>
            </div>
            <h2>{currentScript?.title || 'Tư vấn máy lọc nước'}</h2>
          </div>

          {/* Dropdown chọn tình huống kịch bản */}
          <div ref={scriptDropdownRef} style={{ position: 'relative' }}>
            <button
              className="subtle-select"
              type="button"
              onClick={() => setIsScriptDropdownOpen(!isScriptDropdownOpen)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                borderRadius: '6px',
                padding: '6px 10px',
              }}
            >
              <span
                style={{
                  maxWidth: '160px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={currentScript?.name || 'Bảo dưỡng / Thay lõi'}
              >
                {currentScript?.name || 'Bảo dưỡng / Thay lõi'}
              </span>
              <ChevronDown size={15} style={{ flexShrink: 0 }} />
            </button>

            {isScriptDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 12px 24px -4px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 50,
                  minWidth: '200px',
                  maxWidth: '280px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {scripts.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    title={sc.name}
                    onClick={() => {
                      setActiveScriptId(sc.id)
                      setIsScriptDropdownOpen(false)
                      notify(`Đã chuyển kịch bản: ${sc.name}`)
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: 'none',
                      background: sc.id === currentScript?.id ? '#eff6ff' : 'transparent',
                      color: sc.id === currentScript?.id ? '#2563eb' : '#334155',
                      fontWeight: sc.id === currentScript?.id ? 600 : 400,
                      textAlign: 'left',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (sc.id !== currentScript?.id) {
                        e.currentTarget.style.background = '#f8fafc'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sc.id !== currentScript?.id) {
                        e.currentTarget.style.background = 'transparent'
                      }
                    }}
                  >
                    {sc.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <ol>
          {currentScript?.steps && currentScript.steps.length > 0 ? (
            currentScript.steps.map((step, idx) => <li key={idx}>{step}</li>)
          ) : (
            <li>Chưa có nội dung câu thoại cho kịch bản này.</li>
          )}
        </ol>
      </section>

      {/* Modal Chỉnh sửa Kịch bản tư vấn */}
      {isEditScriptModalOpen && (
        <TelesaleScriptEditModal
          scripts={scripts}
          activeScriptId={currentScript?.id || ''}
          onSelectScript={(id) => setActiveScriptId(id)}
          onClose={() => setIsEditScriptModalOpen(false)}
        />
      )}
    </div>
  )
}
