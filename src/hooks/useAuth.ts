import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import authService, { LoginCredentials } from '../services/auth.service'
import { useAuthStore } from '../store/useAuthStore'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'

// Giữ alias query key để đảm bảo tương thích ngược 100%
export const USER_INFO_QUERY_KEY = queryKeys.auth.user()
export const USER_LISTS_QUERY_KEY = queryKeys.auth.all

export function useUserLists(params?: {
  phong_ban?: number
  bo_phan?: number
  branch_id?: number
}) {
  return useQuery({
    queryKey: queryKeys.auth.userLists(params),
    queryFn: () => authService.getUserLists(params),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAuth() {
  const queryClient = useQueryClient()
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore()

  // Query lấy thông tin cá nhân và cấu hình SIP
  const userInfoQuery = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: () => authService.getUserInfo(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 15, // 15 phút
  })

  // Tự động đồng bộ thông tin SIP và profile vào authStore khi query hoàn tất
  useEffect(() => {
    if (userInfoQuery.data) {
      updateUser(userInfoQuery.data)
    }
  }, [userInfoQuery.data, updateUser])

  // Mutation đăng nhập: Đảm bảo nạp ngay profile và cấu hình SIP đầy đủ
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const loginRes = await authService.login(credentials)
      try {
        const fullProfile = await authService.getUserInfo()
        return { access_token: loginRes.access_token, user: fullProfile }
      } catch {
        return loginRes
      }
    },
    onSuccess: (data) => {
      login(data.access_token, data.user)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
      notify(`Đăng nhập thành công! Xin chào ${data.user.name}`)
    },
    onError: (err: any) => {
      notify(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.')
    },
  })

  // Mutation đăng xuất (luôn dọn dẹp state và hủy SIP dù API logout thành công hay thất bại)
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      logout()
      queryClient.clear()
      notify('Đã đăng xuất khỏi hệ thống.')
    },
  })

  // Mutation cập nhật thông tin KYC
  const updateInfoMutation = useMutation({
    mutationFn: (formData: FormData) => authService.updateUserInfo(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
      notify('Đã cập nhật thông tin thành công!')
    },
    onError: (err: any) => {
      notify(err.message || 'Cập nhật thất bại. Vui lòng thử lại.')
    },
  })

  return {
    user: userInfoQuery.data || user,
    token,
    isAuthenticated,
    isLoadingUser: userInfoQuery.isLoading,
    loginMutation,
    logoutMutation,
    updateInfoMutation,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateUser,
  }
}
