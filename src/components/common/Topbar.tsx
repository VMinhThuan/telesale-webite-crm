import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Menu,
  Phone,
  ShoppingCart,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotifications } from '../../hooks/useNotifications'
import dayjs from '../../lib/dayjs'
import { AppNotification } from '../../types/api'
import { NotificationItem, PageType, PeriodType } from '../../types'
import { notify } from '../../utils/notify'

interface TopbarProps {
  pageTitle: string
  period: PeriodType
  setPeriod: (p: PeriodType) => void
  notifications?: NotificationItem[]
  setNotifications?: React.Dispatch<React.SetStateAction<NotificationItem[]>>
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
  setPage,
  openSidebar,
  onOpenLogin: _onOpenLogin,
}) => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  // 1. Kết nối với hệ thống thông báo thật qua Hook useNotifications
  const {
    notifications,
    unreadCount,
    isLoading: isLoadingNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  const [dateOpen, setDateOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationTab, setNotificationTab] = useState<'all' | 'unread'>('all')

  const notificationMenuRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const dateMenuRef = useRef<HTMLDivElement>(null)

  // 2. Tự động đóng dropdown khi click chuột ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (notificationMenuRef.current && !notificationMenuRef.current.contains(target)) {
        setNotificationOpen(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileOpen(false)
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(target)) {
        setDateOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPeriod = (item: PeriodType) => {
    setPeriod(item)
    setDateOpen(false)
    notify(`Đã chuyển sang ${item}`)
  }

  // 3. Xử lý click từng thông báo: đánh dấu đã đọc và điều hướng
  const handleItemClick = (item: AppNotification) => {
    if (!item.is_read) {
      markAsRead(item.id)
    }
    const target = item.target_page || 'dashboard'
    if (setPage) setPage(target)
    navigate(target === 'dashboard' ? '/' : `/${target}`)
    setNotificationOpen(false)
  }

  const handleMarkAll = () => {
    markAllAsRead()
    notify('Đã đánh dấu tất cả là đã đọc')
  }

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/login')
  }

  // 4. Lọc thông báo theo Tab (Tất cả / Chưa đọc)
  const displayedNotifications = useMemo(() => {
    if (notificationTab === 'unread') {
      return notifications.filter((n) => !n.is_read)
    }
    return notifications
  }, [notifications, notificationTab])

  // Lấy 2 chữ cái đầu của tên hiển thị từ tài khoản đăng nhập thật
  const initials = user?.name
    ? user.name
      .split(' ')
      .map((n) => n[0])
      .slice(-2)
      .join('')
      .toUpperCase()
    : user?.username
      ? user.username.slice(0, 2).toUpperCase()
      : 'U'

  // Icon phù hợp theo loại thông báo
  const renderNotificationIcon = (type?: AppNotification['type']) => {
    switch (type) {
      case 'order':
        return (
          <div style={{ color: '#2563eb', backgroundColor: '#eff6ff', padding: '6px', borderRadius: '6px' }}>
            <ShoppingCart size={15} />
          </div>
        )
      case 'call':
        return (
          <div style={{ color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '6px', borderRadius: '6px' }}>
            <Phone size={15} />
          </div>
        )
      case 'customer':
        return (
          <div style={{ color: '#d97706', backgroundColor: '#fffbeb', padding: '6px', borderRadius: '6px' }}>
            <UserCheck size={15} />
          </div>
        )
      default:
        return (
          <div style={{ color: '#059669', backgroundColor: '#ecfdf5', padding: '6px', borderRadius: '6px' }}>
            <CalendarCheck size={15} />
          </div>
        )
    }
  }

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
        <div className="header-popover-wrap" ref={dateMenuRef}>
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

        {/* Thông báo hệ thống với Dropdown List chuyên nghiệp */}
        <div className="header-popover-wrap" ref={notificationMenuRef}>
          <button
            data-silent
            type="button"
            onClick={() => {
              setNotificationOpen(!notificationOpen)
              setDateOpen(false)
              setProfileOpen(false)
            }}
            className="bell"
            title="Thông báo"
            aria-label="Thông báo"
          >
            <Bell size={20} />
            {unreadCount > 0 && <b>{unreadCount > 99 ? '99+' : unreadCount}</b>}
          </button>

          {notificationOpen && (
            <div
              className="header-popover notification-menu"
              style={{
                width: '360px',
                padding: '0',
                overflow: 'hidden',
                borderRadius: '12px',
                boxShadow: '0 16px 36px -4px rgba(15, 23, 42, 0.16)',
              }}
            >
              {/* Header popover thông báo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderBottom: '1px solid #edf2f7',
                  backgroundColor: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    Thông báo
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      {unreadCount} mới
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <CheckCheck size={14} /> Đã đọc hết
                  </button>
                )}
              </div>

              {/* Tabs chuyển đổi: Tất cả vs Chưa đọc */}
              <div
                style={{
                  display: 'flex',
                  padding: '6px 14px',
                  gap: '6px',
                  borderBottom: '1px solid #f1f5f9',
                  backgroundColor: '#f8fafc',
                }}
              >
                <button
                  type="button"
                  onClick={() => setNotificationTab('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: notificationTab === 'all' ? '#ffffff' : 'transparent',
                    color: notificationTab === 'all' ? '#0f172a' : '#64748b',
                    boxShadow: notificationTab === 'all' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationTab('unread')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: notificationTab === 'unread' ? '#ffffff' : 'transparent',
                    color: notificationTab === 'unread' ? '#0f172a' : '#64748b',
                    boxShadow: notificationTab === 'unread' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {/* Danh sách thông báo có scroll */}
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {isLoadingNotifications ? (
                  <p style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                    Đang nạp thông báo từ máy chủ...
                  </p>
                ) : displayedNotifications.length > 0 ? (
                  displayedNotifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '12px 14px',
                        borderBottom: '1px solid #f8fafc',
                        backgroundColor: item.is_read ? '#ffffff' : '#f0f7ff',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = item.is_read ? '#f8fafc' : '#e0effe'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = item.is_read ? '#ffffff' : '#f0f7ff'
                      }}
                    >
                      {/* Icon phân loại */}
                      <div style={{ flexShrink: 0, marginTop: '2px' }}>
                        {renderNotificationIcon(item.type)}
                      </div>

                      {/* Nội dung thông báo */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px' }}>
                          <strong
                            style={{
                              fontSize: '12px',
                              fontWeight: item.is_read ? 600 : 700,
                              color: item.is_read ? '#334155' : '#0f172a',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </strong>
                          {!item.is_read && (
                            <span
                              style={{
                                width: '7px',
                                height: '7px',
                                borderRadius: '50%',
                                backgroundColor: '#2563eb',
                                flexShrink: 0,
                              }}
                              title="Chưa đọc"
                            />
                          )}
                        </div>

                        {item.content && (
                          <p
                            style={{
                              fontSize: '11px',
                              color: item.is_read ? '#64748b' : '#334155',
                              margin: '2px 0 4px',
                              lineHeight: '1.4',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {item.content}
                          </p>
                        )}

                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                          {dayjs(item.created_at).fromNow()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '36px 16px', color: '#94a3b8' }}>
                    <Bell size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ margin: 0, fontSize: '12px' }}>
                      {notificationTab === 'unread'
                        ? 'Bạn không có thông báo chưa đọc nào.'
                        : 'Hiện tại chưa có thông báo mới.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Thông tin người dùng */}
        <div className="header-popover-wrap" ref={profileMenuRef}>
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