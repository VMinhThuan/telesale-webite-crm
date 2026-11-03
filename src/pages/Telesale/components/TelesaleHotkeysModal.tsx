import React, { useEffect } from 'react'
import {
  CircleAlert,
  Keyboard,
  Mic,
  PhoneCall,
  PhoneOff,
  RotateCw,
  SkipForward,
  Volume2,
  X,
} from 'lucide-react'

export interface TelesaleHotkeysModalProps {
  isOpen: boolean
  onClose: () => void
}

export const TelesaleHotkeysModal: React.FC<TelesaleHotkeysModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Lắng nghe phím Escape để đóng modal với capturing phase
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const keyBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3px 8px',
    borderRadius: '6px',
    background: '#f1f5f9',
    border: '1.5px solid #cbd5e1',
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '12px',
    fontWeight: 700,
    color: '#1e293b',
    minWidth: '28px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Keyboard size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Phím tắt đàm thoại Telesale
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Thao tác nhanh bàn phím giúp tối ưu năng suất làm việc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Đóng bảng phím tắt"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Nhóm 1: Trong cuộc gọi */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#2563eb',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              1. Trong khi đàm thoại
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Volume2 size={16} style={{ color: '#d97706' }} /> Giữ máy / Tiếp tục (Hold / Unhold)
                </span>
                <span style={keyBadgeStyle}>Space</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Mic size={16} style={{ color: '#2563eb' }} /> Bật / Tắt micro (Mute / Unmute)
                </span>
                <span style={keyBadgeStyle}>M</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <PhoneOff size={16} style={{ color: '#dc2626' }} /> Gác máy / Kết thúc cuộc gọi
                </span>
                <span style={keyBadgeStyle}>Esc</span>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Quay số & Khách hàng */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#16a34a',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              2. Thao tác quay số & khách hàng
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <PhoneCall size={16} style={{ color: '#16a34a' }} /> Bắt đầu gọi / Gọi lại
                </span>
                <span style={keyBadgeStyle}>Enter</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <SkipForward size={16} style={{ color: '#475569' }} /> Đổi sang khách hàng khác
                </span>
                <span style={keyBadgeStyle}>N</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <RotateCw size={16} style={{ color: '#2563eb' }} /> Gọi lại số vừa kết thúc
                </span>
                <span style={keyBadgeStyle}>R</span>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Chuyển Line / Tab */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#7c3aed',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px',
              }}
            >
              3. Chuyển đổi Line đàm thoại đa tab
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '13px', color: '#334155' }}>
                  Chuyển nhanh sang Line 1 / Line 2 / Line 3
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={keyBadgeStyle}>Alt</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>+</span>
                  <span style={keyBadgeStyle}>1</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>/</span>
                  <span style={keyBadgeStyle}>2</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>/</span>
                  <span style={keyBadgeStyle}>3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Banner lưu ý bảo vệ nhập liệu */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '9px',
              fontSize: '12px',
              color: '#92400e',
              lineHeight: 1.5,
            }}
          >
            <CircleAlert size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
            <span>
              <b>Cơ chế chống gõ nhầm:</b> Toàn bộ phím tắt ký tự (Space, M, N, R, Enter) sẽ tự động tạm ngưng khi bạn đang nhập liệu hoặc ghi chú trong các ô văn bản.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
