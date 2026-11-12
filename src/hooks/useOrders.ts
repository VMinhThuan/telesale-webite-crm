import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import orderService, {
  AddOrderCommentPayload,
  LuiHuyOrderPayload,
  OrderQueryParams,
  RescheduleOrderPayload,
} from '../services/order.service'
import { ApiPaginatedResult, ErpSource, OrderDto } from '../types/api'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'

// Giữ lại alias query key để đảm bảo tương thích ngược 100% với các component cũ
export const ORDERS_LIST_QUERY_KEY = queryKeys.orders.lists()
export const BRANCH_SLOTS_QUERY_KEY = queryKeys.orders.all

/**
 * Hook truy vấn danh sách đơn hàng theo ngày hẹn kèm phân trang và tìm kiếm
 * Sử dụng placeholderData: keepPreviousData giúp chuyển trang và lọc mượt mà, không giật lag
 */
export function useOrdersList(params?: OrderQueryParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getOrders(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 2, // 2 phút
  })
}

/**
 * Hook tính toán tổng doanh số đơn hàng thực tế (API 12 gộp)
 * Tận dụng thuộc tính select của TanStack Query để đạt Structural Sharing:
 * Chỉ trigger re-render khi tổng số tiền doanh số THỰC SỰ thay đổi!
 */
export function useOrdersTotalRevenue(params?: OrderQueryParams) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => orderService.getOrders(params),
    select: (data) => {
      if (!data?.items) return 0
      return data.items
        .filter(
          (order) =>
            !['huy', 'tra_ve', 'lui', 'sai_may', 'dang_hen_lai'].includes(order.status),
        )
        .reduce((sum, order) => sum + (Number(order.doanh_so) || 0), 0)
    },
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Hook truy vấn danh sách slot hẹn theo chi nhánh và nguồn ERP
 */
export function useBranchSlots(
  branchId = 3,
  fromDate?: string,
  toDate?: string,
  options?: { enabled?: boolean; source_erp?: ErpSource },
) {
  return useQuery({
    queryKey: queryKeys.orders.slots(branchId, fromDate, toDate, options?.source_erp),
    queryFn: () => orderService.getBranchSlots(branchId, fromDate, toDate, options?.source_erp),
    staleTime: 1000 * 60 * 5, // 5 phút
    enabled: options?.enabled ?? true,
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
      source_erp,
    }: {
      orderId: number
      payload: RescheduleOrderPayload
      source_erp?: ErpSource
    }) => orderService.rescheduleOrder(orderId, payload, source_erp),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      notify('Đổi lịch hẹn đơn hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi đổi lịch hẹn. Vui lòng thử lại.')
    },
  })
}

/**
 * Mutation xử lý đơn trả về, lùi, hoặc hủy đơn
 * Áp dụng Optimistic Update: Cập nhật trạng thái hiển thị ngay lập tức (0ms),
 * tự động khôi phục nếu phát sinh lỗi mạng (Zero Latency UI)
 */
export function useLuiHuyOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      orderId,
      payload,
      source_erp,
    }: {
      orderId: number
      payload: LuiHuyOrderPayload
      source_erp?: ErpSource
    }) => orderService.luiHuyOrder(orderId, payload, source_erp),

    onMutate: async ({ orderId, payload, source_erp }) => {
      // 1. Hủy các query đang fetch dở cho orders để tránh ghi đè dữ liệu lạc quan
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() })

      // 2. Lưu snapshot các query orders hiện tại
      const previousQueries = queryClient.getQueriesData<ApiPaginatedResult<OrderDto>>({
        queryKey: queryKeys.orders.lists(),
      })

      const statusText =
        payload.type === 'tra_ve'
          ? 'Trả về'
          : payload.type === 'huy'
            ? 'Đã hủy'
            : payload.type === 'lui'
              ? 'Lùi lịch'
              : 'Đang xử lý'

      // 3. Cập nhật lạc quan trạng thái trên UI
      queryClient.setQueriesData<ApiPaginatedResult<OrderDto>>(
        { queryKey: queryKeys.orders.lists() },
        (old) => {
          if (!old || !old.items) return old
          return {
            ...old,
            items: old.items.map((ord) =>
              ord.order_id === orderId && (!source_erp || ord.source_erp === source_erp)
                ? {
                  ...ord,
                  status: statusText,
                  trang_thai: statusText,
                }
                : ord,
            ),
          }
        },
      )

      return { previousQueries }
    },

    onError: (err: any, _variables, context) => {
      // Hoàn tác dữ liệu cũ nếu server trả về lỗi
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      notify(err.message || 'Lỗi khi cập nhật trạng thái đơn. Đã hoàn tác.')
    },

    onSuccess: (_, variables) => {
      const text =
        variables.payload.type === 'tra_ve'
          ? 'Đã chuyển đơn sang trạng thái trả về'
          : variables.payload.type === 'huy'
            ? 'Đã hủy đơn hàng'
            : 'Đã cập nhật trạng thái đơn hàng'
      notify(text)
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
    },
  })
}

/**
 * Mutation xác nhận lịch hẹn với khách hàng
 * Áp dụng Optimistic Update: Đổi cờ sale_checked sang true ngay tức thì (0ms),
 * tự động khôi phục nếu máy chủ báo lỗi (Zero Latency UI)
 */
export function useConfirmOrderMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (param: number | { orderId: number; source_erp?: ErpSource }) => {
      const orderId = typeof param === 'number' ? param : param.orderId
      const source_erp = typeof param === 'number' ? undefined : param.source_erp
      return orderService.confirmOrder(orderId, source_erp)
    },

    onMutate: async (param: number | { orderId: number; source_erp?: ErpSource }) => {
      const targetId = typeof param === 'number' ? param : param.orderId
      const targetSource = typeof param === 'number' ? undefined : param.source_erp

      // 1. Hủy các query đang fetch dở cho orders để không ghi đè dữ liệu lạc quan
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.lists() })

      // 2. Lưu snapshot các cache hiện tại để rollback nếu phát sinh lỗi
      const previousQueries = queryClient.getQueriesData<ApiPaginatedResult<OrderDto>>({
        queryKey: queryKeys.orders.lists(),
      })

      // 3. Cập nhật lạc quan trên toàn bộ cache danh sách đơn hàng
      queryClient.setQueriesData<ApiPaginatedResult<OrderDto>>(
        { queryKey: queryKeys.orders.lists() },
        (old) => {
          if (!old || !old.items) return old
          return {
            ...old,
            items: old.items.map((ord) =>
              ord.order_id === targetId && (!targetSource || ord.source_erp === targetSource)
                ? {
                  ...ord,
                  sale_checked: true,
                  status: 'Đã xác nhận',
                  trang_thai: 'Đã xác nhận',
                }
                : ord,
            ),
          }
        },
      )

      return { previousQueries }
    },

    onError: (err: any, _param, context) => {
      // Rollback về trạng thái cũ nếu lỗi
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data)
        })
      }
      notify(err.message || 'Lỗi khi xác nhận lịch hẹn. Đã hoàn tác.')
    },

    onSuccess: () => {
      notify('Đã xác nhận lịch hẹn với khách hàng thành công!')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
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
      source_erp,
    }: {
      orderId: number
      payload: AddOrderCommentPayload
      source_erp?: ErpSource
    }) => orderService.addComment(orderId, payload, source_erp),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() })
      notify('Đã thêm ghi chú vào đơn hàng thành công!')
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi thêm ghi chú. Vui lòng thử lại.')
    },
  })
}