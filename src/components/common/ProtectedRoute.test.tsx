import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../../store/useAuthStore'
import { ProtectedRoute } from './ProtectedRoute'

describe('ProtectedRoute Route Guard Unit Tests', () => {
  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      user: null,
      isAuthenticated: false,
    })
  })

  it('chưa đăng nhập (!isAuthenticated): chuyển hướng về /login kèm redirect query', () => {
    render(
      <MemoryRouter
        initialEntries={['/orders']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <div>Trang Đơn Hàng Bí Mật</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Trang Đăng Nhập Công Khai</div>} />
        </Routes>
      </MemoryRouter>,
    )

    // Không được hiển thị nội dung bí mật
    expect(screen.queryByText('Trang Đơn Hàng Bí Mật')).toBeNull()
    // Phải hiển thị trang đăng nhập
    expect(screen.getByText('Trang Đăng Nhập Công Khai')).toBeInTheDocument()
  })

  it('đã đăng nhập hợp lệ (isAuthenticated): cho phép truy cập nội dung bên trong', () => {
    useAuthStore.setState({
      token: 'fake-jwt-token-123',
      user: {
        id: 1,
        name: 'Nguyễn Văn A',
        username: 'nguyenvana',
        role: 'Telesale',
      },
      isAuthenticated: true,
    })

    render(
      <MemoryRouter
        initialEntries={['/telesale']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/telesale"
            element={
              <ProtectedRoute>
                <div>Bàn Làm Việc Telesale</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Trang Đăng Nhập</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Bàn Làm Việc Telesale')).toBeInTheDocument()
    expect(screen.queryByText('Trang Đăng Nhập')).toBeNull()
  })
})

