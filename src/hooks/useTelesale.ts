import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import telesaleService, {
  DialCallPayload,
  GetNextCustomerPayload,
} from '../services/telesale.service'
import { SaveCallResultPayload } from '../types/api'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'

// Giữ lại alias query key để đảm bảo tương thích ngược 100%
export const CAMPAIGNS_QUERY_KEY = queryKeys.telesale.campaigns()
export const DAILY_RESULTS_QUERY_KEY = queryKeys.telesale.all
export const DAILY_RESULTS_LIST_QUERY_KEY = queryKeys.telesale.all
export const CALL_LOGS_QUERY_KEY = queryKeys.reports.all
export const ATTENDANCE_QUERY_KEY = queryKeys.reports.all

/**
 * Hook truy vấn danh sách chiến dịch đang hoạt động
 */
export function useCampaigns() {
  return useQuery({
    queryKey: queryKeys.telesale.campaigns(),
    queryFn: () => telesaleService.getCampaigns(),
    staleTime: 1000 * 60 * 5, // 5 phút
  })
}

/**
 * Hook truy vấn kết quả hiệu suất telesale trong ngày
 */
export function useDailyResults(date?: string) {
  return useQuery({
    queryKey: queryKeys.telesale.dailyResults(date),
    queryFn: () => telesaleService.getDailyResults(date),
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn danh sách hiệu suất telesale theo khoảng thời gian
 */
export function useDailyResultsList(payload?: { from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: queryKeys.telesale.dailyResultsList(payload),
    queryFn: () => telesaleService.getDailyResultsList(payload),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn lịch sử cuộc gọi telesale (API 10a)
 * Tích hợp placeholderData: keepPreviousData giúp chuyển trang lịch sử mượt mà
 */
export function useCallLogs(payload?: {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
}) {
  return useQuery({
    queryKey: queryKeys.reports.callLogs(payload),
    queryFn: () => telesaleService.getCallLogs(payload),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn lịch sử cuộc gọi telesale theo cơ chế phân trang vô tận (Infinite Scroll)
 * Tự động tính offset start/length tiếp theo dựa trên số lượng bản ghi đã nạp từ ERP
 */
export function useInfiniteCallLogs(payload?: {
  from_date?: string
  to_date?: string
  length?: number
  user_id?: number
}) {
  const pageSize = payload?.length || 50
  return useInfiniteQuery({
    queryKey: [...queryKeys.reports.callLogs(payload), 'infinite'],
    queryFn: ({ pageParam = 0 }) =>
      telesaleService.getCallLogs({
        ...payload,
        start: pageParam,
        length: pageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((acc, page) => acc + (page.items?.length || 0), 0)
      if (loadedCount < lastPage.total) {
        return loadedCount
      }
      return undefined
    },
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn chấm công nhân viên (API 09)
 * Tích hợp placeholderData: keepPreviousData
 */
export function useAttendance(payload?: {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
}) {
  return useQuery({
    queryKey: queryKeys.reports.attendance(payload),
    queryFn: () => telesaleService.getAttendance(payload),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Mutation lấy khách hàng tiếp theo để quay số
 */
export function useNextCustomerMutation() {
  return useMutation({
    mutationFn: (payload: GetNextCustomerPayload) =>
      telesaleService.getNextCustomer(payload),
    onError: (err: any) => {
      notify(err.message || 'Không thể lấy thông tin khách hàng tiếp theo.')
    },
  })
}

/**
 * Mutation lấy đầu số kỹ thuật và thực hiện quay số
 */
export function useDialCallMutation() {
  return useMutation({
    mutationFn: (payload: DialCallPayload) => telesaleService.dialCall(payload),
    onError: (err: any) => {
      notify(err.message || 'Không thể kết nối đường truyền cuộc gọi.')
    },
  })
}

/**
 * Mutation lưu kết quả cuộc gọi và tự động lên đơn
 */
export function useSaveCallResultMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      customerId,
      payload,
      idempotencyKey,
    }: {
      customerId: number
      payload: SaveCallResultPayload
      idempotencyKey?: string
    }) => telesaleService.saveCallResult(customerId, payload, idempotencyKey),

    onSuccess: (data, variables) => {
      // Invalidate toàn bộ dailyResults theo cấu trúc hierarchical của queryKeys
      queryClient.invalidateQueries({ queryKey: queryKeys.telesale.all })

      if (variables.payload.result === 'closed') {
        // Tự động invalidate danh sách đơn hàng khi chốt đơn thành công
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
        notify(`Đã chốt đơn thành công! Mã đơn: ${data?.ord_code || 'Chờ xác nhận'}`)
      } else {
        notify('Đã lưu kết quả cuộc gọi thành công!')
      }
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi lưu kết quả cuộc gọi. Vui lòng thử lại.')
    },
  })
}
