import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { ApiPaginatedResult, BranchSlotDto, OrderDto } from '../types/api'
import apiClient from './apiClient'

export interface OrderQueryParams {
  from_date?: string
  to_date?: string
  status?: string
  search?: string
  page?: number
  page_size?: number
}

export interface RescheduleOrderPayload {
  ngay_hen_khach: string
  gio_hen_khach?: string
  slot_id?: number
  branch_id?: number
}

export interface LuiHuyOrderPayload {
  type: 'tra_ve' | 'lui' | 'huy' | 'dang_hen_lai' | 'sai_may'
  tra_ve_note?: string
  huy_note?: string
  gio_hen_lui?: string
  comment?: string
}

export interface AddOrderCommentPayload {
  content: string
  parent_id?: number
}

export const orderService = {
  /**
   * Lấy danh sách đơn hàng theo ngày hẹn từ ERP
   */
  async getOrders(params?: OrderQueryParams): Promise<ApiPaginatedResult<OrderDto>> {
    const payload: Record<string, any> = {
      start: ((params?.page || 1) - 1) * (params?.page_size || 50),
      length: params?.page_size || 50,
    }

    if (params?.from_date) payload.from_date = params.from_date
    if (params?.to_date) payload.to_date = params.to_date
    if (params?.status && params.status !== 'all') payload.status = params.status
    if (params?.search) payload.search = params.search

    const response = await apiClient.post<any, { result: ApiPaginatedResult<OrderDto> }>(
      API_ENDPOINTS.ORDERS,
      payload,
    )

    return response.result || { items: [], total: 0 }
  },

  /**
   * Lấy danh sách slot hẹn theo chi nhánh và khoảng ngày từ ERP
   */
  async getBranchSlots(branchId = 3, fromDate?: string, toDate?: string): Promise<BranchSlotDto[]> {
    const query = new URLSearchParams()
    query.set('branch_id', String(branchId))
    if (fromDate) query.set('date_from', fromDate)
    if (toDate) query.set('date_to', toDate)

    const response = await apiClient.get<any, { result: BranchSlotDto[] }>(
      `${API_ENDPOINTS.BRANCH_SLOTS}?${query.toString()}`,
    )

    return response.result || []
  },

  /**
   * Đổi lịch hẹn đơn hàng trên ERP
   */
  async rescheduleOrder(orderId: number, payload: RescheduleOrderPayload): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ORDER_RESCHEDULE(orderId), payload)
  },

  /**
   * Thêm bình luận / ghi chú vào đơn hàng trên ERP
   */
  async addComment(orderId: number, payload: AddOrderCommentPayload): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ORDER_COMMENTS(orderId), payload)
  },

  /**
   * Trả về, lùi, hoặc hủy đơn hàng trên ERP
   */
  async luiHuyOrder(orderId: number, payload: LuiHuyOrderPayload): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ORDER_LUI_HUY(orderId), payload)
  },

  /**
   * Xác nhận lịch hẹn với khách hàng trên ERP
   */
  async confirmOrder(orderId: number): Promise<any> {
    return apiClient.post(API_ENDPOINTS.ORDER_UPDATE_CHECKED, {
      order_id: orderId,
      sale_checked: 1,
    })
  },
}

export default orderService
