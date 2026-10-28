import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Headphones,
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

  const handleNavClick = (targetPage: PageType, path: string) => {
    if (setPage) setPage(targetPage)
    navigate(path)
    close()
  }

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-top">
        <div className="brand brand-text" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
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
        {navItems.map(({ label, page: itemPage, path, icon: Icon }) => (
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

      <div className="sidebar-bottom">
        <button
          title="Trò chuyện"
          type="button"
          onClick={() => handleNavClick('chat', '/chat')}
          className={`nav-item ${activePage === 'chat' ? 'active' : ''}`}
        >
          <MessageCircle size={19} />
          <span>Trò chuyện</span>
          <i className="notify-dot" />
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

        <div className="support-card">
          <div className="support-icon">
            <Headphones size={20} />
          </div>
          <div>
            <strong>Cần hỗ trợ?</strong>
            <span>Liên hệ quản trị viên</span>
          </div>
          <ChevronDown size={15} />
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
