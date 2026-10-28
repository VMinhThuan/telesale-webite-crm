import React, { useState } from 'react'
import { AlertCircle, Lock, LogIn, User, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  isSessionExpired?: boolean
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  isSessionExpired = false,
}) => {
  const { login, loginMutation } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập')
      return
    }

    try {
      await login({
        username: username.trim(),
        password: password.trim(),
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Tài khoản hoặc mật khẩu không chính xác.')
    }
  }

  return (
    <div className="mock-dialog-backdrop" style={{ zIndex: 9999 }}>
      <section
        className="mock-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '32px 28px' }}
      >
        {!isSessionExpired && (
          <button className="dialog-close" onClick={onClose} type="button">
            <X size={19} />
          </button>
        )}

        <div className="dialog-icon" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
          <LogIn size={26} />
        </div>

        <p className="eyebrow">XÁC THỰC TÀI KHOẢN</p>
        <h2>{isSessionExpired ? 'Phiên làm việc hết hạn' : 'Đăng nhập SalesFlow'}</h2>
        <p style={{ margin: '0 0 20px 0', fontSize: '13.5px', color: '#64748b' }}>
          {isSessionExpired
            ? 'Vui lòng đăng nhập lại để tiếp tục công việc đang dang dở.'
            : 'Đăng nhập bằng tài khoản ERP để đồng bộ dữ liệu Telesale & CSKH.'}
        </p>

        {errorMsg && (
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
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Tên đăng nhập */}
          <div style={{ marginBottom: '14px', textAlign: 'left' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              <User size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Tên tài khoản
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập username ERP..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Mật khẩu */}
          <div style={{ marginBottom: '20px', textAlign: 'left' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              <Lock size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            className="dialog-primary"
            disabled={loginMutation.isPending}
            style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 600 }}
          >
            {loginMutation.isPending ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default LoginModal
