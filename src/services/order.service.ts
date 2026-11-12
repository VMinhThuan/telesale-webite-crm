import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { ApiPaginatedResult, BranchSlotDto, ErpSource, OrderDto } from '../types/api'
import apiClient, { apiClientZomzem, getApiClient } from './apiClient'

export interface OrderQueryParams {
  from_date?: string
  to_date?: string
  status?: string
  search?: string
  page?: number
  page_size?: number
  user_id?: number
  branch_id?: number
  source_erp?: ErpSource | 'all'
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
   * Helper tải đơn hàng từ 1 instance ERP cụ thể và gắn nhãn source_erp
   */
  async _fetchOrdersSingle(
    client: typeof apiClient,
    payload: Record<string, any>,
    source_erp: ErpSource,
  ): Promise<ApiPaginatedResult<OrderDto>> {
    try {
      const response = await client.post<any, { result: ApiPaginatedResult<OrderDto> }>(
        API_ENDPOINTS.ORDERS,
        payload,
      )
      const res = response?.result || response || { items: [], total: 0 }
      const items: OrderDto[] = (res.items || []).map((o: any) => ({
        ...o,
        source_erp,
      }))
      return {
        items,
        total: typeof res.total === 'number' ? res.total : items.length,
      }
    } catch (err) {
      console.warn(`[Multi-ERP] Lỗi tải đơn hàng từ ${source_erp}:`, err)
      return { items: [], total: 0 }
    }
  },

  /**
   * Lấy danh sách đơn hàng theo ngày hẹn từ ERP (Hỗ trợ lọc theo nguồn: 'locnuoc365' | 'zomzem' | 'all')
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
    if (params?.branch_id !== undefined) payload.branch_id = params.branch_id

    const sourceFilter = params?.source_erp || 'all'

    if (sourceFilter === 'locnuoc365') {
      return this._fetchOrdersSingle(apiClient, payload, 'locnuoc365')
    }

    if (sourceFilter === 'zomzem') {
      return this._fetchOrdersSingle(apiClientZomzem, payload, 'zomzem')
    }

    // Mặc định 'all': Gọi song song cả 2 và kết hợp danh sách
    const [ln365Res, zomzemRes] = await Promise.allSettled([
      this._fetchOrdersSingle(apiClient, payload, 'locnuoc365'),
      this._fetchOrdersSingle(apiClientZomzem, payload, 'zomzem'),
    ])

    const ln365 = ln365Res.status === 'fulfilled' ? ln365Res.value : { items: [], total: 0 }
    const zomzem = zomzemRes.status === 'fulfilled' ? zomzemRes.value : { items: [], total: 0 }

    const combinedItems = [...ln365.items, ...zomzem.items]
    // Sắp xếp đơn mới nhất theo order_id
    combinedItems.sort((a, b) => (Number(b.order_id) || 0) - (Number(a.order_id) || 0))

    return {
      items: combinedItems,
      total: ln365.total + zomzem.total,
    }
  },

  /**
   * Lấy danh sách slot hẹn theo chi nhánh và khoảng ngày từ ERP tương ứng
   */
  async getBranchSlots(
    branchId = 3,
    fromDate?: string,
    toDate?: string,
    source_erp?: ErpSource,
  ): Promise<BranchSlotDto[]> {
    const query = new URLSearchParams()
    query.set('branch_id', String(branchId))
    if (fromDate) query.set('date_from', fromDate)
    if (toDate) query.set('date_to', toDate)

    const client = getApiClient(source_erp)
    try {
      const response = await client.get<any, { result: any }>(
        `${API_ENDPOINTS.BRANCH_SLOTS}?${query.toString()}`,
      )

      const result = response.result
      let items: BranchSlotDto[] = []
      if (Array.isArray(result)) {
        items = result
      } else if (Array.isArray(result?.items)) {
        items = result.items
      }

      return items.map((slot) => ({
        ...slot,
        source_erp: source_erp || 'locnuoc365',
      }))
    } catch (err) {
      console.warn(`[Multi-ERP] Lỗi lấy slots từ chi nhánh #${branchId} (${source_erp || 'locnuoc365'}):`, err)
      return []
    }
  },

  /**
   * Đổi lịch hẹn đơn hàng trên đúng hệ thống ERP
   */
  async rescheduleOrder(
    orderId: number,
    payload: RescheduleOrderPayload,
    source_erp?: ErpSource,
  ): Promise<any> {
    const client = getApiClient(source_erp)
    return client.post(API_ENDPOINTS.ORDER_RESCHEDULE(orderId), payload)
  },

  /**
   * Thêm bình luận / ghi chú vào đơn hàng trên đúng hệ thống ERP
   */
  async addComment(
    orderId: number,
    payload: AddOrderCommentPayload,
    source_erp?: ErpSource,
  ): Promise<any> {
    const client = getApiClient(source_erp)
    return client.post(API_ENDPOINTS.ORDER_COMMENTS(orderId), payload)
  },

  /**
   * Trả về, lùi, hoặc hủy đơn hàng trên đúng hệ thống ERP
   */
  async luiHuyOrder(
    orderId: number,
    payload: LuiHuyOrderPayload,
    source_erp?: ErpSource,
  ): Promise<any> {
    const client = getApiClient(source_erp)
    return client.post(API_ENDPOINTS.ORDER_LUI_HUY(orderId), payload)
  },

  /**
   * Xác nhận lịch hẹn với khách hàng trên đúng hệ thống ERP
   */
  async confirmOrder(orderId: number, source_erp?: ErpSource): Promise<any> {
    const client = getApiClient(source_erp)
    return client.post(API_ENDPOINTS.ORDER_UPDATE_CHECKED, {
      order_id: orderId,
      sale_checked: 1,
    })
  },
}

export default orderService
