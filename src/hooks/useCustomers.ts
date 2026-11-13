import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import customerService, { CustomerQueryParams, SaveCareLogPayload } from '../services/customer.service'
import {
  AddCustomerMemberPayload,
  ErpSource,
  UpdateCustomerMemberPayload,
  UpdateCustomerPayload,
} from '../types/api'
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
 * Hook truy vấn thông tin chi tiết của một khách hàng từ đúng ERP
 */
export function useCustomerDetail(customerId?: number, source_erp?: ErpSource) {
  return useQuery({
    queryKey: queryKeys.customers.detail(customerId, source_erp),
    queryFn: () => customerService.getCustomerDetail(customerId!, source_erp),
    enabled: Boolean(customerId),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Hook truy vấn lịch sử tương tác và chăm sóc của khách hàng từ đúng ERP
 */
export function useCustomerHistory(
  customerId?: number,
  type?: 'call' | 'care' | 'service',
  source_erp?: ErpSource,
) {
  return useQuery({
    queryKey: queryKeys.customers.history(customerId, type, source_erp),
    queryFn: () => customerService.getCustomerHistory(customerId!, type, source_erp),
    enabled: Boolean(customerId),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Mutation lưu kết quả chăm sóc khách hàng tiềm năng lên đúng ERP
 */
export function useSaveCareLogMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
      idempotencyKey,
      source_erp,
    }: {
      customerId: number
      payload: SaveCareLogPayload
      idempotencyKey?: string
      source_erp?: ErpSource
    }) => customerService.saveCareLog(customerId, payload, idempotencyKey, source_erp),

    onSuccess: (data, variables) => {
      // Làm mới danh sách và lịch sử tương tác của khách hàng theo phân cấp chính xác
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.histories(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.details(),
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

/**
 * Mutation cập nhật thông tin khách hàng (tên, địa chỉ, loại máy, v.v.)
 */
export function useUpdateCustomerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
      source_erp,
    }: {
      customerId: number
      payload: UpdateCustomerPayload
      source_erp?: ErpSource
    }) => customerService.updateCustomer(customerId, payload, source_erp),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.history(variables.customerId),
      })
      notify(data?.msg || 'Cập nhật thông tin khách hàng thành công!')
    },

    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Lỗi khi cập nhật thông tin khách hàng.'
      notify(msg)
    },
  })
}

/**
 * Mutation thêm số điện thoại / người liên hệ mới cho khách hàng
 */
export function useAddCustomerMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
      source_erp,
    }: {
      customerId: number
      payload: AddCustomerMemberPayload
      source_erp?: ErpSource
    }) => customerService.addCustomerMember(customerId, payload, source_erp),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      })
      notify(data?.msg || 'Thêm số điện thoại thành công!')
    },

    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Lỗi khi thêm số điện thoại.'
      notify(msg)
    },
  })
}

/**
 * Mutation cập nhật số điện thoại / người liên hệ của khách hàng
 */
export function useUpdateCustomerMemberMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      memberId,
      payload,
      source_erp,
    }: {
      customerId: number
      memberId: number
      payload: UpdateCustomerMemberPayload
      source_erp?: ErpSource
    }) => customerService.updateCustomerMember(customerId, memberId, payload, source_erp),

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(variables.customerId),
      })
      notify(data?.msg || 'Cập nhật thông tin thành viên thành công!')
    },

    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.message ||
        'Lỗi khi cập nhật thành viên.'
      notify(msg)
    },
  })
}