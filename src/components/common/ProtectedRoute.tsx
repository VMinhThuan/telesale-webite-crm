import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

export interface ProtectedRouteProps {
  children: React.ReactElement
}

/**
 * Route Guard bảo vệ các trang nghiệp vụ nội bộ.
 * Nếu người dùng chưa đăng nhập (không có token), tự động chuyển hướng về /login
 * kèm tham số redirect để sau khi đăng nhập thành công sẽ quay lại đúng trang hiện tại.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search
    const redirectParam = currentPath !== '/' ? `?redirect=${encodeURIComponent(currentPath)}` : ''
    return <Navigate to={`/login${redirectParam}`} replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute

