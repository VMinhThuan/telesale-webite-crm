import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { telesaleConfigService } from '../services/telesaleConfig.service'
import { BannerConfig, TelesaleScript } from '../types/telesaleConfig'
import { notify } from '../utils/notify'

export const TELESALE_CONFIG_KEY = ['telesale', 'config'] as const

/**
 * Hook tải cấu hình Telesale (Banners & Kịch bản) từ Cloudflare R2
 */
export function useTelesaleConfig() {
  return useQuery({
    queryKey: TELESALE_CONFIG_KEY,
    queryFn: () => telesaleConfigService.getConfig(),
    staleTime: 1000 * 60 * 5, // 5 phút cache
  })
}

/**
 * Mutation tải ảnh banner mới lên R2
 */
export function useUploadBannerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      title,
      linkUrl,
    }: {
      file: File
      title?: string
      linkUrl?: string
    }) => telesaleConfigService.uploadBannerImage(file, title, linkUrl),
    onSuccess: (newBanner) => {
      queryClient.invalidateQueries({ queryKey: TELESALE_CONFIG_KEY })
      notify(`Đã thêm banner "${newBanner.title}" thành công!`)
    },
    onError: (err: any) => {
      notify(err.message || 'Lỗi khi tải ảnh banner lên.')
    },
  })
}

/**
 * Mutation xóa ảnh banner
 */
export function useDeleteBannerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (bannerId: string) => telesaleConfigService.deleteBanner(bannerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELESALE_CONFIG_KEY })
      notify('Đã xóa banner thành công!')
    },
    onError: (err: any) => {
      notify(err.message || 'Không thể xóa banner.')
    },
  })
}

/**
 * Mutation cập nhật cài đặt chuyển ảnh banner
 */
export function useUpdateBannerSettingsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<BannerConfig>) =>
      telesaleConfigService.updateBannerSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELESALE_CONFIG_KEY })
      notify('Đã cập nhật cài đặt banner thành công!')
    },
    onError: (err: any) => {
      notify(err.message || 'Không thể cập nhật cài đặt banner.')
    },
  })
}

/**
 * Mutation lưu hoặc cập nhật kịch bản tư vấn
 */
export function useSaveScriptMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (script: TelesaleScript) => telesaleConfigService.saveScript(script),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: TELESALE_CONFIG_KEY })
      notify(`Đã lưu kịch bản "${saved.name}" thành công!`)
    },
    onError: (err: any) => {
      notify(err.message || 'Lỗi khi lưu kịch bản.')
    },
  })
}

/**
 * Mutation xóa kịch bản tư vấn
 */
export function useDeleteScriptMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (scriptId: string) => telesaleConfigService.deleteScript(scriptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TELESALE_CONFIG_KEY })
      notify('Đã xóa kịch bản thành công!')
    },
    onError: (err: any) => {
      notify(err.message || 'Không thể xóa kịch bản.')
    },
  })
}

