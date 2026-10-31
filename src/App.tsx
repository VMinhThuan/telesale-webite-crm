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
import { ProtectedRoute } from '@/components/common/ProtectedRoute'
import { Sidebar } from '@/components/common/Sidebar'
import { Toast } from '@/components/common/Toast'
import { Topbar } from '@/components/common/Topbar'
import { TableSkeleton } from '@/components/ui/TableSkeleton'
import { useEnums } from '@/hooks/useEnums'
import sipService from '@/services/sipService'
import { useAuthStore } from '@/store/useAuthStore'
import { useCallStore } from '@/store/useCallStore'
import { useTelesaleCallStore } from '@/store/useTelesaleCallStore'
import { DialogState, PageType, PeriodType } from '@/types'
import { notify } from '@/utils/notify'

// Code-splitting các trang qua React.lazy giúp tối ưu dung lượng tải ban đầu
const LoginPage = lazy(() =>
  import('@/pages/Login').then((m) => ({ default: m.LoginPage })),
)
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
  const [period, setPeriod] = useState<PeriodType>('Tháng 09/2025')

  // Tự động tải trước và cache toàn bộ danh mục enums vào React Query lúc mở ứng dụng
  useEnums()

  // Theo dõi bộ đếm thời lượng đàm thoại 3 line trên toàn ứng dụng (kể cả khi chuyển trang)
  useEffect(() => {
    const timer = setInterval(() => {
      useTelesaleCallStore.getState().tickDurations()
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Lắng nghe và đồng bộ sự kiện cuộc gọi SIP toàn cục xuyên suốt các trang (kể cả khi rời trang Telesale)
  useEffect(() => {
    const unsubscribeCall = sipService.onCallStateChange((event) => {
      const lineId = event.lineId
      const activeTabId = useTelesaleCallStore.getState().activeTabId

      if (event.status === 'calling' || event.status === 'progress') {
        useTelesaleCallStore.getState().updateTab(lineId, { status: 'calling' })
      } else if (event.status === 'connected') {
        useTelesaleCallStore.getState().updateTab(lineId, { status: 'connected', isHeld: false })
        if (lineId === activeTabId) {
          useCallStore.getState().connectCall()
        }
      } else if (event.status === 'paused') {
        useTelesaleCallStore.getState().updateTab(lineId, { status: 'paused', isHeld: true })
        if (lineId === activeTabId && !useCallStore.getState().isHeld) {
          useCallStore.getState().toggleHold()
        }
      } else if (event.status === 'ended' || event.status === 'failed') {
        useTelesaleCallStore.getState().updateTab(lineId, { status: 'ended', isHeld: false })

        // Kiểm tra nếu line kết thúc là line active HOẶC không còn line nào đang gọi/kết nối/giữ máy
        const currentTabs = useTelesaleCallStore.getState().tabs
        const hasActiveLine = currentTabs.some(
          (t) => t.status === 'calling' || t.status === 'connected' || t.status === 'paused',
        )

        if (lineId === activeTabId || !hasActiveLine) {
          useCallStore.getState().endCall()
        }

        if (event.status === 'failed' && event.cause) {
          notify(`Cuộc gọi Line ${lineId} kết thúc: ${event.cause}`)
        }
      }
    })

    return () => {
      unsubscribeCall()
    }
  }, [])

  // Đảm bảo gác máy mọi cuộc gọi và ngắt kết nối SIP UA khi đóng tab/trình duyệt hoặc unmount AppShell
  useEffect(() => {
    const handleWindowUnload = () => {
      try {
        sipService.destroy()
      } catch (e) {
        console.warn('Lỗi khi dọn dẹp SIP lúc đóng trình duyệt:', e)
      }
    }

    window.addEventListener('beforeunload', handleWindowUnload)
    window.addEventListener('pagehide', handleWindowUnload)

    return () => {
      window.removeEventListener('beforeunload', handleWindowUnload)
      window.removeEventListener('pagehide', handleWindowUnload)
      try {
        sipService.destroy()
      } catch (e) {
        console.warn('Lỗi khi dọn dẹp SIP lúc unmount AppShell:', e)
      }
    }
  }, [])

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

      // Dọn dẹp SIP session và reset trạng thái cuộc gọi khi hết hạn phiên
      try {
        useAuthStore.getState().logout()
      } catch (e) {
        console.warn('Lỗi khi đăng xuất trên sự kiện unauthorized:', e)
        try {
          sipService.destroy()
        } catch {
          // ignore
        }
        useTelesaleCallStore.getState().resetTabs()
        useCallStore.getState().resetCall()
      }

      const current = location.pathname + location.search
      const redirectParam = current !== '/' ? `&redirect=${encodeURIComponent(current)}` : ''
      navigate(`/login?session_expired=true${redirectParam}`, { replace: true })
    }

    window.addEventListener('salesflow:toast', onToast)
    window.addEventListener('salesflow:unauthorized', onUnauthorized)

    return () => {
      window.removeEventListener('salesflow:toast', onToast)
      window.removeEventListener('salesflow:unauthorized', onUnauthorized)
      window.clearTimeout(timeoutId)
    }
  }, [location.pathname, location.search, navigate])

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
          onOpenLogin={() => navigate('/login')}
        />

        {/* Tầng ErrorBoundary cấp Page (tự động reset khi chuyển route qua resetKeys) */}
        <ErrorBoundary level="page" resetKeys={[location.pathname]}>
          <Suspense
            fallback={
              <div style={{ padding: '28px 34px' }}>
                <TableSkeleton rows={8} cols={4} standalone />
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
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Tầng ErrorBoundary cấp Layout bao bọc toàn bộ ứng dụng */}
      <ErrorBoundary level="layout">
        <Suspense
          fallback={
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                height: '100vh',
                background: '#f8fafc',
              }}
            >
              <div style={{ padding: '28px 34px', width: '100%', maxWidth: '800px' }}>
                <TableSkeleton rows={8} cols={4} standalone />
              </div>
            </div>
          }
        >
          <Routes>
            {/* Tuyến đường công khai: Trang đăng nhập toàn màn hình */}
            <Route path="/login" element={<LoginPage />} />

            {/* Toàn bộ tuyến đường nghiệp vụ nội bộ: Bảo vệ bởi Route Guard */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}

export default App