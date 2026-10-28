import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
  colSpan?: number
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Không thể kết nối đến máy chủ ERP. Vui lòng kiểm tra lại đường truyền.',
  onRetry,
  colSpan,
}) => {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '10px',
          color: '#ef4444',
        }}
      >
        <AlertCircle size={24} />
      </div>
      <strong style={{ fontSize: '14px', color: '#991b1b', marginBottom: '6px' }}>
        Lỗi tải dữ liệu
      </strong>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px 0', maxWidth: '360px' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            fontSize: '13px',
            borderRadius: '6px',
            border: '1px solid #fca5a5',
            background: '#ffffff',
            color: '#b91c1c',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <RotateCcw size={14} /> Thử lại
        </button>
      )}
    </div>
  )

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    )
  }

  return content
}

export default ErrorState
