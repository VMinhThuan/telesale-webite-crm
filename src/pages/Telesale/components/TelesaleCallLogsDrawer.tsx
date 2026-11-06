import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Headphones,
  History,
  Loader2,
  MapPin,
  Pause,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Play,
  RotateCw,
  Search,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import dayjs from '../../../lib/dayjs'
import { useCallLogs } from '../../../hooks/useTelesale'
import { CallLogDto } from '../../../types/api'
import { formatDuration } from '../../../utils/formatters'
import { notify } from '../../../utils/notify'

export interface TelesaleCallLogsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

type FilterStatus = 'all' | 'connected' | 'missed' | 'record'

export const TelesaleCallLogsDrawer: React.FC<TelesaleCallLogsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const todayDisplay = useMemo(() => dayjs().format('DD/MM/YYYY'), [])

  // 1. Tải dữ liệu lịch sử cuộc gọi hôm nay qua API 10a
  const {
    data: callLogsData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useCallLogs(
    {
      from_date: todayStr,
      to_date: todayStr,
      start: 0,
      length: 100,
    },
    { enabled: isOpen },
  )

  const logs = useMemo(() => callLogsData?.items || [], [callLogsData?.items])

  // 2. Bộ lọc và tìm kiếm nhanh
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)

  // 3. Quản lý phát Audio file ghi âm (HTML5 Audio Player độc lập)
  const [playingCallId, setPlayingCallId] = useState<number | string | null>(null)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Dừng phát và dọn dẹp Audio khi đóng Drawer hoặc đổi trạng thái
  const stopAudio = React.useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setPlayingCallId(null)
    setAudioCurrentTime(0)
    setAudioDuration(0)
    setIsLoadingAudio(false)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      stopAudio()
    }
  }, [isOpen, stopAudio])

  // Đóng Drawer khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [isOpen, onClose])

  // Xử lý bật/tắt Play file ghi âm
  const handleTogglePlay = (log: CallLogDto) => {
    if (!log.record) {
      notify('Cuộc gọi này không có file ghi âm.')
      return
    }

    const logId = log.call_id ?? `${log.phone_masked}_${log.call_date_time_start}`

    // Nếu đang phát chính file này -> Pause
    if (playingCallId === logId) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {
            notify('Không thể phát tiếp file ghi âm.')
          })
        } else {
          audioRef.current.pause()
        }
      }
      return
    }

    // Nếu đang phát file khác -> Dừng file cũ
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }

    setIsLoadingAudio(true)
    setPlayingCallId(logId)
    setAudioCurrentTime(0)
    setAudioDuration(log.bill_sec || 0)

    try {
      const audio = new Audio(log.record)
      audioRef.current = audio

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setAudioDuration(Math.round(audio.duration))
        }
        setIsLoadingAudio(false)
      }

      audio.ontimeupdate = () => {
        setAudioCurrentTime(Math.round(audio.currentTime))
      }

      audio.onended = () => {
        setPlayingCallId(null)
        setAudioCurrentTime(0)
      }

      audio.onerror = () => {
        setIsLoadingAudio(false)
        setPlayingCallId(null)
        notify(
          'Không thể tải bản ghi âm. Link nghe có thể đã quá hạn 15 phút, vui lòng bấm nút "Làm mới" để nhận link mới.',
        )
      }

      audio.play().then(() => {
        setIsLoadingAudio(false)
      }).catch((err) => {
        setIsLoadingAudio(false)
        setPlayingCallId(null)
        console.warn('Lỗi audio play:', err)
        notify('Trình duyệt chặn tự động phát hoặc link ghi âm hết hạn.')
      })
    } catch {
      setIsLoadingAudio(false)
      setPlayingCallId(null)
      notify('Không thể khởi tạo trình phát âm thanh.')
    }
  }

  // Xử lý tua thời gian khi click trên progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>, totalSec: number) => {
    if (!audioRef.current || !totalSec) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const percentage = Math.max(0, Math.min(1, clickX / width))
    const targetTime = percentage * totalSec
    audioRef.current.currentTime = targetTime
    setAudioCurrentTime(Math.round(targetTime))
  }

  // Sao chép SĐT đã che hoặc mã KH
  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(text)
    setCopiedPhone(text)
    notify(`Đã sao chép: ${text}`)
    setTimeout(() => {
      setCopiedPhone(null)
    }, 2000)
  }

  // Tính toán số liệu thống kê nhanh trong ca trực hôm nay
  const stats = useMemo(() => {
    let connected = 0
    let missed = 0
    let totalBillSec = 0
    let withRecord = 0

    logs.forEach((log) => {
      const isConn =
        log.is_connected ||
        (typeof log.bill_sec === 'number' && log.bill_sec > 0) ||
        log.call_status === 'answer'

      if (isConn) {
        connected++
      } else {
        missed++
      }

      if (typeof log.bill_sec === 'number' && log.bill_sec > 0) {
        totalBillSec += log.bill_sec
      }

      if (log.record) {
        withRecord++
      }
    })

    return {
      total: logs.length,
      connected,
      missed,
      totalBillSec,
      withRecord,
    }
  }, [logs])

  // Lọc danh sách theo từ khóa tìm kiếm và tab trạng thái
  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return logs.filter((log) => {
      const isConn =
        log.is_connected ||
        (typeof log.bill_sec === 'number' && log.bill_sec > 0) ||
        log.call_status === 'answer'

      if (filterStatus === 'connected' && !isConn) return false
      if (filterStatus === 'missed' && isConn) return false
      if (filterStatus === 'record' && !log.record) return false

      if (q) {
        const name = (log.customer_name || '').toLowerCase()
        const code = (log.customer_code || '').toLowerCase()
        const phone = (log.phone_masked || '').toLowerCase()
        const address = (log.customer_address || '').toLowerCase()
        const desc = (log.description || '').toLowerCase()

        return (
          name.includes(q) ||
          code.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          desc.includes(q)
        )
      }

      return true
    })
  }, [logs, filterStatus, searchQuery])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        transition: 'background 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'drawerSlideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>
          {`
            @keyframes drawerSlideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}
        </style>

        {/* 1. Header Drawer */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>Lịch sử cuộc gọi hôm nay</span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: '#e0e7ff',
                    color: '#4338ca',
                  }}
                >
                  {stats.total} cuộc
                </span>
              </h2>
              <p
                style={{
                  margin: '3px 0 0 0',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                Ca trực ngày {todayDisplay}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút Làm mới dữ liệu */}
            <button
              type="button"
              onClick={() => {
                refetch()
                notify('Đang cập nhật danh sách cuộc gọi mới nhất...')
              }}
              disabled={isFetching}
              title="Làm mới danh sách cuộc gọi"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isFetching ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <RotateCw
                size={16}
                style={{
                  animation: isFetching ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              title="Đóng bảng (Esc)"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Khối KPI Thống kê nhanh trong ca trực */}
        <div
          style={{
            padding: '12px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tổng cuộc</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginTop: '2px' }}>
              {stats.total}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #bbf7d0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Đã kết nối</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
              {stats.connected}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #fed7aa',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 600 }}>Chưa nghe</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#c2410c', marginTop: '2px' }}>
              {stats.missed}
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #ddd6fe',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>Đàm thoại</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#4f46e5', marginTop: '4px' }}>
              {formatDuration(stats.totalBillSec)}
            </div>
          </div>
        </div>

        {/* 3. Bộ lọc trạng thái & Tìm kiếm */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#ffffff',
          }}
        >
          {/* Ô tìm kiếm */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên khách, mã KH, số điện thoại, ghi chú..."
              style={{
                width: '100%',
                height: '36px',
                padding: '0 32px 0 34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#1e293b',
                outline: 'none',
                background: '#f8fafc',
                transition: 'all 0.15s',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  width: '20px',
                  height: '20px',
                  border: 'none',
                  background: 'transparent',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Các tab trạng thái (Filter pills) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'all' ? '#1e293b' : '#f1f5f9',
                color: filterStatus === 'all' ? '#ffffff' : '#64748b',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              Tất cả ({stats.total})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('connected')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'connected' ? '#16a34a' : '#f0fdf4',
                color: filterStatus === 'connected' ? '#ffffff' : '#16a34a',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              Đã kết nối ({stats.connected})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('missed')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'missed' ? '#ea580c' : '#fff7ed',
                color: filterStatus === 'missed' ? '#ffffff' : '#ea580c',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              Không nghe ({stats.missed})
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus('record')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filterStatus === 'record' ? '#4f46e5' : '#eef2ff',
                color: filterStatus === 'record' ? '#ffffff' : '#4f46e5',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              Có ghi âm ({stats.withRecord})
            </button>
          </div>
        </div>

        {/* 4. Nội dung danh sách cuộc gọi */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#f8fafc',
          }}
        >
          {/* Trạng thái Loading */}
          {isLoading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                color: '#64748b',
                gap: '12px',
              }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: '#4f46e5' }} />
              <p style={{ fontSize: '13px', margin: 0 }}>Đang tải nhật ký cuộc gọi hôm nay...</p>
            </div>
          ) : isError ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'center',
                color: '#991b1b',
              }}
            >
              <AlertCircle size={24} style={{ margin: '0 auto 8px auto', color: '#dc2626' }} />
              <p style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 8px 0' }}>
                Không thể tải lịch sử cuộc gọi từ hệ thống
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Thử lại
              </button>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                }}
              >
                <PhoneCall size={26} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#334155', margin: '0 0 4px 0' }}>
                {searchQuery || filterStatus !== 'all'
                  ? 'Không tìm thấy cuộc gọi phù hợp'
                  : 'Chưa có cuộc gọi nào hôm nay'}
              </p>
              <p style={{ fontSize: '12.5px', color: '#64748b', maxWidth: '300px', margin: 0 }}>
                {searchQuery || filterStatus !== 'all'
                  ? 'Vui lòng thử tìm kiếm bằng từ khóa khác hoặc bỏ chọn bộ lọc trạng thái.'
                  : 'Các cuộc gọi bạn thực hiện trong ca trực hôm nay sẽ hiển thị tự động tại đây.'}
              </p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const logId = log.call_id ?? `${log.phone_masked}_${log.call_date_time_start || index}`
              const isConnected =
                log.is_connected ||
                (typeof log.bill_sec === 'number' && log.bill_sec > 0) ||
                log.call_status === 'answer'

              const isIncoming = log.direction === 'incoming'
              const isPlaying = playingCallId === logId
              const timeDisplay = log.call_date_time_start
                ? dayjs(log.call_date_time_start).format('HH:mm:ss')
                : '—'

              const hasRecord = Boolean(log.record)

              return (
                <div
                  key={logId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Hàng 1: Thời gian, Chiều gọi, Trạng thái & Thời lượng */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Icon Chiều gọi */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: isIncoming ? '#f3e8ff' : '#eff6ff',
                          color: isIncoming ? '#7e22ce' : '#1d4ed8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        title={isIncoming ? 'Cuộc gọi đến' : 'Cuộc gọi đi'}
                      >
                        {isIncoming ? (
                          <PhoneIncoming size={14} />
                        ) : isConnected ? (
                          <PhoneOutgoing size={14} />
                        ) : (
                          <PhoneMissed size={14} style={{ color: '#ea580c' }} />
                        )}
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#1e293b',
                          }}
                        >
                          {timeDisplay}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#64748b',
                            marginLeft: '6px',
                          }}
                        >
                          ({isIncoming ? 'Gọi đến' : 'Gọi đi'})
                        </span>
                      </div>
                    </div>

                    {/* Badge trạng thái */}
                    <div>
                      {isConnected ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#dcfce7',
                            color: '#15803d',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Đã kết nối</span>
                          <span style={{ fontWeight: 700 }}>• {formatDuration(log.bill_sec || 0)}</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: '#ffedd5',
                            color: '#c2410c',
                          }}
                        >
                          <PhoneMissed size={12} />
                          <span>Không nghe máy</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hàng 2: Tên khách hàng & Mã KH */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 700,
                          color: '#0f172a',
                        }}
                      >
                        {log.customer_name || 'Khách hàng'}
                      </span>
                      {log.customer_code && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#475569',
                          }}
                        >
                          {log.customer_code}
                        </span>
                      )}
                    </div>

                    {/* Số điện thoại & nút copy */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <Phone size={12} style={{ color: '#64748b' }} />
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        {log.phone_masked || '—'}
                      </span>
                      {log.phone_masked && (
                        <button
                          type="button"
                          onClick={(e) => handleCopy(log.phone_masked, e)}
                          title="Sao chép số"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: copiedPhone === log.phone_masked ? '#16a34a' : '#94a3b8',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                        >
                          {copiedPhone === log.phone_masked ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>

                    {/* Địa chỉ khách nếu có */}
                    {log.customer_address && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '3px',
                          fontSize: '11.5px',
                          color: '#64748b',
                        }}
                      >
                        <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.customer_address}
                        </span>
                      </div>
                    )}

                    {/* Ghi chú cuộc gọi nếu có */}
                    {log.description && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          background: '#f8fafc',
                          border: '1px dashed #cbd5e1',
                          fontSize: '11.5px',
                          color: '#475569',
                          fontStyle: 'italic',
                        }}
                      >
                        {log.description}
                      </div>
                    )}
                  </div>

                  {/* Hàng 3: Trình phát Audio ghi âm cuộc gọi */}
                  <div
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '8px',
                      marginTop: '2px',
                    }}
                  >
                    {hasRecord ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: isPlaying ? '#f5f3ff' : '#f8fafc',
                          border: `1px solid ${isPlaying ? '#ddd6fe' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          transition: 'all 0.2s',
                        }}
                      >
                        {/* Nút Play / Pause */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(log)}
                          title={isPlaying ? 'Tạm dừng ghi âm' : 'Nghe file ghi âm'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: 'none',
                            background: isPlaying ? '#4f46e5' : '#e0e7ff',
                            color: isPlaying ? '#ffffff' : '#4338ca',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isLoadingAudio && isPlaying ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : isPlaying ? (
                            <Pause size={15} />
                          ) : (
                            <Play size={15} style={{ marginLeft: '2px' }} />
                          )}
                        </button>

                        {/* Thanh thời gian & Progress bar */}
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: isPlaying ? '#4338ca' : '#64748b',
                              marginBottom: '4px',
                            }}
                          >
                            <span>
                              {isPlaying
                                ? `${formatDuration(audioCurrentTime)} / ${formatDuration(audioDuration || log.bill_sec || 0)}`
                                : `Bản ghi âm (${formatDuration(log.bill_sec || 0)})`}
                            </span>
                            {isPlaying && (
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  color: '#16a34a',
                                  fontWeight: 700,
                                }}
                              >
                                Đang phát...
                              </span>
                            )}
                          </div>

                          {/* Progress bar có thể click để tua */}
                          <div
                            onClick={(e) => isPlaying && handleSeek(e, audioDuration || log.bill_sec || 0)}
                            style={{
                              height: '5px',
                              borderRadius: '3px',
                              background: '#e2e8f0',
                              cursor: isPlaying ? 'pointer' : 'default',
                              overflow: 'hidden',
                              position: 'relative',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                background: isPlaying ? '#4f46e5' : '#94a3b8',
                                width: isPlaying && audioDuration > 0
                                  ? `${Math.min(100, (audioCurrentTime / audioDuration) * 100)}%`
                                  : '0%',
                                transition: 'width 0.1s linear',
                              }}
                            />
                          </div>
                        </div>

                        {/* Nút mở tab riêng để nghe/tải */}
                        {log.record && (
                          <a
                            href={log.record}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Mở file ghi âm trong tab mới"
                            style={{
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '4px',
                              borderRadius: '6px',
                              transition: 'color 0.15s',
                            }}
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          color: '#94a3b8',
                          padding: '2px 0',
                        }}
                      >
                        <VolumeX size={13} />
                        <span>Không có bản ghi âm</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 5. Footer Drawer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            Hiển thị <strong>{filteredLogs.length}</strong> / {stats.total} cuộc gọi hôm nay
          </span>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#334155',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default TelesaleCallLogsDrawer

