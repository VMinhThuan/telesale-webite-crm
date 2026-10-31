import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import trainingStorageService from '../services/trainingStorage.service'
import { UploadMaterialPayload } from '../types/training'
import { notify } from '../utils/notify'

export const TRAINING_QUERY_KEY = ['training', 'manifest'] as const

/**
 * Hook nạp danh sách tài liệu đào tạo từ Cloudflare R2
 */
export function useTrainingManifest() {
  return useQuery({
    queryKey: TRAINING_QUERY_KEY,
    queryFn: () => trainingStorageService.getManifest(),
    staleTime: 1000 * 60 * 5, // 5 phút cache
  })
}

/**
 * Mutation tải tệp lên Cloudflare R2 và cập nhật manifest
 */
export function useUploadMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UploadMaterialPayload) =>
      trainingStorageService.uploadMaterial(payload),
    onSuccess: (newMaterial) => {
      queryClient.invalidateQueries({ queryKey: TRAINING_QUERY_KEY })
      notify(`Đã tải lên tài liệu thành công: "${newMaterial.title}"`)
    },
    onError: (err: any) => {
      notify(err.message || 'Lỗi khi tải lên tệp lên Cloudflare R2.')
    },
  })
}

/**
 * Mutation xóa tài liệu khỏi Cloudflare R2
 */
export function useDeleteMaterialMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, fileKey }: { id: string; fileKey?: string }) =>
      trainingStorageService.deleteMaterial(id, fileKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRAINING_QUERY_KEY })
      notify('Đã xóa tài liệu đào tạo thành công!')
    },
    onError: (err: any) => {
      notify(err.message || 'Không thể xóa tài liệu trên Cloudflare R2.')
    },
  })
}

