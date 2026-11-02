import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

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
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)
  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })

  // Trạng thái kéo rê chuột (Pan / Drag) khi phóng to
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)

  // Cập nhật kích thước khung nhìn khi người dùng co giãn cửa sổ
  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen])

  // Reset toàn bộ trạng thái hiển thị, vị trí, zoom khi mở ảnh mới
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setRotation(0)
      setPosition({ x: 0, y: 0 })
      setIsLoading(true)
      setNaturalSize(null)
    }
  }, [isOpen, image?.url])

  // Lắng nghe phím tắt: Escape để đóng, + / - để zoom, 0 để reset, R để xoay
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4))
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => {
          const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5)
          if (next === 1) setPosition({ x: 0, y: 0 })
          return next
        })
      } else if (e.key === '0') {
        setZoom(1)
        setRotation(0)
        setPosition({ x: 0, y: 0 })
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((prev) => (prev + 90) % 360)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Kéo rê chuột (Pan) trên toàn màn hình
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Lăn bánh xe chuột (Mouse Wheel) để phóng to / thu nhỏ mượt mà
  useEffect(() => {
    if (!isOpen) return
    const stageEl = stageRef.current
    if (!stageEl) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY < 0 ? 0.2 : -0.2
      setZoom((prev) => {
        const next = Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 4)
        if (next === 1) {
          setPosition({ x: 0, y: 0 })
        }
        return next
      })
    }

    stageEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      stageEl.removeEventListener('wheel', handleWheel)
    }
  }, [isOpen])

  // Tính toán kích thước hiển thị vừa vặn khung hình (Fit-to-Screen)
  const fitDimensions = useMemo(() => {
    if (!naturalSize || naturalSize.w === 0 || naturalSize.h === 0) {
      return {
        maxWidth: 'min(88vw, 1300px)',
        maxHeight: 'calc(100vh - 140px)',
        width: 'auto',
        height: 'auto',
      }
    }

    // Không gian tối đa cho ảnh
    const maxW = Math.min(viewportSize.width * 0.88, 1300)
    const maxH = Math.max(viewportSize.height - 140, 300)

    const ratio = naturalSize.w / naturalSize.h
    let targetW = maxW
    let targetH = targetW / ratio

    if (targetH > maxH) {
      targetH = maxH
      targetW = targetH * ratio
    }

    return {
      width: `${Math.round(targetW)}px`,
      height: `${Math.round(targetH)}px`,
    }
  }, [naturalSize, viewportSize])

  if (!isOpen || !image || !image.url) return null

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom((prev) => {
      const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5)
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const handleResetFit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
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

  // Bắt đầu kéo rê chuột
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // Chỉ nhận chuột trái
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  // Double click: chuyển đổi giữa 1x (Fit màn hình) và 2x (Phóng to xem chi tiết)
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (zoom !== 1 || position.x !== 0 || position.y !== 0) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setZoom(2)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        animation: 'fadeIn 0.2s ease-out',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      {/* Thanh công cụ phía trên */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '64px',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#ffffff',
          zIndex: 10,
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.75) 0%, rgba(15, 23, 42, 0) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '50%' }}>
          <strong
            style={{
              fontSize: '15px',
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {image.title || 'Chi tiết hình ảnh'}
          </strong>
          {image.date && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{image.date}</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            title="Thu nhỏ (-) hoặc lăn chuột"
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
              fontSize: '13px',
              fontWeight: 500,
              color: '#cbd5e1',
              minWidth: '50px',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            title="Phóng to (+) hoặc lăn chuột"
            onClick={handleZoomIn}
            disabled={zoom >= 4}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: zoom >= 4 ? 'not-allowed' : 'pointer',
              opacity: zoom >= 4 ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
          >
            <ZoomIn size={18} />
          </button>

          <button
            type="button"
            title="Đặt lại vừa màn hình (Phím 0 hoặc nhấp đúp)"
            onClick={handleResetFit}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: zoom !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0
                ? 'rgba(59, 130, 246, 0.3)'
                : 'rgba(255, 255, 255, 0.1)',
              color: zoom !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0
                ? '#60a5fa'
                : '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <Maximize2 size={18} />
          </button>

          <button
            type="button"
            title="Xoay 90 độ (Phím R)"
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

      {/* Vùng hiển thị ảnh chính (Stage Viewport) */}
      <div
        ref={stageRef}
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 100px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onClick={(e) => {
          // Bấm ra vùng đen ngoài ảnh sẽ đóng modal
          if (e.target === stageRef.current) {
            onClose()
          }
        }}
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
              zIndex: 3,
            }}
          >
            <Loader2 size={36} className="spin" />
            <span style={{ fontSize: '13px' }}>Đang nạp ảnh...</span>
          </div>
        )}

        <img
          src={image.url}
          alt={image.title || 'Xem ảnh'}
          onLoad={(e) => {
            setIsLoading(false)
            const img = e.currentTarget
            if (img.naturalWidth && img.naturalHeight) {
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
            }
          }}
          onError={() => setIsLoading(false)}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          style={{
            ...fitDimensions,
            objectFit: 'contain',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            userSelect: 'none',
            display: isLoading ? 'none' : 'block',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
          }}
        />
      </div>

      {/* Gợi ý tương tác phía dưới */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '12px',
          color: '#94a3b8',
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          padding: '6px 14px',
          borderRadius: '20px',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      >
        <span>Lăn chuột để phóng to/thu nhỏ</span>
        <span>•</span>
        <span>Nhấp đúp để đổi kích thước</span>
        {zoom > 1 && (
          <>
            <span>•</span>
            <span style={{ color: '#60a5fa' }}>Giữ chuột trái để kéo xem ảnh</span>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageLightboxModal
