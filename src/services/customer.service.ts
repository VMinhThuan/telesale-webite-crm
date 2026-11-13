import { API_ENDPOINTS } from '../constants/apiEndpoints'
import {
  ApiPaginatedResult,
  CareStatusType,
  CustomerDetailDto,
  CustomerDto,
  CustomerHistoryDto,
  CustomerMemberMutationResponse,
  CustomerStatusType,
  UpdateCustomerPayload,
  AddCustomerMemberPayload,
  UpdateCustomerMemberPayload,
  ErpSource,
} from '../types/api'
import apiClient, { apiClientZomzem, generateIdempotencyKey, getApiClient } from './apiClient'

export interface CustomerQueryParams {
  customer_status?: CustomerStatusType
  care_status?: CareStatusType
  next_care_date?: string
  from_date?: string
  to_date?: string
  search?: string
  branch_id?: number
  page?: number
  page_size?: number
  source_erp?: ErpSource | 'all'
}

export interface SaveCareLogPayload {
  result: 'consulting' | 'callback' | 'scheduled' | 'no_need' | 'unreachable' | 'closed'
  next_care_at?: string
  note?: string
  denied_note?: string
  sub_denied_note?: string
  sub_sub_denied_note?: string
  pain_point?: string
  // Các trường chốt đơn nếu result = closed
  ngay_hen_khach?: string
  slot_id?: number
  gio_hen_khach?: string
  branch_id?: number
  services?: string[]
  /** Khóa chống trùng lặp đơn hàng khi kết quả là 'closed' (Header Idempotency-Key) */
  idempotencyKey?: string
}

