import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  SwitchCamera,
  User,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import dayjs from '../../lib/dayjs'
import { attendanceService } from '../../services/attendance.service'
import { determinePhanQuyen } from '../../services/auth.service'
import { isAttendanceValidToday, useAuthStore } from '../../store/useAuthStore'
import { notify } from '../../utils/notify'

export const FaceAttendancePage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const attendanceDate = useAuthStore((s) => s.attendanceDate)
  const isAttendanceCheckedIn = useAuthStore((s) => s.isAttendanceCheckedIn)
  const setAttendanceCheckedIn = useAuthStore((s) => s.setAttendanceCheckedIn)

  const isAdmin = determinePhanQuyen(user) === 'admin'

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [currentTime, setCurrentTime] = useState(() => dayjs().format('HH:mm:ss'))
  const [cameraState, setCameraState] = useState<
    'initializing' | 'ready' | 'capturing' | 'verifying' | 'success' | 'error'
  >('initializing')
  const [errorMessage, setErrorMessage] = useState('')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [checkInInfo, setCheckInInfo] = useState<{
    gio_vao?: string
    ngay_cham?: string
    message?: string
  } | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Điểm đến mong muốn sau khi chấm công xong
  const redirectTarget =
    (location.state as any)?.from?.pathname ||
    (location.state as any)?.from ||
    '/telesale'

  // Đồng hồ kỹ thuật số cập nhật mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 1. Kiểm tra trạng thái xác thực: Nếu chưa đăng nhập -> về /login
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // 2. Nếu hôm nay đã chấm công rồi -> tự động chuyển thẳng vào workspace
  useEffect(() => {
    if (isAttendanceValidToday({ attendanceDate, isAttendanceCheckedIn })) {
      navigate(redirectTarget, { replace: true })
    }
  }, [attendanceDate, isAttendanceCheckedIn, navigate, redirectTarget])

  // Dọn dẹp tắt camera khi rời trang
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop()
        } catch {
          // ignore
        }
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // 3. Khởi động Camera Webcam
  const startCamera = useCallback(
    async (deviceId?: string, isMountedCheck?: () => boolean) => {
      stopCamera()
      setCameraState('initializing')
      setErrorMessage('')
      setCapturedImage(null)

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Trình duyệt của bạn không hỗ trợ truy cập Webcam/Camera.')
        }

        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)

        // Nếu component đã unmount trước khi getUserMedia hoàn tất -> đóng ngay luồng
        if (isMountedCheck && !isMountedCheck()) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          try {
            await videoRef.current.play()
          } catch (playErr: any) {
            if (playErr.name === 'AbortError') {
              // Yêu cầu play() bị ngắt do tải lại luồng mới hoặc unmount, an toàn bỏ qua
              return
            }
            throw playErr
          }
        }

        if (isMountedCheck && !isMountedCheck()) return

        // Lấy danh sách thiết bị camera khả dụng
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices()
          const videoDevs = allDevices.filter((d) => d.kind === 'videoinput')
          setDevices(videoDevs)
        } catch {
          // ignore
        }

        setCameraState('ready')
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return
        }
        if (isMountedCheck && !isMountedCheck()) return

        console.error('Lỗi khi mở Camera:', err)
        setCameraState('error')
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage(
            'Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trên trình duyệt để tiếp tục chấm công.',
          )
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage(
            'Không tìm thấy thiết bị Webcam trên máy tính của bạn. Vui lòng kết nối camera và thử lại.',
          )
        } else {
          setErrorMessage(
            err.message || 'Không thể khởi động Camera. Vui lòng kiểm tra thiết bị và thử lại.',
          )
        }
      }
    },
    [stopCamera],
  )

  useEffect(() => {
    let isMounted = true
    startCamera(selectedDeviceId, () => isMounted)
    return () => {
      isMounted = false
      stopCamera()
    }
  }, [startCamera, selectedDeviceId, stopCamera])

  // Chuyển đổi camera (nếu máy có nhiều webcam/camera trước sau)
  const handleSwitchCamera = () => {
    if (devices.length < 2) {
      notify('Thiết bị chỉ có 1 camera khả dụng')
      return
    }
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % devices.length
    setSelectedDeviceId(devices[nextIndex].deviceId)
  }

  // 4. Thao tác chụp ảnh từ video frame vào Canvas
  const captureSnapshot = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current || !canvasRef.current) {
        reject(new Error('Khung hình Camera chưa sẵn sàng.'))
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const width = video.videoWidth || 640
      const height = video.videoHeight || 480

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Không khởi tạo được bộ xử lý đồ họa ảnh.'))
        return
      }

      // Vẽ hình từ video sang canvas (lật ngược gương ngang để ảnh tự nhiên như soi gương)
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, width, height)

      // Lưu preview ảnh cho UI
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      setCapturedImage(dataUrl)

      // Xuất Blob để gửi FormData lên backend
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Lỗi khi nén ảnh chụp.'))
          }
        },
        'image/jpeg',
        0.88,
      )
    })
  }

  // 5. Thực hiện gửi ảnh chấm công về backend
  const handlePerformCheckIn = async () => {
    try {
      setCameraState('capturing')
      const imageBlob = await captureSnapshot()

      setCameraState('verifying')
      const result = await attendanceService.checkInFaceAttendance(imageBlob, {
        note: `Chấm công tự động lúc ${currentTime}`,
        deviceInfo: navigator.userAgent,
      })

      // Cập nhật trạng thái chấm công thành công
      setAttendanceCheckedIn(result.ngay_cham, result.gio_vao)
      setCheckInInfo(result)
      setCameraState('success')
      stopCamera()
      notify(`Điểm danh thành công! Giờ vào ca: ${result.gio_vao}`)

      // Đợi 1.5s để người dùng nhìn thấy thông báo thành công rồi tự động chuyển vào màn hình làm việc
      setTimeout(() => {
        navigate(redirectTarget, { replace: true })
      }, 1500)
    } catch (err: any) {
      setCameraState('error')
      setErrorMessage(
        err.message || 'Xác thực khuôn mặt thất bại. Vui lòng căn chỉnh lại góc nhìn và thử lại.',
      )
    }
  }

  // Bắt đầu đếm ngược tự động chụp 3 giây
  const handleStartCountdown = () => {
    if (cameraState !== 'ready') return
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          handlePerformCheckIn()
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  // Xử lý Bỏ qua dành cho Admin (Bypass Gate)
  const handleAdminBypass = () => {
    const today = dayjs().format('YYYY-MM-DD')
    const time = dayjs().format('HH:mm:ss')
    setAttendanceCheckedIn(today, time)
    notify('Đã bỏ qua bước quét mặt (Đặc quyền Quản trị viên)')
    navigate(redirectTarget, { replace: true })
  }

  const handleLogout = () => {
    stopCamera()
    logout()
    navigate('/login')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #0b1329 0%, #0f172a 50%, #1e293b 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header thanh lịch */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #2563eb, #38bdf8)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: 700, letterSpacing: '0.3px' }}>
              SalesFlow · Chấm công khuôn mặt
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Xác thực danh tính sinh trắc học bắt buộc đầu ca làm việc
            </p>
          </div>
        </div>

        {/* Thông tin nhân viên & Đồng hồ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(30, 41, 59, 0.8)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '12px',
              color: '#38bdf8',
              fontWeight: 600,
            }}
          >
            <Clock size={14} />
            <span>{currentTime}</span>
            <span style={{ color: '#64748b' }}>·</span>
            <span style={{ color: '#cbd5e1' }}>{dayjs().format('DD/MM/YYYY')}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#1e3a8a',
                border: '2px solid #3b82f6',
                display: 'grid',
                placeItems: 'center',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'NV'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
              <strong style={{ fontSize: '12.5px', display: 'block', color: '#f8fafc' }}>
                {user?.name || 'Nhân viên Telesale'}
              </strong>
              <small style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                {user?.role || 'Nhân viên'} · {user?.department || 'Telesale'}
              </small>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 600,
            }}
            title="Đăng xuất tài khoản"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Vùng quét trung tâm */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(16px)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Hướng dẫn thao tác */}
          <div style={{ marginBottom: '16px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '16px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                marginBottom: '6px',
              }}
            >
              <Sparkles size={13} /> QUY TẮC ĐIỂM DANH ĐẦU CA
            </span>
            <h2 style={{ margin: '4px 0 6px', fontSize: '18px', fontWeight: 700 }}>
              Điểm danh khuôn mặt để bắt đầu ca trực
            </h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
              Vui lòng nhìn thẳng vào ống kính và đặt khuôn mặt vừa vặn trong khung định vị.
            </p>
          </div>

          {/* Khung Camera Viewport với Oval Scanner */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              maxHeight: '340px',
              margin: '0 auto',
              borderRadius: '14px',
              overflow: 'hidden',
              background: '#020617',
              border:
                cameraState === 'success'
                  ? '2px solid #10b981'
                  : cameraState === 'error'
                    ? '2px solid #ef4444'
                    : '2px solid rgba(59, 130, 246, 0.4)',
              boxShadow:
                cameraState === 'success'
                  ? '0 0 25px rgba(16, 185, 129, 0.35)'
                  : '0 0 20px rgba(37, 99, 235, 0.25)',
            }}
          >
            {/* Thẻ Video hiển thị luồng trực tiếp */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Lật gương để người dùng soi tự nhiên
                display: cameraState === 'success' && capturedImage ? 'none' : 'block',
              }}
            />

            {/* Ảnh chụp tĩnh khi thành công */}
            {cameraState === 'success' && capturedImage && (
              <img
                src={capturedImage}
                alt="Ảnh chấm công"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}

            {/* Canvas ẩn phục vụ chụp frame */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Lớp phủ Khung Oval Định Vị Khuôn Mặt (Face Oval Guide) */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Vòng Oval hướng dẫn */}
              <div
                style={{
                  width: '210px',
                  height: '270px',
                  borderRadius: '50%',
                  border:
                    cameraState === 'success'
                      ? '3px solid #10b981'
                      : cameraState === 'verifying'
                        ? '3px dashed #38bdf8'
                        : '2px dashed rgba(255, 255, 255, 0.75)',
                  boxShadow:
                    cameraState === 'success'
                      ? '0 0 0 9999px rgba(16, 185, 129, 0.15)'
                      : '0 0 0 9999px rgba(11, 19, 41, 0.55)',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                }}
              >
                {/* Tia quét Laser Radar chạy lên xuống */}
                {(cameraState === 'ready' || cameraState === 'verifying') && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '2px',
                      background:
                        'linear-gradient(90deg, transparent, #38bdf8, #60a5fa, transparent)',
                      boxShadow: '0 0 12px #38bdf8',
                      animation: 'scanSweep 2.2s infinite ease-in-out',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Đếm ngược đè trên màn hình */}
            {countdown !== null && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(0, 0, 0, 0.45)',
                  fontSize: '64px',
                  fontWeight: 900,
                  color: '#38bdf8',
                  textShadow: '0 0 20px #38bdf8',
                }}
              >
                {countdown}
              </div>
            )}

            {/* Trạng thái Overlay khi đang tải / lỗi */}
            {cameraState === 'initializing' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.9)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <RefreshCw size={28} className="animate-spin" color="#38bdf8" />
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Đang khởi động Camera...</span>
              </div>
            )}

            {cameraState === 'verifying' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                }}
              >
                <RefreshCw size={32} className="animate-spin" color="#38bdf8" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                  Đang gửi đối soát máy chủ...
                </span>
              </div>
            )}

            {cameraState === 'success' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                <CheckCircle2 size={18} />
                <span>
                  {checkInInfo?.message || 'Điểm danh thành công!'} Giờ vào:{' '}
                  {checkInInfo?.gio_vao || currentTime}
                </span>
              </div>
            )}
          </div>

          {/* Thông báo lỗi nếu có */}
          {errorMessage && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, color: '#ef4444' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Các nút điều khiển hành động */}
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {cameraState === 'ready' && (
              <>
                <button
                  type="button"
                  onClick={handlePerformCheckIn}
                  style={{
                    height: '44px',
                    padding: '0 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.45)',
                  }}
                >
                  <Camera size={18} /> Chụp & Điểm danh ngay
                </button>

                <button
                  type="button"
                  onClick={handleStartCountdown}
                  style={{
                    height: '44px',
                    padding: '0 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    background: 'rgba(30, 41, 59, 0.8)',
                    color: '#f8fafc',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  title="Tự động đếm 3 giây và chụp"
                >
                  <Clock size={16} /> Hẹn giờ 3s
                </button>

                {devices.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    style={{
                      height: '44px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      background: 'rgba(30, 41, 59, 0.8)',
                      color: '#cbd5e1',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Đổi camera khác"
                  >
                    <SwitchCamera size={16} /> Đổi camera
                  </button>
                )}
              </>
            )}

            {cameraState === 'error' && (
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={16} /> Thử lại
              </button>
            )}

            {/* Nút Bỏ qua dành cho Admin / Kiểm thử */}
            {isAdmin && (
              <button
                type="button"
                onClick={handleAdminBypass}
                style={{
                  height: '42px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: '1px dashed rgba(255, 255, 255, 0.25)',
                  background: 'transparent',
                  color: '#94a3b8',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                title="Đặc quyền Quản trị viên: bỏ qua bước quét mặt khi thử nghiệm"
              >
                ⚡ Bỏ qua (Dành cho Quản trị viên)
              </button>
            )}
          </div>
        </div>
      </main>

      {/* CSS Animation cho tia quét */}
      <style>{`
        @keyframes scanSweep {
          0% { top: 4%; opacity: 0.8; }
          50% { top: 94%; opacity: 1; }
          100% { top: 4%; opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

export default FaceAttendancePage
