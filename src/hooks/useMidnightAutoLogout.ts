import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import dayjs from '../lib/dayjs'
import { notify } from '../utils/notify'

/**
 * Hook tự động đăng xuất người dùng sau 23:59 hàng ngày
 * Đảm bảo sang ngày mới nhân viên bắt buộc phải quét khuôn mặt / chấm công lại từ đầu.
 */
export function useMidnightAutoLogout() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const attendanceDate = useAuthStore((s) => s.attendanceDate)
  const isAttendanceCheckedIn = useAuthStore((s) => s.isAttendanceCheckedIn)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    if (!isAuthenticated) return

    const todayStr = dayjs().format('YYYY-MM-DD')

    // 1. Kiểm tra tức thì khi mở web / F5 / nạp trang:
    // Nếu phiên làm việc đã sang ngày mới so với ngày đã chấm công -> Đăng xuất ngay
    if (isAttendanceCheckedIn && attendanceDate && attendanceDate !== todayStr) {
      logout()
      notify('Hết ca làm việc ngày hôm qua (23:59). Vui lòng đăng nhập và chấm công ca mới.')
      navigate('/login?session_expired=true', { replace: true })
      return
    }

    // 2. Thiết lập bộ đếm thời gian chạm mốc 23:59:59 đêm nay:
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(23, 59, 59, 999)

    const msUntilMidnight = Math.max(0, midnight.getTime() - now.getTime())

    const timerId = window.setTimeout(() => {
      logout()
      notify('Đã hết ca làm việc trong ngày (23:59). Hệ thống tự động đăng xuất theo quy định.')
      navigate('/login?session_expired=true', { replace: true })
    }, msUntilMidnight)

    // 3. Lắng nghe sự kiện chuyển tab / mở lại máy tính (Laptop mở nắp):
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentDay = dayjs().format('YYYY-MM-DD')
        const currentStore = useAuthStore.getState()
        if (
          currentStore.isAuthenticated &&
          currentStore.isAttendanceCheckedIn &&
          currentStore.attendanceDate &&
          currentStore.attendanceDate !== currentDay
        ) {
          logout()
          notify('Hết ca làm việc ngày hôm qua (23:59). Vui lòng đăng nhập và chấm công ca mới.')
          navigate('/login?session_expired=true', { replace: true })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearTimeout(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, attendanceDate, isAttendanceCheckedIn, logout, navigate])
}

export default useMidnightAutoLogout

