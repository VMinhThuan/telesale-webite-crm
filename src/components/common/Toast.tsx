import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { ToastType } from '../../utils/notify'

interface ToastProps {
  message: string
  type?: ToastType
  onClose?: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  if (!message) return null

  const renderIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
      case 'error':
        return <AlertCircle size={18} style={{ color: '#f87171', flexShrink: 0 }} />
      case 'success':
        return <CheckCircle2 size={18} style={{ color: '#34d399', flexShrink: 0 }} />
      default:
        return <Info size={18} style={{ color: '#60a5fa', flexShrink: 0 }} />
    }
  }

  const getBorderColor = () => {
    switch (type) {
      case 'warning':
        return 'rgba(245, 158, 11, 0.45)'
      case 'error':
        return 'rgba(239, 68, 68, 0.5)'
      case 'success':
        return 'rgba(52, 211, 153, 0.4)'
      default:
        return 'rgba(96, 165, 250, 0.3)'
    }
  }

  return (
    <div
      className={`mock-toast mock-toast-${type}`}
      style={{
        border: `1.5px solid ${getBorderColor()}`,
      }}
      role="alert"
    >
      {renderIcon()}
      <span style={{ flex: 1, lineHeight: 1.45, fontSize: '12px' }}>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: '6px',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
