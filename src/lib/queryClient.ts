import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { notify } from '../utils/notify'

/**
 * Cấu hình TanStack React Query Client tối ưu cho hệ thống CRM Telesale:
 * - MutationCache: Tự động bắt lỗi mutation tập trung, loại bỏ boilerplate code
 * - QueryCache: Giám sát và ghi nhận lỗi query an toàn (bỏ qua mã 401 đã xử lý ở axios)
 * - Cache danh mục enums và slot hẹn 5 phút (staleTime: 5m)
 * - Tự động thử lại 1 lần nếu mất kết nối mạng tạm thời
 * - Không tự động refetch khi chuyển đổi focus cửa sổ
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any) => {
      // 401 đã được apiClient interceptor điều hướng tự động về /login
      if (error?.status !== 401 && error?.message) {
        console.warn('[QueryCache Error]:', error.message)
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any, _variables, _context, mutation) => {
      // Nếu mutation chưa có onError handler riêng biệt thì tự động thông báo lỗi tập trung
      if (!mutation.options.onError && error?.status !== 401) {
        notify(error?.message || 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại.')
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default queryClient