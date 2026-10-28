import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './apiClient'
import authService from './auth.service'

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('ERP trả về HTTP 200 nhưng success: false (Sai mật khẩu): bắt buộc ném lỗi, không đăng nhập', async () => {
    // Giả lập đúng response thực tế từ locnuoc365.xyz/api/login
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: { msg: 'Sai mật khẩu !!' },
      success: false,
      error: 'Đăng nhập thất bại, sai mật khẩu !!',
    } as any)

    await expect(
      authService.login({ username: '03865337846', password: 'wrong_password' }),
    ).rejects.toThrow('Đăng nhập thất bại, sai mật khẩu !!')

    expect(localStorage.getItem('salesflow_access_token')).toBeNull()
  })

  it('ERP trả về response không có access_token: bắt buộc ném lỗi', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {},
      success: true,
    } as any)

    await expect(
      authService.login({ username: 'testuser', password: 'password123' }),
    ).rejects.toThrow('Không nhận được mã xác thực access_token')

    expect(localStorage.getItem('salesflow_access_token')).toBeNull()
  })

  it('ERP trả về access_token hợp lệ: lưu token vào localStorage và trả về user', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {
        access_token: 'valid_jwt_token_999',
        user: {
          id: 10,
          name: 'Nguyễn Văn A',
          username: '03865337846',
          role: 'Telesale',
        },
      },
      success: true,
      error: null,
    } as any)

    const res = await authService.login({ username: '03865337846', password: 'correct_password' })

    expect(res.access_token).toBe('valid_jwt_token_999')
    expect(res.user.name).toBe('Nguyễn Văn A')
    expect(localStorage.getItem('salesflow_access_token')).toBe('valid_jwt_token_999')
  })
})