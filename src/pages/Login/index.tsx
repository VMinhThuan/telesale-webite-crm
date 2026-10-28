import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Headphones,
  Lock,
  LogIn,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { login, isAuthenticated, loginMutation } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // Kiểm tra cờ hết hạn phiên làm việc từ query param hoặc state
  const isSessionExpired =
    searchParams.get('session_expired') === 'true' ||
    searchParams.get('session_expired') === '1' ||
    Boolean((location.state as any)?.sessionExpired)

  // Điểm đến sau khi đăng nhập thành công
  const redirectTarget =
    searchParams.get('redirect') || (location.state as any)?.from?.pathname || '/'

  // Nếu đã đăng nhập hợp lệ, tự động chuyển hướng về trang đích
  if (isAuthenticated) {
    return <Navigate to={redirectTarget} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!username.trim()) {
      setErrorMessage('Vui lòng nhập tên tài khoản đăng nhập.')
      return
    }

    if (!password.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu.')
      return
    }

    try {
      const res = await login({
        username: username.trim(),
        password: password.trim(),
      })
      if (!res?.access_token) {
        setErrorMessage('Đăng nhập thất bại: Không nhận được access_token từ máy chủ.')
        return
      }
      navigate(redirectTarget, { replace: true })
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      )
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        background: '#f8fafc',
        fontFamily: 'inherit',
      }}
    >
      {/* CỘT TRÁI: Nhận diện Thương hiệu & Giá trị Nền tảng (Hiển thị trên màn hình Desktop) */}
      <div
        className="login-brand-column"
        style={{
          flex: '1.1',
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 50%, #1d4ed8 100%)',
          color: '#ffffff',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Họa tiết trang trí nền */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo & Header thương hiệu */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Zap size={22} color="#ffffff" />
            </div>
            <div>
              <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                SalesFlow
              </span>
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  marginLeft: '8px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                CRM v2.4
              </span>
            </div>
          </div>
          <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0 }}>
            Hệ thống Quản trị Telesale, Đàm thoại & Đơn hàng · Lọc Nước 365
          </p>
        </div>

        {/* Khối Điểm nổi bật (Value Proposition) */}
        <div style={{ position: 'relative', zIndex: 1, margin: '60px 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#bfdbfe',
              marginBottom: '24px',
            }}
          >
            <Sparkles size={14} color="#93c5fd" /> Bàn làm việc số hóa toàn diện
          </div>

          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              lineHeight: 1.25,
              marginBottom: '20px',
              letterSpacing: '-0.5px',
            }}
          >
            Tăng tốc đàm thoại, <br />
            chốt đơn thông minh mỗi ngày.
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                icon: Headphones,
                title: 'Tích hợp Softphone SIP độ trễ thấp',
                desc: 'Đàm thoại mượt mà, ghi âm cuộc gọi và lưu trữ an toàn.',
              },
              {
                icon: ShieldCheck,
                title: 'Bảo mật số điện thoại khách hàng',
                desc: 'Tự động che số nhạy cảm và cấp link ghi âm ký hạn 15 phút.',
              },
              {
                icon: CheckCircle2,
                title: 'Đồng bộ đơn hàng & hoa hồng tức thì',
                desc: 'Tự động tính toán slot chi nhánh, chống trùng đơn.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Icon size={17} color="#93c5fd" />
                </div>
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#f8fafc', display: 'block' }}>
                    {title}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
                    {desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Cột Trái */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            fontSize: '12px',
            color: '#94a3b8',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>© 2026 LocNuoc365 Group</span>
          <span>Hotline IT: </span>
        </div>
      </div>

      {/* CỘT PHẢI: Form Đăng Nhập Toàn Màn Hình */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
            padding: '36px 32px',
          }}
        >
          {/* Header Form */}
          <div style={{ marginBottom: '28px', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 14px',
              }}
            >
              <LogIn size={24} />
            </div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 6px 0',
                letterSpacing: '-0.3px',
              }}
            >
              Đăng nhập SalesFlow
            </h2>
          </div>

          {/* Cảnh báo phiên làm việc hết hạn */}
          {isSessionExpired && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '10px',
                color: '#b45309',
                fontSize: '12.5px',
                marginBottom: '20px',
                lineHeight: 1.4,
              }}
            >
              <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Phiên làm việc đã hết hạn</strong>
                <p style={{ margin: '2px 0 0 0' }}>
                  Vui lòng đăng nhập lại để tiếp tục công việc đang dang dở.
                </p>
              </div>
            </div>
          )}

          {/* Thông báo lỗi khi đăng nhập thất bại */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Tên đăng nhập */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Tên tài khoản / Mã nhân viên
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  placeholder="Nhập username..."
                  disabled={loginMutation.isPending}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px 0 38px',
                    fontSize: '13.5px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>
                  Mật khẩu
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    display: 'flex',
                  }}
                >
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errorMessage) setErrorMessage('')
                  }}
                  placeholder="Nhập mật khẩu..."
                  disabled={loginMutation.isPending}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 40px 0 38px',
                    fontSize: '13.5px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'transparent',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Ghi nhớ đăng nhập */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                fontSize: '12.5px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#475569',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                Ghi nhớ đăng nhập
              </label>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: loginMutation.isPending ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              }}
            >
              {loginMutation.isPending ? (
                <>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Đăng nhập vào hệ thống</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage