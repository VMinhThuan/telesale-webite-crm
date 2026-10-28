import { QueryClient } from '@tanstack/react-query'

/**
 * Cấu hình React Query Client tối ưu cho hệ thống CRM Telesale:
 * - Cache danh mục enums và slot hẹn 5 phút (staleTime: 5m)
 * - Tự động thử lại 1 lần nếu mất kết nối tạm thời
 * - Không tự động refetch khi chuyển đổi focus cửa sổ
 */
export const queryClient = new QueryClient({
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
