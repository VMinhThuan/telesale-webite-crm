import React, { useState } from 'react'
import {
  ExternalLink,
  FastForward,
  FileText,
  Play,
  RotateCcw,
  X,
} from 'lucide-react'
import { TrainingMaterial } from '../../../types/training'

interface TrainingViewerModalProps {
  material: TrainingMaterial | null
  onClose: () => void
}

export const TrainingViewerModal: React.FC<TrainingViewerModalProps> = ({
  material,
  onClose,
}) => {
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const videoRef = React.useRef<HTMLVideoElement>(null)

  if (!material) return null

  const isVideo = material.type === 'video'

  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
  }

  const handleSkipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds
    }
  }

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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: isVideo ? '960px' : '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isVideo ? '#eff6ff' : '#ecfdf5',
                color: isVideo ? '#2563eb' : '#059669',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {isVideo ? <Play size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                {material.title}
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                {material.category} · {material.meta}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút mở tab mới */}
            <a
              href={material.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <ExternalLink size={14} /> Mở tab mới
            </a>

            {/* Nút đóng */}
            <button
              onClick={onClose}
              type="button"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                background: '#e2e8f0',
                color: '#475569',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nội dung: Video hoặc PDF Iframe */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            background: isVideo ? '#090d16' : '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isVideo ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              <video
                ref={videoRef}
                src={material.fileUrl}
                controls
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '68vh',
                  objectFit: 'contain',
                  outline: 'none',
                }}
              />
              {/* Thanh điều khiển phụ trợ cho video học tập */}
              <div
                style={{
                  padding: '10px 20px',
                  background: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  color: '#cbd5e1',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => handleSkipTime(-10)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={14} /> Lùi 10s
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSkipTime(10)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'transparent',
                      border: 'none',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    <FastForward size={14} /> Tiến 10s
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Tốc độ học:</span>
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => handleChangePlaybackRate(rate)}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        border: 'none',
                        background: playbackRate === rate ? '#3b82f6' : '#334155',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <iframe
              src={material.fileUrl}
              title={material.title}
              style={{
                width: '100%',
                height: '75vh',
                border: 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default TrainingViewerModal

