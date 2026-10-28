import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarDays, ChevronDown, Menu } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { NotificationItem, PageType, PeriodType } from '../../types'
import { notify } from '../../utils/notify'

interface TopbarProps {
  pageTitle: string
  period: PeriodType
  setPeriod: (p: PeriodType) => void
  notifications: NotificationItem[]
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>
  setPage?: (page: PageType) => void
  openSidebar: () => void
  onOpenLogin?: () => void
}

const periods: PeriodType[] = [
  'Hôm nay',
  '7 ngày gần nhất',
  'Tháng 09/2025',
  'Tháng 10/2025',
]

export const Topbar: React.FC<TopbarProps> = ({
  pageTitle,
  period,
  setPeriod,
  notifications,
  setNotifications,
  setPage,
  openSidebar,
  onOpenLogin,
}) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [dateOpen, setDateOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleSelectPeriod = (item: PeriodType) => {
    setPeriod(item)
    setDateOpen(false)
    notify(`Đã chuyển sang ${item}`)
  }

  const handleNotificationClick = (item: NotificationItem) => {
    if (setPage) setPage(item.page)
    navigate(item.page === 'dashboard' ? '/' : `/${item.page}`)
    setNotifications((curr) => curr.filter((x) => x.id !== item.id))
    setNotificationOpen(false)
  }

  const handleMarkAllRead = () => {
    setNotifications([])
    notify('Đã đánh dấu tất cả là đã đọc')
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    if (onOpenLogin) onOpenLogin()
  }

  // Lấy 2 chữ cái đầu của tên hiển thị
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'NA'

  return (
    <header className="topbar">
      <button className="menu-button" onClick={openSidebar} type="button">
        <Menu />
      </button>

      <div className="crumb">
        <span>Không gian làm việc</span>
        <ChevronDown size={14} />
        <strong>{pageTitle}</strong>
      </div>

      <div className="top-actions">
        {/* Chọn kỳ hiển thị */}
        <div className="header-popover-wrap">
          <button
            data-silent
            type="button"
            onClick={() => {
              setDateOpen(!dateOpen)
              setNotificationOpen(false)
              setProfileOpen(false)
            }}
            className="date-picker"
          >
            <CalendarDays size={18} />
            <span>{period}</span>
            <ChevronDown size={16} />
          </button>

          {dateOpen && (
            <div className="header-popover period-menu">
              <b>Chọn kỳ hiển thị</b>
              {periods.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông báo */}
        <div className="header-popover-wrap">
          <button
            data-silent
            type="button"
            onClick={() => {
              setNotificationOpen(!notificationOpen)
              setDateOpen(false)
              setProfileOpen(false)
            }}
            className="bell"
          >
            <Bell size={20} />
            {notifications.length > 0 && <b>{notifications.length}</b>}
          </button>

          {notificationOpen && (
            <div className="header-popover notification-menu">
              <b>Thông báo mới</b>
              {notifications.length ? (
                notifications.map((item) => (
                  <button
                    className="notification-item"
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </button>
                ))
              ) : (
                <p className="empty-notification">Bạn đã xem tất cả thông báo.</p>
              )}
              <button className="mark-read" onClick={handleMarkAllRead} type="button">
                Đánh dấu tất cả là đã đọc
              </button>
            </div>
          )}
        </div>

        {/* Thông tin người dùng */}
        <div className="header-popover-wrap">
          <button
            data-silent
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen)
              setDateOpen(false)
              setNotificationOpen(false)
            }}
            className="profile"
          >
            <div className="avatar">{initials}</div>
            <div>
              <strong>{user?.name || 'Nhân viên Telesale'}</strong>
              <span>{user?.role || 'Telesale'}</span>
            </div>
            <ChevronDown size={16} />
          </button>

          {profileOpen && (
            <div className="header-popover profile-menu">
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  notify(`Hồ sơ: ${user?.name} · ${user?.role} · ${user?.department || 'ERP'}`)
                }}
              >
                Hồ sơ cá nhân
              </button>
              <button
                type="button"
                onClick={() => {
                  if (setPage) setPage('settings')
                  navigate('/settings')
                  setProfileOpen(false)
                }}
              >
                Cài đặt
              </button>
              <button type="button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
