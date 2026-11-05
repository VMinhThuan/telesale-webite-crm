import React, { useEffect } from 'react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'

interface DeleteCategoryConfirmModalProps {
  categoryName: string
  materialCount: number
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const DeleteCategoryConfirmModal: React.FC<DeleteCategoryConfirmModalProps> = ({
  categoryName,
  materialCount,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDeleting, onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={() => {
        if (!isDeleting) onClose()
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #fee2e2',
            background: '#fff1f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#ffe4e6',
                display: 'grid',
                placeItems: 'center',
                color: '#e11d48',
              }}
            >
              <Trash2 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#9f1239' }}>
                Xác nhận xóa danh mục
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#be123c' }}>
                Phân loại: <strong>{categoryName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#9f1239',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'grid',
              placeItems: 'center',
              opacity: isDeleting ? 0.5 : 0.8,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Cảnh Báo */}
        <div style={{ padding: '20px 22px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.55 }}>
            Bạn có chắc chắn muốn xóa danh mục <strong>"{categoryName}"</strong> không?
          </p>

          {materialCount > 0 ? (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '10px',
                display: 'flex',
                gap: '11px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={20} style={{ color: '#e53e3e', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12.5px', color: '#742a2a', lineHeight: 1.5 }}>
                <strong style={{ color: '#c53030' }}>Cảnh báo ảnh hưởng dữ liệu:</strong>
                <p style={{ margin: '4px 0 0' }}>
                  Danh mục này đang chứa <strong>{materialCount} tài liệu</strong>. Khi xóa,{' '}
                  <span style={{ fontWeight: 700, color: '#e53e3e' }}>
                    toàn bộ {materialCount} tài liệu bên trong
                  </span>{' '}
                  (kèm tệp lưu trữ trên Cloudflare R2) sẽ <strong>bị xóa vĩnh viễn</strong> và không thể khôi phục!
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: '#64748b',
                lineHeight: 1.5,
              }}
            >
              Danh mục này hiện chưa có tài liệu nào. Tab danh mục sẽ bị xóa khỏi hệ thống.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1,
            }}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            style={{
              height: '38px',
              padding: '0 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)',
              opacity: isDeleting ? 0.8 : 1,
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xóa...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Xác nhận xóa vĩnh viễn</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteCategoryConfirmModal

