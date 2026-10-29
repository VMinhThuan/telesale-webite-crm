import React, { useEffect, useState } from 'react'
import { Download, ExternalLink, Loader2, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'

export interface LightboxImage {
  url: string
  title?: string
  date?: string
}

export interface ImageLightboxModalProps {
  isOpen: boolean
  image: LightboxImage | null
  onClose: () => void
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  image,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Reset trạng thái phóng to / xoay khi mở ảnh mới
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setIsLoading(true)
    }
  }, [isOpen, image?.url])

  // Lắng nghe phím tắt: Escape để đóng, + / - để zoom
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(prev + 0.25, 3))
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => Math.max(prev - 0.25, 0.5))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !image || !image.url) return null

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((prev) => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((prev) => Math.max(prev - 0.25, 0.5))
  }

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!image.url) return

    try {
      const response = await fetch(image.url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = image.title || 'hinh-anh.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(image.url, '_blank')
    }
  }

  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(image.url, '_blank')
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Thanh công cụ phía trên */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          zIndex: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ fontSize: '15px', color: '#f8fafc' }}>
            {image.title || 'Chi tiết hình ảnh'}
          </strong>
          {image.date && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{image.date}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            title="Thu nhỏ (-)"
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: zoom <= 0.5 ? 'not-allowed' : 'pointer',
              opacity: zoom <= 0.5 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <ZoomOut size={18} />
          </button>

          <span
            style={{
              fontSize: '12px',
              color: '#cbd5e1',
              minWidth: '46px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            title="Phóng to (+)"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: zoom >= 3 ? 'not-allowed' : 'pointer',
              opacity: zoom >= 3 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <ZoomIn size={18} />
          </button>

          <button
            type="button"
            title="Xoay 90 độ"
            onClick={handleRotate}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RotateCw size={18} />
          </button>

          <button
            type="button"
            title="Mở tab mới"
            onClick={handleOpenNewTab}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <ExternalLink size={18} />
          </button>

          <button
            type="button"
            title="Tải ảnh về máy"
            onClick={handleDownload}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Download size={18} />
          </button>

          <button
            type="button"
            title="Đóng (Esc)"
            onClick={onClose}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              marginLeft: '8px',
              transition: 'all 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Vùng hiển thị ảnh chính */}
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              color: '#94a3b8',
            }}
          >
            <Loader2 size={32} className="spin" />
            <span style={{ fontSize: '13px' }}>Đang nạp ảnh...</span>
          </div>
        )}

        <img
          src={image.url}
          alt={image.title || 'Xem ảnh'}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            userSelect: 'none',
            display: isLoading ? 'none' : 'block',
          }}
        />
      </div>
    </div>
  )
}

export default ImageLightboxModal
