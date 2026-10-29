import React, { useRef } from 'react'
import { AlertCircle, Film, Loader2, RotateCcw } from 'lucide-react'
import useSignedMedia, { UseSignedMediaOptions } from '../../hooks/useSignedMedia'

export interface SecureVideoPlayerProps extends UseSignedMediaOptions {
  /** Signed URL ban đầu */
  src?: string | null
  /** Ảnh bìa video (poster) */
  poster?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Trình phát video thông minh tự động re-fetch Signed URL khi gặp lỗi 403 / hết hạn sau 15 phút.
 */
export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  src,
  onRefreshUrl,
  maxRetries = 2,
  autoResume = true,
  poster,
  className = '',
  style = {},
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const {
    mediaUrl,
    isRefreshing,
    hasError,
    handleMediaError,
    handleLoadedMetadata,
    manualRetry,
  } = useSignedMedia(src, {
    onRefreshUrl,
    maxRetries,
    autoResume,
  })

  if (!mediaUrl && !isRefreshing) {
    return (
      <div
        className={`secure-video-empty ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          height: '140px',
          background: '#0f172a',
          color: '#94a3b8',
          borderRadius: '8px',
          fontSize: '11px',
          ...style,
        }}
      >
        <Film size={18} />
        <span>Không có video khả dụng</span>
      </div>
    )
  }

  return (
    <div
      className={`secure-video-container ${className}`}
      style={{
        position: 'relative',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#0f172a',
        maxWidth: '320px',
        ...style,
      }}
    >
      <video
        ref={videoRef}
        src={mediaUrl || undefined}
        poster={poster}
        controls={!hasError && !isRefreshing}
        preload="none"
        onError={handleMediaError}
        onLoadedMetadata={handleLoadedMetadata}
        style={{
          width: '100%',
          maxHeight: '240px',
          display: 'block',
          objectFit: 'contain',
        }}
      />

      {/* Lớp phủ khi đang lấy lại Signed URL mới */}
      {isRefreshing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#fff',
            fontSize: '11px',
            zIndex: 10,
          }}
        >
          <Loader2 size={24} className="animate-spin text-blue-400" />
          <span>Đang làm mới link video...</span>
        </div>
      )}

      {/* Lớp phủ khi link đã hết hạn hoặc lỗi */}
      {hasError && !isRefreshing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            color: '#fff',
            padding: '16px',
            textAlign: 'center',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          <AlertCircle size={24} color="#f43f5e" />
          <span>Link video đã hết hạn (403)</span>
          <button
            type="button"
            onClick={manualRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={13} /> Làm mới link
          </button>
        </div>
      )}
    </div>
  )
}

export default SecureVideoPlayer

