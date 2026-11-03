import React, { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Plus,
  Settings,
} from 'lucide-react'
import { useTelesaleConfig } from '../../hooks/useTelesaleConfig'
import { SidebarBannerModal } from './SidebarBannerModal'

interface SidebarBannerProps {
  collapsed?: boolean
}

export const SidebarBanner: React.FC<SidebarBannerProps> = ({ collapsed }) => {
  const { data: config } = useTelesaleConfig()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const bannerConfig = config?.banners
  const items = bannerConfig?.items || []
  const count = items.length

  // Tự động lướt banner theo intervalSeconds
  useEffect(() => {
    if (count <= 1 || isPaused || bannerConfig?.autoPlay === false) {
      return
    }

    const intervalMs = Math.max(2, bannerConfig?.intervalSeconds || 5) * 1000
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % count)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [count, isPaused, bannerConfig?.autoPlay, bannerConfig?.intervalSeconds])

  // Reset index nếu count thay đổi
  useEffect(() => {
    if (currentIndex >= count && count > 0) {
      setCurrentIndex(0)
    }
  }, [count, currentIndex])

  // Không hiển thị khi sidebar bị thu gọn hoàn toàn
  if (collapsed) {
    return null
  }

  const currentBanner = items[currentIndex]

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + count) % count)
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % count)
  }

  return (
    <div
      className="sidebar-banner-container"
      style={{
        margin: '14px 10px 8px',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(23, 59, 116, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 4px 14px rgba(7, 28, 61, 0.35)',
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Nút Cài đặt / Quản lý Banner */}
      <button
        type="button"
        title="Quản lý banner"
        onClick={() => setIsModalOpen(true)}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          zIndex: 10,
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#ffffff',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.2s',
        }}
      >
        <Settings size={13} />
      </button>

      {/* Trường hợp chưa có ảnh nào */}
      {count === 0 ? (
        <div
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '18px 12px',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(42, 101, 188, 0.5)',
              display: 'grid',
              placeItems: 'center',
              color: '#94c5ff',
            }}
          >
            <ImageIcon size={18} />
          </div>
          <strong style={{ fontSize: '12px', color: '#f1f5f9' }}>
            Banner thông báo
          </strong>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>
            Nhấn để thêm ảnh trình chiếu
          </span>
          <button
            type="button"
            style={{
              marginTop: '4px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={12} /> Thêm banner
          </button>
        </div>
      ) : (
        /* Trường hợp có ảnh */
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10' }}>
          {currentBanner?.linkUrl ? (
            <a
              href={currentBanner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', width: '100%', height: '100%' }}
            >
              <img
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </a>
          ) : (
            <img
              src={currentBanner?.imageUrl}
              alt={currentBanner?.title || 'Banner'}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )}

          {/* Tiêu đề mờ ở đáy banner nếu có */}
          {currentBanner?.title && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 8px 6px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentBanner.title}
            </div>
          )}

          {/* Điều khiển chuyển ảnh khi có nhiều hơn 1 ảnh */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  position: 'absolute',
                  left: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                style={{
                  position: 'absolute',
                  right: '4px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: 'none',
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ChevronRight size={14} />
              </button>

              {/* Dots chỉ số */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '4px',
                  zIndex: 2,
                }}
              >
                {items.map((_, i) => (
                  <span
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: i === currentIndex ? '12px' : '4px',
                      height: '4px',
                      borderRadius: '2px',
                      background: i === currentIndex ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.25s',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal Quản lý */}
      {isModalOpen && bannerConfig && (
        <SidebarBannerModal
          bannerConfig={bannerConfig}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  )
}
export default SidebarBanner

