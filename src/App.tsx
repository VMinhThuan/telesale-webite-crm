import React, { Suspense, lazy, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Dialog } from '@/components/common/Dialog'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { FloatingCallWidget } from '@/components/common/FloatingCallWidget'
import { LoginModal } from '@/components/common/LoginModal'
import { Sidebar } from '@/components/common/Sidebar'
import { Toast } from '@/components/common/Toast'
import { Topbar } from '@/components/common/Topbar'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { useEnums } from '@/hooks/useEnums'
import { DialogState, PageType, PeriodType } from '@/types'

// Code-splitting các trang qua React.lazy giúp tối ưu dung lượng tải ban đầu
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Telesale = lazy(() =>
  import('@/pages/Telesale').then((m) => ({ default: m.Telesale })),
)
const Leads = lazy(() =>
  import('@/pages/Leads').then((m) => ({ default: m.Leads })),
)
const Orders = lazy(() =>
  import('@/pages/Orders').then((m) => ({ default: m.Orders })),
)
const Training = lazy(() =>
  import('@/pages/Training').then((m) => ({ default: m.Training })),
)
const Reports = lazy(() =>
  import('@/pages/Reports').then((m) => ({ default: m.Reports })),
)
const Chat = lazy(() =>
  import('@/pages/Chat').then((m) => ({ default: m.Chat })),
)
const SettingsPage = lazy(() =>
  import('@/pages/Settings').then((m) => ({ default: m.SettingsPage })),
)

const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [toast, setToast] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [period, setPeriod] = useState<PeriodType>('Tháng 09/2025')

  // Tự động tải trước và cache toàn bộ danh mục enums vào React Query lúc mở ứng dụng
  useEnums()

  useEffect(() => {
    let timeoutId: number
    const onToast = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      setToast(customEvent.detail)
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => setToast(''), 2600)
    }

    const onUnauthorized = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>
      setToast(customEvent.detail?.message || 'Phiên làm việc hết hạn.')
      setSessionExpired(true)
      setLoginOpen(true)
    }

    window.addEventListener('salesflow:toast', onToast)
    window.addEventListener('salesflow:unauthorized', onUnauthorized)

    return () => {
      window.removeEventListener('salesflow:toast', onToast)
      window.removeEventListener('salesflow:unauthorized', onUnauthorized)
      window.clearTimeout(timeoutId)
    }
  }, [])

  // Xác định tiêu đề trang dựa trên đường dẫn URL hiện tại
  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/telesale':
        return 'Telesale'
      case '/leads':
        return 'Khách tiềm năng'
      case '/orders':
        return 'Đơn hàng'
      case '/training':
        return 'Tài liệu đào tạo'
      case '/reports':
        return 'Báo cáo'
      case '/chat':
        return 'Chat nội bộ'
      case '/settings':
        return 'Cài đặt'
      default:
        return 'Tổng quan'
    }
  }

  const handleNavigatePage = (p: PageType) => {
    navigate(p === 'dashboard' ? '/' : `/${p}`)
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        open={open}
        close={() => setOpen(false)}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <main>
        <Topbar
          pageTitle={getPageTitle(location.pathname)}
          period={period}
          setPeriod={setPeriod}
          setPage={handleNavigatePage}
          openSidebar={() => setOpen(true)}
          onOpenLogin={() => {
            setSessionExpired(false)
            setLoginOpen(true)
          }}
        />

        {/* Tầng ErrorBoundary cấp Page (tự động reset khi chuyển route qua resetKeys) */}
        <ErrorBoundary level="page" resetKeys={[location.pathname]}>
          <Suspense
            fallback={
              <div style={{ padding: '28px 34px' }}>
                <TableSkeleton rows={8} cols={4} />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard period={period} />} />
              <Route path="/telesale" element={<Telesale />} />
              <Route path="/leads" element={<Leads onOpenDialog={setDialog} />} />
              <Route path="/orders" element={<Orders onOpenDialog={setDialog} />} />
              <Route
                path="/training"
                element={<Training onOpenDialog={setDialog} setPage={handleNavigatePage} />}
              />
              <Route path="/reports" element={<Reports />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        <footer>
          <span>
            <i /> Hệ thống hoạt động ổn định
          </span>
          <span>© 2026 SalesFlow CRM</span>
        </footer>
      </main>

      <div
        className={`overlay ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Floating Call Widget toàn cục bảo toàn phiên gọi liên trang */}
      <FloatingCallWidget />

      {/* Thông báo và Hộp thoại toàn cục */}
      <Toast message={toast} />
      <Dialog dialog={dialog} onClose={() => setDialog(null)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        isSessionExpired={sessionExpired}
      />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Tầng ErrorBoundary cấp Layout bao bọc toàn bộ AppShell */}
      <ErrorBoundary level="layout">
        <AppShell />
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App