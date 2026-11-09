import React, { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Settings,
  ShoppingCart,
  Users,
  X,
  LucideIcon,
} from 'lucide-react'
import { PageType } from '../../types'
import { useAuthStore } from '../../store/useAuthStore'
import { useChatThreads } from '../../hooks/useChat'
import { SidebarBanner } from './SidebarBanner'
import { determinePhanQuyen } from '../../services/auth.service'
import { SalesFlowLogo } from './SalesFlowLogo'

interface NavItemDef {
  label: string
  page: PageType
  path: string
  icon: LucideIcon
}

const navItems: NavItemDef[] = [
  { label: 'Tổng quan', page: 'dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Telesale', page: 'telesale', path: '/telesale', icon: Phone },
  { label: 'Khách tiềm năng', page: 'leads', path: '/leads', icon: Users },
  { label: 'Đơn hàng', page: 'orders', path: '/orders', icon: ShoppingCart },
  { label: 'Tài liệu đào tạo', page: 'training', path: '/training', icon: BookOpen },
  { label: 'Báo cáo', page: 'reports', path: '/reports', icon: BarChart3 },
]

interface SidebarProps {
  open: boolean
  close: () => void
  page?: PageType
  setPage?: (page: PageType) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  open,
  close,
  page,
  setPage,
  collapsed,
  setCollapsed,
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Xác định trang hiện tại dựa trên URL hoặc prop truyền vào
  const getCurrentPage = (): PageType => {
    if (page) return page
    const p = location.pathname.replace('/', '')
    if (!p) return 'dashboard'
    return p as PageType
  }

  const activePage = getCurrentPage()

  // Theo dõi số tin nhắn chưa đọc thực tế từ API chats khi đã đăng nhập
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const { data: threadsData } = useChatThreads(1, 20, Boolean(isAuthenticated))

  // Phân quyền: Chỉ admin và trưởng nhóm mới được xem màn hình Báo cáo, nhân viên thì ẩn
  const pq = determinePhanQuyen(user)
  const canViewReports = pq === 'admin' || pq === 'truong_nhom'

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.page === 'reports') {
        return canViewReports
      }
      return true
    })
  }, [canViewReports])

  const unreadCount = useMemo(() => {
    if (!isAuthenticated || !threadsData?.threads) return 0
    return threadsData.threads.reduce(
      (sum: number, t: any) => sum + (Number(t.unread_count) || 0),
      0,
    )
  }, [isAuthenticated, threadsData])

  const handleNavClick = (targetPage: PageType, path: string) => {
    if (setPage) setPage(targetPage)
    navigate(path)
    close()
  }

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-top">
        <div
          className="brand brand-text"
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          onClick={() => navigate('/')}
        >
          <SalesFlowLogo size={30} />
          <span>SalesFlow</span>
        </div>
        <button
          title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="collapse-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <button className="mobile-close" onClick={close} type="button">
          <X size={21} />
        </button>
      </div>

      <div className="workspace">
        <span className="workspace-dot" />
        <em>KHÔNG GIAN LÀM VIỆC</em>
      </div>

      <nav>
        {visibleNavItems.map(({ label, page: itemPage, path, icon: Icon }) => (
          <button
            key={label}
            title={label}
            type="button"
            onClick={() => handleNavClick(itemPage, path)}
            className={`nav-item ${activePage === itemPage ? 'active' : ''}`}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Widget Banner nội bộ (trình chiếu ảnh) */}
      <SidebarBanner collapsed={collapsed} />

      <div className="sidebar-bottom">
        <button
          title="Trò chuyện"
          type="button"
          onClick={() => handleNavClick('chat', '/chat')}
          className={`nav-item ${activePage === 'chat' ? 'active' : ''}`}
        >
          <MessageCircle size={19} />
          <span>Trò chuyện</span>
          {unreadCount > 0 && (
            <span
              className="unread-badge"
              title={`${unreadCount} tin nhắn chưa đọc`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          title="Cài đặt"
          type="button"
          onClick={() => handleNavClick('settings', '/settings')}
          className={`nav-item ${activePage === 'settings' ? 'active' : ''}`}
        >
          <Settings size={19} />
          <span>Cài đặt</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
