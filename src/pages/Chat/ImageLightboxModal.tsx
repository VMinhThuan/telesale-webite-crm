import React, { useEffect, useState } from 'react'
import { Download, ExternalLink, Loader2, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react'
import { LightboxImage } from './types'

export type { LightboxImage }

interface ImageLightboxModalProps {
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
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Thanh công cụ phía trên */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <strong
            style={{
              fontSize: '13px',
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '450px',
            }}
          >
            {image.title || 'Xem hình ảnh'}
          </strong>
          {image.date && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Thời gian: {image.date}
            </span>
          )}
        </div>

        {/* Các nút chức năng */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Phóng to (+)"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            title="Thu nhỏ (-)"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ZoomOut size={16} />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            title="Xoay 90 độ"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <RotateCw size={16} />
          </button>

          <button
            type="button"
            onClick={handleDownload}
            title="Tải ảnh về máy"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={handleOpenNewTab}
            title="Mở trong tab mới"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <ExternalLink size={16} />
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />

          <button
            type="button"
            onClick={onClose}
            title="Đóng (Esc)"
            style={{
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Vùng hiển thị ảnh phóng to */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          position: 'relative',
          padding: '24px',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#94a3b8',
              fontSize: '13px',
            }}
          >
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            Đang tải ảnh kích thước lớn...
          </div>
        )}

        <img
          src={image.url}
          alt={image.title || 'Hình ảnh'}
          onLoad={() => setIsLoading(false)}
          onClick={(e) => {
            e.stopPropagation()
            // Click vào ảnh: zoom toggle giữa 1x và 1.75x
            setZoom((prev) => (prev === 1 ? 1.75 : 1))
          }}
          style={{
            maxWidth: '90vw',
            maxHeight: '82vh',
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: zoom === 1 ? 'zoom-in' : 'zoom-out',
            display: isLoading ? 'none' : 'block',
            userSelect: 'none',
          }}
        />
      </div>
    </div>
  )
}