import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import authService, { LoginCredentials } from '../services/auth.service'
import { useAuthStore } from '../store/useAuthStore'
import { notify } from '../utils/notify'

export const USER_INFO_QUERY_KEY = ['user_info']
export const USER_LISTS_QUERY_KEY = ['user_lists']

export function useUserLists(params?: {
  phong_ban?: number
  bo_phan?: number
  branch_id?: number
}) {
  return useQuery({
    queryKey: [...USER_LISTS_QUERY_KEY, params?.phong_ban, params?.bo_phan, params?.branch_id],
    queryFn: () => authService.getUserLists(params),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAuth() {
  const queryClient = useQueryClient()
  const { user, token, isAuthenticated, login, logout, updateUser } = useAuthStore()

  // Query lấy thông tin cá nhân và cấu hình SIP
  const userInfoQuery = useQuery({
    queryKey: USER_INFO_QUERY_KEY,
    queryFn: () => authService.getUserInfo(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 15, // 15 phút
  })

  // Mutation đăng nhập
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (data) => {
      login(data.access_token, data.user)
      queryClient.invalidateQueries({ queryKey: USER_INFO_QUERY_KEY })
      notify(`Đăng nhập thành công! Xin chào ${data.user.name}`)
    },
    onError: (err: any) => {
      notify(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.')
    },
  })

  // Mutation đăng xuất
  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      logout()
      queryClient.clear()
      notify('Đã đăng xuất khỏi hệ thống.')
    },
  })

  // Mutation cập nhật thông tin KYC
  const updateInfoMutation = useMutation({
    mutationFn: (formData: FormData) => authService.updateUserInfo(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_INFO_QUERY_KEY })
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

export default useAuth
