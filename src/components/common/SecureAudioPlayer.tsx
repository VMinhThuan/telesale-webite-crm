import React, { useRef, useState } from 'react'
import { AlertCircle, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import useSignedMedia, { UseSignedMediaOptions } from '../../hooks/useSignedMedia'

export interface SecureAudioPlayerProps extends UseSignedMediaOptions {
  /** Signed URL ban đầu */
  src?: string | null
  /** Tiêu đề bản ghi âm (vd: Cuộc gọi lúc 10:30) */
  title?: string
  /** Thời lượng hiển thị dạng text nếu có (vd: 02:45) */
  durationLabel?: string
  /** Giao diện thu gọn (compact mode) cho khung chat nhỏ */
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Định dạng số giây thành chuỗi mm:ss
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Trình phát ghi âm thông minh tự động re-fetch Signed URL khi gặp lỗi 403 / hết hạn.
 */
export const SecureAudioPlayer: React.FC<SecureAudioPlayerProps> = ({
  src,
  onRefreshUrl,
  maxRetries = 2,
  autoResume = true,
  title,
  durationLabel,
  compact = false,
  className = '',
  style = {},
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const {
    mediaUrl,
    isRefreshing,
    hasError,
    handleMediaError,
    handleLoadedMetadata: onLoadedMetadataHook,
    manualRetry,
  } = useSignedMedia(src, {
    onRefreshUrl,
    maxRetries,
    autoResume,
  })

  // Điều khiển Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          // Nếu lỗi phát sinh, trình duyệt sẽ tự bắn onError
          console.warn('Lỗi khi phát audio:', err)
        })
    }
  }

  // Cập nhật tiến trình thời gian
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  // Nạp metadata độ dài audio
  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    onLoadedMetadataHook(e)
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
    }
  }

  // Khi người dùng kéo tua thanh trượt
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value)
    setCurrentTime(targetTime)
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime
    }
  }

  // Bật/tắt âm lượng
  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  // Khi phát hết bài
  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  if (!mediaUrl && !isRefreshing) {
    return (
      <div
        className={`secure-audio-empty ${className}`}
        style={{
          fontSize: '11px',
          color: '#94a3b8',
          fontStyle: 'italic',
          padding: '4px 8px',
          ...style,
        }}
      >
        Không có dữ liệu ghi âm
      </div>
    )
  }

  return (
    <div
      className={`secure-audio-player ${compact ? 'compact' : ''} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: '#f8fafc',
        border: hasError ? '1px solid #fecdd3' : '1px solid #e2e8f0',
        borderRadius: compact ? '8px' : '10px',
        padding: compact ? '6px 10px' : '8px 12px',
        maxWidth: compact ? '260px' : '340px',
        fontSize: '12px',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      <audio
        ref={audioRef}
        src={mediaUrl || undefined}
        preload="metadata"
        onError={handleMediaError}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ display: 'none' }}
      />

      {/* Tiêu đề & Cảnh báo trạng thái */}
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: '#334155', fontSize: '11px' }}>{title}</span>
          {durationLabel && <span style={{ color: '#64748b', fontSize: '10px' }}>{durationLabel}</span>}
        </div>
      )}

      {/* Hiển thị lỗi hoặc làm mới khi Signed URL 403 */}
      {hasError ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            color: '#e11d48',
            fontSize: '11px',
            background: '#fff1f2',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} />
            <span>Link hết hạn (403)</span>
          </div>
          <button
            type="button"
            onClick={manualRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              border: 'none',
              background: '#e11d48',
              color: '#fff',
              borderRadius: '4px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={11} /> Tải lại
          </button>
        </div>
      ) : (
        /* Thanh điều khiển Play / Scrubber */
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={togglePlay}
            disabled={isRefreshing}
            title={isPlaying ? 'Tạm dừng' : 'Phát ghi âm'}
            style={{
              width: compact ? '28px' : '32px',
              height: compact ? '28px' : '32px',
              borderRadius: '50%',
              border: 'none',
              background: isRefreshing ? '#cbd5e1' : '#2563eb',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isRefreshing ? 'wait' : 'pointer',
              flexShrink: 0,
            }}
          >
            {isRefreshing ? (
              <Loader2 size={compact ? 14 : 16} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={compact ? 13 : 15} />
            ) : (
              <Play size={compact ? 13 : 15} style={{ marginLeft: '1px' }} />
            )}
          </button>

          {/* Scrubber kéo thanh thời gian */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '2px' }}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={isRefreshing || hasError || duration <= 0}
              style={{
                width: '100%',
                height: '4px',
                accentColor: '#2563eb',
                cursor: duration > 0 ? 'pointer' : 'default',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#64748b',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{isRefreshing ? 'Đang làm mới link...' : formatTime(duration)}</span>
            </div>
          </div>

          {/* Mute button */}
          {!compact && (
            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SecureAudioPlayer

