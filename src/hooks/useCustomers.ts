import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import customerService, { CustomerQueryParams, SaveCareLogPayload } from '../services/customer.service'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'

// Giữ lại alias query key để đảm bảo tương thích ngược 100%
export const CUSTOMERS_LIST_QUERY_KEY = queryKeys.customers.lists()
export const CUSTOMER_DETAIL_QUERY_KEY = queryKeys.customers.details()
export const CUSTOMER_HISTORY_QUERY_KEY = queryKeys.customers.histories()

/**
 * Hook truy vấn danh sách khách hàng kèm lọc và phân trang
 * Sử dụng placeholderData: keepPreviousData giúp trải nghiệm chuyển tab / lọc khách hàng mượt mà
 */
export function useCustomersList(params?: CustomerQueryParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => customerService.getCustomers(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn thông tin chi tiết của một khách hàng
 */
export function useCustomerDetail(customerId?: number) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId),
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
    queryKey: queryKeys.customers.history(customerId, type),
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

    onSuccess: (data, variables) => {
      // Làm mới danh sách và lịch sử tương tác của khách hàng theo phân cấp chính xác
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.history(variables.customerId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      })

      // Nếu chốt đơn thành công, tự động làm mới danh sách đơn hàng
      if (variables.payload.result === 'closed') {
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
        notify(`Đã chốt đơn thành công! Mã đơn: ${data?.ord_code || 'Chờ xác nhận'}`)
      } else {
        notify('Đã cập nhật kết quả chăm sóc khách hàng thành công!')
      }
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi lưu kết quả chăm sóc. Vui lòng thử lại.')
    },
  })
}