import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../constants/queryKeys'
import userRoleConfigService from '../services/userRoleConfig.service'
import { UserRolesConfigFile } from '../types/userRoleConfig'
import { useAuthStore } from '../store/useAuthStore'
import { determinePhanQuyen } from '../services/auth.service'
import { notify } from '../utils/notify'

/**
 * Hook truy vấn cấu hình phân quyền nhân sự từ Cloudflare R2
 */
export function useUserRolesConfig() {
  return useQuery({
    queryKey: queryKeys.userRoleConfig.config(),
    queryFn: () => userRoleConfigService.getConfig(),
    staleTime: 1000 * 60 * 5, // 5 phút cache
  })
}

/**
 * Mutation lưu cấu hình phân quyền nhân sự lên Cloudflare R2
 */
export function useSaveUserRolesConfigMutation() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (config: UserRolesConfigFile) =>
      userRoleConfigService.saveConfig(config, currentUser?.username || 'admin'),
    onSuccess: (savedConfig) => {
      queryClient.setQueryData(queryKeys.userRoleConfig.config(), savedConfig)
      queryClient.invalidateQueries({ queryKey: queryKeys.userRoleConfig.all })
      notify('Đã lưu cấu hình phân quyền nhân sự thành công!')
    },
    onError: (err: any) => {
      console.error('Lỗi khi lưu cấu hình phân quyền:', err)
      notify(err.message || 'Không thể lưu cấu hình phân quyền. Vui lòng thử lại.')
    },
  })
}

/**
 * Hàm thuần túy kiểm tra quyền xem hoa hồng dựa trên User Profile và Cấu hình R2
 */
export function checkCanViewCommission(
  user?: any | null,
  roleConfig?: UserRolesConfigFile | null,
): boolean {
  if (!user) return false

  // 1. Admin luôn có toàn quyền xem hoa hồng và báo cáo
  const phanQuyen = determinePhanQuyen(user)
  if (phanQuyen === 'admin') {
    return true
  }

  // 2. Ưu tiên cờ features nếu Backend có trả về tường minh
  if (user.features && typeof user.features.hoa_hong === 'boolean') {
    return user.features.hoa_hong
  }

  // 3. Tra cứu từ file cấu hình phân quyền trên Cloudflare R2
  if (roleConfig?.users) {
    const usernameKey = String(user.username || user.contactNumber || '')
    const idKey = String(user.id || '')

    const configItem = roleConfig.users[usernameKey] || roleConfig.users[idKey]
    if (configItem) {
      return configItem.role_type === 'sale_ctv'
    }
  }

  // 4. Fallback nhận diện theo thông tin profile hiện có
  const loaiNv = String(user.loaiNv || '').toLowerCase()
  const chucVu = String(user.chucVu || user.role || '').toLowerCase()

  if (loaiNv.includes('ctv') || chucVu.includes('ctv') || chucVu.includes('cộng tác')) {
    return true
  }

  // Mặc định: Nhân viên công ty (sale_congty) -> ẨN HOA HỒNG
  return false
}

/**
 * Hook kiểm tra xem tài khoản hiện tại có quyền xem chỉ số Hoa hồng hay không
 */
export function useCanViewCommission(): boolean {
  const user = useAuthStore((s) => s.user)
  const { data: roleConfig } = useUserRolesConfig()

  return useMemo(() => {
    return checkCanViewCommission(user, roleConfig)
  }, [user, roleConfig])
}
