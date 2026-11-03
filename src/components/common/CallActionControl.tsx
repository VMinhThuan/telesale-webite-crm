import React from 'react'
import {
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneOff,
  Play,
} from 'lucide-react'
import clsx from 'clsx'
import { useMakeCall } from '../../hooks/useMakeCall'
import { CallDurationText } from '../../store/useCallStore'

export interface CallActionControlProps {
  /** ID khách hàng cần gọi */
  customerId: number
  /** Tên khách hàng hiển thị */
  customerName?: string
  /** ID thành viên gia đình (nếu có chọn người cụ thể) */
  memberId?: number
  /** Tên thành viên gia đình */
  memberName?: string
  /** Dữ liệu bổ sung về khách hàng (địa chỉ, số đt...) */
  customerData?: any
  /** Nhãn nút khi chưa gọi (mặc định: 'Gọi khách hàng') */
  buttonText?: string
  /** Icon tùy biến cho nút khi chưa gọi (mặc định: <Phone size={18} />) */
  buttonIcon?: React.ReactNode
  /** Callback được kích hoạt ngay khi bắt đầu quay số */
  onCallStarted?: () => void
  /** Callback được kích hoạt khi cuộc gọi kết thúc */
  onCallEnded?: () => void
  /** Vô hiệu hóa nút gọi */
  disabled?: boolean
  /** Class CSS bổ sung cho nút */
  className?: string
  /** Style tùy biến */
  style?: React.CSSProperties
}

/**
 * Component điều khiển cuộc gọi tự hành (Autonomous Smart Component).
 * Dùng chung cho mọi màn hình CRM (Khách tiềm năng, Đơn hàng, v.v.).
 * 
 * - Khi chưa gọi: Hiển thị nút bấm quay số (tùy biến label & icon).
 * - Khi đang gọi: Tự động chuyển đổi tại chỗ thành Hộp điều khiển cuộc gọi
 *   (Đèn LED trạng thái, thời lượng thời gian thực, Tắt mic, Giữ máy, Gác máy).
 */
export const CallActionControl: React.FC<CallActionControlProps> = ({
  customerId,
  customerName,
  memberId,
  memberName,
  customerData,
  buttonText = 'Gọi khách hàng',
  buttonIcon,
  onCallStarted,
  onCallEnded,
  disabled = false,
  className,
  style,
}) => {
  const {
    makeCall,
    endCall,
    toggleMute,
    toggleHold,
    isDialing,
    callStatus,
    isCallActive,
    isMuted,
    isHeld,
    activeCaller,
  } = useMakeCall()

  // Kiểm tra xem khách hàng này (hoặc cuộc gọi hiện tại) có đang trong phiên đàm thoại hay không
  const isThisCustomerInCall =
    isCallActive &&
    (activeCaller?.customerId === customerId || !activeCaller?.customerId)

  const handleStartCall = async () => {
    onCallStarted?.()
    await makeCall({
      customerId,
      customerName,
      memberId,
      memberName,
      customer: customerData,
    })
  }

  const handleEndCall = () => {
    endCall()
    onCallEnded?.()
  }

  // TRẠNG THÁI ĐANG THỰC HIỆN CUỘC GỌI / ĐANG THOẠI -> Hiển thị hộp điều khiển tại chỗ (Đồng bộ phong cách Telesale)
  if (isThisCustomerInCall || isDialing) {
    return (
      <div
        style={{
          margin: '14px 0 16px',
          padding: '12px 14px',
          borderRadius: '10px',
          background: '#f8fbff',
          border: '1px solid #e2eaf4',
          boxShadow: '0 2px 8px rgba(30, 71, 129, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxSizing: 'border-box',
          width: '100%',
          ...style,
        }}
        className={className}
      >
        {/* Header: Trạng thái cuộc gọi & Đồng hồ đếm giây */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor:
                  callStatus === 'connected'
                    ? '#16a34a'
                    : callStatus === 'paused'
                      ? '#d97706'
                      : '#2563eb',
                boxShadow:
                  callStatus === 'connected'
                    ? '0 0 0 3px #dcfce7'
                    : callStatus === 'paused'
                      ? '0 0 0 3px #fef3c7'
                      : '0 0 0 3px #dbeafe',
              }}
            />
            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#263e69' }}>
              {callStatus === 'calling' || isDialing
                ? 'Đang quay số...'
                : callStatus === 'paused'
                  ? 'Đang giữ máy'
                  : 'Đang đàm thoại'}
            </span>
            {(memberName || activeCaller?.memberName) && (
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                ({memberName || activeCaller?.memberName})
              </span>
            )}
          </div>

          {/* Đồng hồ thời lượng kiểu Telesale */}
          <strong
            style={{
              fontFamily: 'monospace',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1e73db',
              letterSpacing: '-0.2px',
            }}
          >
            <CallDurationText />
          </strong>
        </div>

        {/* Cụm nút điều khiển đàm thoại chuẩn Telesale */}
        <div className="call-controls" style={{ padding: '6px 0 2px', gap: 'clamp(10px, 4vw, 24px)' }}>
          <button
            type="button"
            onClick={() => toggleMute()}
            className={clsx({ selected: isMuted })}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span>
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </span>
            {isMuted ? 'Bật mic' : 'Tắt mic'}
          </button>

          <button
            type="button"
            onClick={() => toggleHold()}
            className={clsx({ selected: isHeld })}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span>
              {isHeld ? <Play size={20} /> : <Pause size={20} />}
            </span>
            {isHeld ? 'Tiếp tục' : 'Giữ máy'}
          </button>

          <button
            className="end"
            type="button"
            onClick={handleEndCall}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <span>
              <PhoneOff size={20} />
            </span>
            Kết thúc
          </button>
        </div>
      </div>
    )
  }

  // TRẠNG THÁI BÌNH THƯỜNG -> Hiển thị nút gọi
  return (
    <button
      className={clsx('contact-button', className)}
      onClick={handleStartCall}
      type="button"
      disabled={disabled || isDialing}
      style={{
        opacity: disabled || isDialing ? 0.7 : 1,
        cursor: disabled || isDialing ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {buttonIcon || <Phone size={18} />}
      {isDialing ? 'Đang quay số kết nối...' : buttonText}
    </button>
  )
}

