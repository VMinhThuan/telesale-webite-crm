import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import customerService, { CustomerQueryParams, SaveCareLogPayload } from '../services/customer.service'
import { notify } from '../utils/notify'

export const CUSTOMERS_LIST_QUERY_KEY = ['customers_list']
export const CUSTOMER_DETAIL_QUERY_KEY = ['customer_detail']
export const CUSTOMER_HISTORY_QUERY_KEY = ['customer_history']

/**
 * Hook truy vấn danh sách khách hàng kèm lọc và phân trang
 */
export function useCustomersList(params?: CustomerQueryParams) {
  return useQuery({
    queryKey: [...CUSTOMERS_LIST_QUERY_KEY, params],
    queryFn: () => customerService.getCustomers(params),
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn thông tin chi tiết của một khách hàng
 */
export function useCustomerDetail(customerId?: number) {
  return useQuery({
    queryKey: [...CUSTOMER_DETAIL_QUERY_KEY, customerId],
    queryFn: () => customerService.getCustomerDetail(customerId!),
    enabled: Boolean(customerId),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook truy vấn lịch sử tương tác và chăm sóc của khách hàng
 */
export function useCustomerHistory(customerId?: number, type?: 'call' | 'care' | 'service') {
  return useQuery({
    queryKey: [...CUSTOMER_HISTORY_QUERY_KEY, customerId, type],
    queryFn: () => customerService.getCustomerHistory(customerId!, type),
    enabled: Boolean(customerId),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Mutation lưu kết quả chăm sóc khách hàng tiềm năng
 */
export function useSaveCareLogMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
      idempotencyKey,
    }: {
      customerId: number
      payload: SaveCareLogPayload
      idempotencyKey?: string
    }) => customerService.saveCareLog(customerId, payload, idempotencyKey),

    onSuccess: (_, variables) => {
      // Làm mới danh sách và lịch sử tương tác của khách hàng
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: [...CUSTOMER_HISTORY_QUERY_KEY, variables.customerId],
      })
      queryClient.invalidateQueries({
        queryKey: [...CUSTOMER_DETAIL_QUERY_KEY, variables.customerId],
      })
      notify('Đã cập nhật kết quả chăm sóc khách hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi lưu kết quả chăm sóc. Vui lòng thử lại.')
    },
  })
}
