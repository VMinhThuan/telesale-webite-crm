import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  eyebrow?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: React.ReactNode
  className?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  eyebrow,
  children,
  size = 'md',
  footer,
  className,
}) => {
  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeWidths = {
    sm: '380px',
    md: '480px',
    lg: '640px',
  }

  return (
    <div
      className="mock-dialog-backdrop"
      style={{ zIndex: 9999, display: 'grid', placeItems: 'center' }}
      onClick={onClose}
    >
      <div
        className={clsx('mock-dialog', className)}
        style={{
          width: sizeWidths[size],
          maxWidth: '94vw',
          textAlign: 'left',
          position: 'relative',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="dialog-close"
          type="button"
          onClick={onClose}
          aria-label="Đóng hộp thoại"
        >
          <X size={18} />
        </button>

        {(eyebrow || title) && (
          <div style={{ marginBottom: '16px' }}>
            {eyebrow && <p className="eyebrow" style={{ margin: '0 0 4px 0' }}>{eyebrow}</p>}
            {title && <h3 style={{ margin: 0, color: '#1e3868', fontSize: '18px', fontWeight: 700 }}>{title}</h3>}
          </div>
        )}

        <div className="modal-body" style={{ color: '#475569', fontSize: '13px' }}>
          {children}
        </div>

        {footer && (
          <div
            className="modal-footer"
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '20px',
              borderTop: '1px solid #edf2f7',
              paddingTop: '14px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Modal
