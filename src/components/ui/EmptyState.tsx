import React from 'react'
import { Inbox, LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: LucideIcon
  actionText?: string
  onAction?: () => void
  colSpan?: number
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Không có dữ liệu',
  description = 'Không tìm thấy bản ghi nào phù hợp với điều kiện tìm kiếm.',
  icon: Icon = Inbox,
  actionText,
  onAction,
  colSpan,
}) => {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        color: '#64748b',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          color: '#94a3b8',
        }}
      >
        <Icon size={26} />
      </div>
      <strong style={{ fontSize: '15px', color: '#1e293b', marginBottom: '4px' }}>
        {title}
      </strong>
      <p style={{ fontSize: '13px', margin: '0 0 16px 0', maxWidth: '320px', lineHeight: 1.5 }}>
        {description}
      </p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {actionText}
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

export default EmptyState
