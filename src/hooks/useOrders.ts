import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import orderService, {
  AddOrderCommentPayload,
  LuiHuyOrderPayload,
  OrderQueryParams,
  RescheduleOrderPayload,
} from '../services/order.service'
import { notify } from '../utils/notify'

export const ORDERS_LIST_QUERY_KEY = ['orders_list']
export const BRANCH_SLOTS_QUERY_KEY = ['branch_slots']

/**
 * Hook truy vấn danh sách đơn hàng theo ngày hẹn kèm phân trang và tìm kiếm
 */
export function useOrdersList(params?: OrderQueryParams) {
  return useQuery({
    queryKey: [...ORDERS_LIST_QUERY_KEY, params],
    queryFn: () => orderService.getOrders(params),
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook truy vấn danh sách slot hẹn theo chi nhánh
 */
export function useBranchSlots(branchId = 3, fromDate?: string, toDate?: string) {
  return useQuery({
    queryKey: [...BRANCH_SLOTS_QUERY_KEY, branchId, fromDate, toDate],
    queryFn: () => orderService.getBranchSlots(branchId, fromDate, toDate),
    staleTime: 1000 * 60 * 5, // 5 phút
  })
}

/**
 * Mutation đổi lịch hẹn đơn hàng
 */
export function useRescheduleOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: number
      payload: RescheduleOrderPayload
    }) => orderService.rescheduleOrder(orderId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_LIST_QUERY_KEY })
      notify('Đổi lịch hẹn đơn hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi đổi lịch hẹn. Vui lòng thử lại.')
    },
  })
}

/**
 * Mutation xử lý đơn trả về, lùi, hoặc hủy đơn
 */
export function useLuiHuyOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: number
      payload: LuiHuyOrderPayload
    }) => orderService.luiHuyOrder(orderId, payload),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_LIST_QUERY_KEY })
      const text =
        variables.payload.type === 'tra_ve'
          ? 'Đã chuyển đơn sang trạng thái trả về'
          : variables.payload.type === 'huy'
          ? 'Đã hủy đơn hàng'
          : 'Đã cập nhật trạng thái đơn hàng'
      notify(text)
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi cập nhật trạng thái đơn. Vui lòng thử lại.')
    },
  })
}

/**
 * Mutation xác nhận lịch hẹn với khách hàng
 */
export function useConfirmOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: number) => orderService.confirmOrder(orderId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_LIST_QUERY_KEY })
      notify('Đã xác nhận lịch hẹn với khách hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi xác nhận lịch hẹn. Vui lòng thử lại.')
    },
  })
}

/**
 * Mutation thêm ghi chú / bình luận vào đơn hàng
 */
export function useAddOrderCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: number
      payload: AddOrderCommentPayload
    }) => orderService.addComment(orderId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_LIST_QUERY_KEY })
      notify('Đã thêm ghi chú vào đơn hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi thêm ghi chú. Vui lòng thử lại.')
    },
  })
}

