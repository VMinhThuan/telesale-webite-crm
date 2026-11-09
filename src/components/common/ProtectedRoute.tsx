import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAttendanceValidToday, useAuthStore } from '../../store/useAuthStore'
import { determinePhanQuyen } from '../../services/auth.service'

export interface ProtectedRouteProps {
  children: React.ReactElement
}

/**
 * Route Guard bảo vệ các trang nghiệp vụ nội bộ.
 * 1. Nếu chưa đăng nhập: chuyển hướng về /login
 * 2. Nếu đã đăng nhập nhưng chưa quét khuôn mặt / chấm công hôm nay (và không phải Admin):
 *    bắt buộc chuyển hướng sang /face-attendance
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAttendanceCheckedIn = useAuthStore((state) => state.isAttendanceCheckedIn)
  const attendanceDate = useAuthStore((state) => state.attendanceDate)
  const user = useAuthStore((state) => state.user)
  const location = useLocation()

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search
    const redirectParam = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
    return <Navigate to={`/login${redirectParam}`} replace state={{ from: location }} />
  }

  // Kiểm tra điều kiện chấm công khuôn mặt trong ngày hôm nay
  const isCheckedInToday = isAttendanceValidToday({ attendanceDate, isAttendanceCheckedIn })
  const isAdmin = determinePhanQuyen(user) === 'admin'

  // Nhân viên (hoặc tài khoản chưa chấm công hôm nay) bắt buộc phải qua trạm quét mặt
  if (!isCheckedInToday && !isAdmin) {
    return <Navigate to="/face-attendance" replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute

