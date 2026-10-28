import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import telesaleService, {
  DialCallPayload,
  GetNextCustomerPayload,
} from '../services/telesale.service'
import { SaveCallResultPayload } from '../types/api'
import { ORDERS_LIST_QUERY_KEY } from './useOrders'
import { notify } from '../utils/notify'

export const CAMPAIGNS_QUERY_KEY = ['telesale_campaigns']
export const DAILY_RESULTS_QUERY_KEY = ['telesale_daily_results']
export const DAILY_RESULTS_LIST_QUERY_KEY = ['telesale_daily_results_list']
export const CALL_LOGS_QUERY_KEY = ['telesale_call_logs']
export const ATTENDANCE_QUERY_KEY = ['telesale_attendance']

/**
 * Hook truy vấn danh sách chiến dịch đang hoạt động
 */
export function useCampaigns() {
  return useQuery({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: () => telesaleService.getCampaigns(),
    staleTime: 1000 * 60 * 5, // 5 phút
  })
}

/**
 * Hook truy vấn kết quả hiệu suất telesale trong ngày
 */
export function useDailyResults(date?: string) {
  return useQuery({
    queryKey: [...DAILY_RESULTS_QUERY_KEY, date],
    queryFn: () => telesaleService.getDailyResults(date),
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn danh sách hiệu suất telesale theo khoảng thời gian
 */
export function useDailyResultsList(payload?: { from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: [...DAILY_RESULTS_LIST_QUERY_KEY, payload?.from_date, payload?.to_date],
    queryFn: () => telesaleService.getDailyResultsList(payload),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn lịch sử cuộc gọi telesale (API 10a)
 */
export function useCallLogs(payload?: {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
}) {
  return useQuery({
    queryKey: [
      ...CALL_LOGS_QUERY_KEY,
      payload?.from_date,
      payload?.to_date,
      payload?.start,
      payload?.length,
      payload?.user_id,
    ],
    queryFn: () => telesaleService.getCallLogs(payload),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn chấm công nhân viên (API 09)
 */
export function useAttendance(payload?: {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
}) {
  return useQuery({
    queryKey: [
      ...ATTENDANCE_QUERY_KEY,
      payload?.from_date,
      payload?.to_date,
      payload?.start,
      payload?.length,
      payload?.user_id,
    ],
    queryFn: () => telesaleService.getAttendance(payload),
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
      queryClient.invalidateQueries({ queryKey: DAILY_RESULTS_QUERY_KEY })

      if (variables.payload.result === 'closed') {
        queryClient.invalidateQueries({ queryKey: ORDERS_LIST_QUERY_KEY })
        notify(`Đã chốt đơn thành công! Mã đơn: ${data.ord_code || 'Chờ xác nhận'}`)
      } else {
        notify('Đã lưu kết quả cuộc gọi thành công!')
      }
    },

      onError: (err: any) => {
        notify(err.message || 'Lỗi khi lưu kết quả cuộc gọi. Vui lòng thử lại.')
      },
  })
}
