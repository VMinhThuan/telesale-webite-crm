import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, Home, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** Cấp độ lỗi: 'app' (toàn ứng dụng), 'layout' (khung giao diện chung), hoặc 'page' (từng trang con) */
  level?: 'app' | 'layout' | 'page'
  /** Danh sách khóa phụ thuộc (VD: [location.pathname]). Khi khóa này thay đổi, ErrorBoundary sẽ tự động reset lỗi */
  resetKeys?: unknown[]
  /** Callback được gọi khi bắt được lỗi */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Callback được gọi khi người dùng bấm reset/thử lại */
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

    export class ErrorBoundary extends Component < ErrorBoundaryProps, ErrorBoundaryState> {
    public state: ErrorBoundaryState = {
      hasError: false,
      error: null,
    }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
      return { hasError: true, error }
    }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      console.error(`[ErrorBoundary - ${this.props.level || 'page'}] Phát hiện lỗi render:`, error, errorInfo)
      this.props.onError?.(error, errorInfo)
    }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
      const { resetKeys } = this.props
      const { hasError } = this.state

      // Tự động phục hồi lỗi khi khóa điều hướng/dependency thay đổi (VD: người dùng đổi trang)
      if (hasError && resetKeys && prevProps.resetKeys) {
        const hasChanged = resetKeys.some((key, idx) => key !== prevProps.resetKeys?.[idx])
        if (hasChanged) {
          this.handleReset(false)
        }
      }
    }

  private handleReset = (shouldReload = false) => {
      this.props.onReset?.()
      this.setState({ hasError: false, error: null })
      if (shouldReload) {
        window.location.reload()
      }
    }

  private handleClearStorageAndReload = () => {
      try {
        localStorage.removeItem('salesflow_access_token')
        localStorage.removeItem('salesflow_user_info')
        sessionStorage.clear()
      } catch {
        // Bỏ qua lỗi truy cập storage
      }
      window.location.href = '/'
    }

  public render() {
          const { hasError, error } = this.state
          const { children, fallback, level = 'page' } = this.props

          if (hasError) {
            if (fallback) {
              return fallback
            }

            // Fallback toàn màn hình cho cấp độ Layout hoặc App
            if (level === 'app' || level === 'layout') {
              return (
                <div
                  style={{
                    minHeight: '100vh',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    padding: '24px',
                    boxSizing: 'border-box',
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '560px',
                      width: '100%',
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      padding: '36px 32px',
                      border: '1px solid #fee2e2',
                      boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.08), 0 8px 10px -6px rgba(239, 68, 68, 0.05)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '16px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 20px',
                      }}
                    >
                      <ShieldAlert size={32} />
                    </div>

                    <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px' }}>
                      Hệ thống gặp sự cố giao diện ({level === 'app' ? 'Ứng dụng' : 'Khung điều hướng'})
                    </h1>

                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', margin: '0 0 20px' }}>
                      Đã xảy ra lỗi ngoài ý muốn trong quá trình kết xuất giao diện chính. Đừng lo lắng, dữ liệu của bạn không bị mất.
                    </p>

                    {error?.message && (
                      <div
                        style={{
                          backgroundColor: '#fff1f2',
                          border: '1px solid #fecdd3',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          fontSize: '12px',
                          color: '#9f1239',
                          fontFamily: 'monospace',
                          textAlign: 'left',
                          margin: '0 0 24px',
                          wordBreak: 'break-word',
                          maxHeight: '120px',
                          overflowY: 'auto',
                        }}
                      >
                        <strong>Chi tiết:</strong> {error.message}
                      </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          onClick={() => this.handleReset(true)}
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '11px 18px',
                            borderRadius: '10px',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCcw size={16} /> Tải lại trang
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            this.setState({ hasError: false, error: null })
                            window.location.href = '/'
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '11px 18px',
                            borderRadius: '10px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Home size={16} /> Về trang chủ
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={this.handleClearStorageAndReload}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          color: '#94a3b8',
                          fontSize: '12px',
                          border: '1px dashed #cbd5e1',
                          cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={14} /> Xóa phiên đăng nhập & Tải lại sạch
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // Fallback gọn nhẹ cho cấp độ Page (giữ nguyên layout Sidebar & Topbar)
            return (
              <div
                style={{
                  padding: '48px 24px',
                  maxWidth: '520px',
                  margin: '40px auto',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #fee2e2',
                  boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.08)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    margin: '0 auto 16px',
                    borderRadius: '14px',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <AlertTriangle size={28} />
                </div>

                <h2 style={{ fontSize: '18px', color: '#1e293b', margin: '0 0 8px 0', fontWeight: 700 }}>
                  Trang này gặp sự cố hiển thị
                </h2>

                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                    {error?.message ||
                      'Đã xảy ra lỗi ngoài ý muốn khi hiển thị nội dung trang này. Bạn có thể thử lại hoặc chuyển sang trang khác từ thanh điều hướng bên trái.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => this.handleReset(false)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <RotateCcw size={15} /> Thử lại
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        this.setState({ hasError: false, error: null })
                        window.location.href = '/'
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Home size={15} /> Về trang chủ
                    </button>
                  </div>
              </div>
            )
          }

          return children
        }
      }

      export default ErrorBoundary