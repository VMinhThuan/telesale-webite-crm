import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import telesaleService, {
  DialCallPayload,
  GetNextCustomerPayload,
} from '../services/telesale.service'
import { AttendanceDto, SaveCallResultPayload } from '../types/api'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'
import dayjs from '../lib/dayjs'

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
 * Hook truy vấn kết quả hiệu suất telesale trong ngày hoặc khoảng ngày
 */
export function useDailyResults(date?: string | { from_date?: string; to_date?: string }) {
  const dateKey =
    typeof date === 'string'
      ? date
      : date
        ? `${date.from_date || ''}_${date.to_date || ''}`
        : undefined

  return useQuery({
    queryKey: queryKeys.telesale.dailyResults(dateKey),
    queryFn: () => telesaleService.getDailyResults(date),
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn danh sách hiệu suất telesale theo khoảng thời gian
 */
export function useDailyResultsList(payload?: {
  from_date?: string
  to_date?: string
  user_id?: number
  start?: number
  length?: number
}) {
  return useQuery({
    queryKey: queryKeys.telesale.dailyResultsList(payload),
    queryFn: () => telesaleService.getDailyResultsList(payload),
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Công thức tính hoa hồng theo yêu cầu nghiệp vụ:
 * - Dưới hoặc bằng 100 đơn: don_phat_sinh * 75.000đ
 * - Trên 100 đơn: don_phat_sinh * 100.000đ
 */
export function calculateCommission(donPhatSinh: number): number {
  if (!donPhatSinh || donPhatSinh <= 0) return 0
  const rate = donPhatSinh > 100 ? 100000 : 75000
  return donPhatSinh * rate
}

export interface DailyCommissionItem {
  date: string // 'YYYY-MM-DD'
  dayLabel: string // 'T2 29/10' hoặc 'Hôm nay (29/10)'
  dayOfWeek: string // 'T2'
  shortDate: string // '29/10'
  isToday: boolean
  donPhatSinh: number
  commission: number
  unitPrice: number
  totalCalls: number
  connectedCalls: number
}

/**
 * Hook truy vấn hiệu suất hoa hồng 7 ngày gần nhất (T-6 đến T)
 * Do Backend API daily-results gộp tất cả các ngày trong khoảng thành 1 dòng,
 * giải pháp chuẩn hóa là gọi song song 7 ngày và gộp kết quả trên FE.
 */
export function useLast7DaysDailyResults() {
  return useQuery<DailyCommissionItem[]>({
    queryKey: queryKeys.telesale.last7DaysCommission(),
    queryFn: async () => {
      const today = dayjs()
      const dates = Array.from({ length: 7 }, (_, i) => {
        return today.subtract(6 - i, 'day').format('YYYY-MM-DD')
      })

      const dayOfWeekMap: Record<number, string> = {
        0: 'CN',
        1: 'T2',
        2: 'T3',
        3: 'T4',
        4: 'T5',
        5: 'T6',
        6: 'T7',
      }

      const results = await Promise.allSettled(
        dates.map((dateStr) => telesaleService.getDailyResults(dateStr)),
      )

      return dates.map((dateStr, idx) => {
        const itemResult = results[idx]
        const data = itemResult.status === 'fulfilled' ? itemResult.value : null

        const donPhatSinh = data?.don_phat_sinh ?? data?.tong_da_chot ?? 0
        const commission = calculateCommission(donPhatSinh)
        const unitPrice = donPhatSinh > 100 ? 100000 : 75000
        const d = dayjs(dateStr)
        const dow = dayOfWeekMap[d.day()] || ''
        const shortDate = d.format('DD/MM')
        const isToday = dateStr === today.format('YYYY-MM-DD')

        return {
          date: dateStr,
          dayLabel: isToday ? `Hôm nay (${shortDate})` : `${dow} ${shortDate}`,
          dayOfWeek: dow,
          shortDate,
          isToday,
          donPhatSinh,
          commission,
          unitPrice,
          totalCalls: data?.tong_total_call ?? 0,
          connectedCalls: data?.tong_call_answer ?? 0,
        }
      })
    },
    staleTime: 1000 * 60 * 5, // 5 phút
  })
}

/**
 * Hook truy vấn lịch sử cuộc gọi telesale (API 10a)
 * Tích hợp placeholderData: keepPreviousData giúp chuyển trang lịch sử mượt mà
 */
export function useCallLogs(
  payload?: {
    from_date?: string
    to_date?: string
    start?: number
    length?: number
    user_id?: number
  },
  options?: {
    enabled?: boolean
    refetchInterval?: number | false
  },
) {
  return useQuery({
    queryKey: queryKeys.reports.callLogs(payload),
    queryFn: () => telesaleService.getCallLogs(payload),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30s
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
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
 * Helper tính toán số phút làm việc giữa 2 mốc giờ chấm công (hỗ trợ "HH:mm", "HH:mm:ss" hoặc ISO datetime)
 */
export function calculateMinutesBetween(start?: string, end?: string): number {
  if (!start || !end) return 0
  const trimmedStart = start.trim()
  const trimmedEnd = end.trim()

  // Trường hợp dạng HH:mm hoặc HH:mm:ss
  if (trimmedStart.includes(':') && !trimmedStart.includes('T') && !trimmedStart.includes('-')) {
    const [h1, m1] = trimmedStart.split(':').map(Number)
    const [h2, m2] = trimmedEnd.split(':').map(Number)
    if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
      return diff > 0 ? diff : 0
    }
  }

  // Trường hợp dạng datetime hoặc ISO string
  const d1 = dayjs(trimmedStart)
  const d2 = dayjs(trimmedEnd)
  if (d1.isValid() && d2.isValid()) {
    const diff = d2.diff(d1, 'minute')
    return diff > 0 ? diff : 0
  }

  return 0
}

/**
 * Helper tính tổng số phút làm việc từ danh sách bản ghi chấm công (ca 1 + ca 2)
 */
export function calculateTotalWorkingMinutes(records?: AttendanceDto[]): number {
  if (!records || !Array.isArray(records) || records.length === 0) return 0
  return records.reduce((sum, rec) => {
    const shift1 = calculateMinutesBetween(rec.gio_vao1, rec.gio_ra1)
    const shift2 = calculateMinutesBetween(rec.gio_vao2, rec.gio_ra2)
    return sum + shift1 + shift2
  }, 0)
}

/**
 * Format số phút làm việc thành định dạng "X giờ Y phút"
 */
export function formatWorkingTime(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 giờ 0 phút'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} giờ ${minutes} phút`
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
