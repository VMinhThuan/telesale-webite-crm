import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ExternalLink,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  PhoneOff,
  Play,
} from 'lucide-react'
import { useCallStore, CallDurationText } from '../../store/useCallStore'
import { formatDuration } from '../../utils/formatters'
import { notify } from '../../utils/notify'

export const FloatingCallWidget: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const status = useCallStore((s) => s.status)
  const caller = useCallStore((s) => s.caller)
  const isMuted = useCallStore((s) => s.isMuted)
  const isHeld = useCallStore((s) => s.isHeld)
  const toggleMute = useCallStore((s) => s.toggleMute)
  const toggleHold = useCallStore((s) => s.toggleHold)
  const endCall = useCallStore((s) => s.endCall)

  // Chỉ hiển thị widget nổi khi có cuộc gọi đang diễn ra và người dùng KHÔNG ở màn hình /telesale
  const isCallActive = status === 'calling' || status === 'connected' || status === 'paused'
  const isTelesalePage = location.pathname === '/telesale'

  if (!isCallActive || isTelesalePage) {
    return null
  }

  const handleOpenTelesale = () => {
    navigate('/telesale')
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9990,
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        maxWidth: '420px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Icon trạng thái cuộc gọi với hiệu ứng nhấp nháy */}
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: status === 'paused' ? '#d97706' : '#10b981',
          display: 'grid',
          placeItems: 'center',
          color: '#ffffff',
          flexShrink: 0,
          position: 'relative',
        }}
      >
        <PhoneCall size={20} />
        {status === 'connected' && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#34d399',
              border: '2px solid #1e293b',
            }}
          />
        )}
      </div>

      {/* Thông tin khách hàng & thời lượng */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <strong
            style={{
              fontSize: '13px',
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {caller?.customerName || 'Khách hàng'}
          </strong>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: status === 'paused' ? '#78350f' : '#064e3b',
              color: status === 'paused' ? '#fde68a' : '#a7f3d0',
              fontWeight: 600,
            }}
          >
            {status === 'calling' ? 'Đang gọi...' : status === 'paused' ? 'Giữ máy' : 'Đang thoại'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {caller?.phoneMasked || '*** *** ***'}
          </span>
          <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
            <CallDurationText />
          </span>
        </div>
      </div>

      {/* Các nút thao tác nhanh cuộc gọi */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          onClick={() => {
            toggleMute()
            notify(!isMuted ? 'Đã tắt mic' : 'Đã bật mic')
          }}
          title={isMuted ? 'Bật micro' : 'Tắt micro'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isMuted ? '#ef4444' : '#334155',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        <button
          type="button"
          onClick={() => {
            toggleHold()
            notify(!isHeld ? 'Đang giữ máy' : 'Tiếp tục cuộc gọi')
          }}
          title={isHeld ? 'Tiếp tục' : 'Giữ máy'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isHeld ? '#f59e0b' : '#334155',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          {isHeld ? <Play size={16} /> : <Pause size={16} />}
        </button>

        <button
          type="button"
          onClick={() => {
            endCall()
            notify('Đã kết thúc cuộc gọi')
          }}
          title="Gác máy"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#dc2626',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <PhoneOff size={16} />
        </button>

        <button
          type="button"
          onClick={handleOpenTelesale}
          title="Mở bàn làm việc đàm thoại"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={16} />
        </button>
      </div>
    </div>
  )
}

export default FloatingCallWidget
