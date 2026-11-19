import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../constants/queryKeys'
import customBranchConfigService from '../services/customBranchConfig.service'
import { CustomBranchConfigFile } from '../types/customBranchConfig'
import { useAuthStore } from '../store/useAuthStore'
import { notify } from '../utils/notify'

/**
 * Hook truy vấn danh sách chi nhánh bổ sung từ Cloudflare R2
 */
export function useCustomBranchConfig() {
  return useQuery({
    queryKey: queryKeys.customBranchConfig.config(),
    queryFn: () => customBranchConfigService.getConfig(),
    staleTime: 1000 * 60 * 5, // 5 phút cache
  })
}

/**
 * Mutation lưu cấu hình chi nhánh bổ sung lên Cloudflare R2
 */
export function useSaveCustomBranchConfigMutation() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (config: CustomBranchConfigFile) =>
      customBranchConfigService.saveConfig(
        config,
        currentUser?.username || currentUser?.name || 'admin',
      ),
    onSuccess: (savedConfig) => {
      queryClient.setQueryData(queryKeys.customBranchConfig.config(), savedConfig)
      queryClient.invalidateQueries({ queryKey: queryKeys.customBranchConfig.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.telesale.campaigns() })
      notify('Đã cập nhật danh sách chi nhánh bổ sung thành công!', { type: 'success' })
    },
    onError: (err: any) => {
      console.error('Lỗi khi lưu cấu hình chi nhánh:', err)
      notify(err.message || 'Không thể lưu cấu hình chi nhánh. Vui lòng thử lại.', {
        type: 'warning',
      })
    },
  })
}