export const customerService = {
  /**
   * Helper tải khách hàng từ 1 instance ERP cụ thể và gắn nhãn source_erp
   */
  async _fetchCustomersSingle(
    client: typeof apiClient,
    params: CustomerQueryParams | undefined,
    source_erp: ErpSource,
    customPage?: number,
    customPageSize?: number,
  ): Promise<ApiPaginatedResult<CustomerDto>> {
    const query = new URLSearchParams()
    if (params?.customer_status) query.set('customer_status', params.customer_status)
    if (params?.care_status) query.set('care_status', params.care_status)
    if (params?.search) query.set('search', params.search)
    if (params?.next_care_date) query.set('next_care_date', params.next_care_date)
    if (params?.from_date) query.set('from_date', params.from_date)
    if (params?.to_date) query.set('to_date', params.to_date)
    if (params?.branch_id) query.set('branch_id', String(params.branch_id))
    query.set('page', String(customPage ?? params?.page ?? 1))
    query.set('page_size', String(customPageSize ?? params?.page_size ?? 10))

    try {
      const response = await client.get<any, { result: ApiPaginatedResult<CustomerDto> }>(
        `${API_ENDPOINTS.CUSTOMERS}?${query.toString()}`,
      )
      const res = response?.result || response || { items: [], total: 0 }
      const items: CustomerDto[] = (res.items || []).map((c: any) => ({
        ...c,
        source_erp,
      }))
      return {
        items,
        total: typeof res.total === 'number' ? res.total : items.length,
      }
    } catch (err) {
      console.warn(`[Multi-ERP] Lỗi tải khách hàng từ ${source_erp}:`, err)
      return { items: [], total: 0 }
    }
  },

  /**
   * Lấy danh sách khách hàng từ ERP kèm bộ lọc và phân trang (Hỗ trợ lọc theo nguồn: 'locnuoc365' | 'zomzem' | 'all')
   * Phương án A: Gọi song song 2 server, gộp và sắp xếp theo lịch hẹn gọi lại gần nhất,
   * sau đó cắt lát (Client-side slice) chuẩn theo pageSize của trang để phân trang chuẩn tuyệt đối.
   */
  async getCustomers(params?: CustomerQueryParams): Promise<ApiPaginatedResult<CustomerDto>> {
    const page = params?.page || 1
    const pageSize = params?.page_size || 10
    const sourceFilter = params?.source_erp || 'all'

    // 1. Nếu lọc đích danh 1 nguồn cụ thể: phân trang trực tiếp chuẩn xác theo server đó
    if (sourceFilter === 'locnuoc365') {
      return this._fetchCustomersSingle(apiClient, params, 'locnuoc365', page, pageSize)
    }

    if (sourceFilter === 'zomzem') {
      return this._fetchCustomersSingle(apiClientZomzem, params, 'zomzem', page, pageSize)
    }

    // 2. Mặc định 'all' (Phương án A):
    // Gọi song song cả 2 server để lấy dữ liệu.
    // Tải với fetchLength bao phủ đầy đủ các trang tới trang hiện tại (tối thiểu 100 khách)
    const fetchLength = Math.max(page * pageSize, 100)

    const [ln365Res, zomzemRes] = await Promise.allSettled([
      this._fetchCustomersSingle(apiClient, params, 'locnuoc365', 1, fetchLength),
      this._fetchCustomersSingle(apiClientZomzem, params, 'zomzem', 1, fetchLength),
    ])

    const ln365 = ln365Res.status === 'fulfilled' ? ln365Res.value : { items: [], total: 0 }
    const zomzem = zomzemRes.status === 'fulfilled' ? zomzemRes.value : { items: [], total: 0 }

    const combinedItems = [...ln365.items, ...zomzem.items]
    // Sắp xếp khách hàng: ưu tiên có lịch gọi lại gần nhất (next_care_at), hoặc lần liên hệ gần nhất, hoặc customer_id
    combinedItems.sort((a, b) => {
      if (a.next_care_at && b.next_care_at) {
        return new Date(a.next_care_at).getTime() - new Date(b.next_care_at).getTime()
      }
      if (a.next_care_at) return -1
      if (b.next_care_at) return 1
      return (Number(b.customer_id) || 0) - (Number(a.customer_id) || 0)
    })

    const totalCount = ln365.total + zomzem.total

    // Cắt lát đúng pageSize cho trang hiện tại theo Phương án A
    const startIndex = (page - 1) * pageSize
    const paginatedItems = combinedItems.slice(startIndex, startIndex + pageSize)

    return {
      items: paginatedItems,
      total: totalCount,
    }
  },

  /**
   * Lấy chi tiết thông tin khách hàng từ đúng server ERP
   */
  async getCustomerDetail(customerId: number, source_erp?: ErpSource): Promise<CustomerDetailDto> {
    const client = getApiClient(source_erp)
    const response = await client.get<any, { result: CustomerDetailDto }>(
      API_ENDPOINTS.CUSTOMER_DETAIL(customerId),
    )
    const detail = response?.result || response
    return {
      ...detail,
      source_erp: source_erp || detail?.source_erp || 'locnuoc365',
    }
  },

  /**
   * Lấy lịch sử tương tác và chăm sóc của khách hàng từ đúng server ERP
   */
  async getCustomerHistory(
    customerId: number,
    type?: 'call' | 'care' | 'service',
    source_erp?: ErpSource,
  ): Promise<CustomerHistoryDto[]> {
    const client = getApiClient(source_erp)
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    params.set('page_size', '100')
    const response = await client.get<any, { result: { items: CustomerHistoryDto[] } }>(
      `${API_ENDPOINTS.CUSTOMER_HISTORY(customerId)}?${params.toString()}`,
    )
    const res: any = response?.result || response
    return res?.items || []
  },

  /**
   * Ghi nhận kết quả chăm sóc khách hàng lên đúng server ERP
   */
  async saveCareLog(
    customerId: number,
    payload: SaveCareLogPayload,
    customIdempotencyKey?: string,
    source_erp?: ErpSource,
  ): Promise<any> {
    const { idempotencyKey: payloadKey, ...bodyPayload } = payload
    const key = customIdempotencyKey || payloadKey || generateIdempotencyKey()

    const headers: Record<string, string> = {}
    if (payload.result === 'closed') {
      headers['Idempotency-Key'] = key
    }

    const client = getApiClient(source_erp)
    return client.post(API_ENDPOINTS.CUSTOMER_CARE_LOGS(customerId), bodyPayload, { headers })
  },

  /**
   * Sửa thông tin / địa chỉ khách hàng trên ERP tương ứng
   */
  async updateCustomer(
    customerId: number,
    payload: UpdateCustomerPayload,
    source_erp?: ErpSource,
  ): Promise<CustomerDetailDto & { msg?: string }> {
    const client = getApiClient(source_erp)
    const response = await client.post<any, any>(
      API_ENDPOINTS.CUSTOMER_UPDATE(customerId),
      payload,
    )
    return response.result || response
  },

  /**
   * Thêm số điện thoại / người liên hệ mới cho khách hàng trên ERP tương ứng
   */
  async addCustomerMember(
    customerId: number,
    payload: AddCustomerMemberPayload,
    source_erp?: ErpSource,
  ): Promise<CustomerMemberMutationResponse> {
    const client = getApiClient(source_erp)
    const response = await client.post<any, any>(
      API_ENDPOINTS.CUSTOMER_MEMBERS(customerId),
      payload,
    )
    return response.result || response
  },

  /**
   * Sửa số điện thoại / tên / quan hệ của một thành viên trên ERP tương ứng
   */
  async updateCustomerMember(
    customerId: number,
    memberId: number,
    payload: UpdateCustomerMemberPayload,
    source_erp?: ErpSource,
  ): Promise<CustomerMemberMutationResponse> {
    const client = getApiClient(source_erp)
    const response = await client.post<any, any>(
      API_ENDPOINTS.CUSTOMER_MEMBER_UPDATE(customerId, memberId),
      payload,
    )
    return response.result || response
  },
}

export default customerService
