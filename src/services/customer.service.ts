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
import apiClient, { generateIdempotencyKey, getApiClient } from './apiClient'

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
   * Lấy danh sách khách hàng từ ERP kèm bộ lọc và phân trang
   */
  async getCustomers(params?: CustomerQueryParams): Promise<ApiPaginatedResult<CustomerDto>> {
    const query = new URLSearchParams()
    if (params?.customer_status) query.set('customer_status', params.customer_status)
    if (params?.care_status) query.set('care_status', params.care_status)
    if (params?.search) query.set('search', params.search)
    if (params?.next_care_date) query.set('next_care_date', params.next_care_date)
    if (params?.from_date) query.set('from_date', params.from_date)
    if (params?.to_date) query.set('to_date', params.to_date)
    if (params?.branch_id) query.set('branch_id', String(params.branch_id))
    query.set('page', String(params?.page || 1))
    query.set('page_size', String(params?.page_size || 10))

    const response = await apiClient.get<any, { result: ApiPaginatedResult<CustomerDto> }>(
      `${API_ENDPOINTS.CUSTOMERS}?${query.toString()}`,
    )

    return response.result || { items: [], total: 0 }
  },

  /**
   * Lấy chi tiết thông tin khách hàng từ ERP
   */
  async getCustomerDetail(customerId: number): Promise<CustomerDetailDto> {
    const response = await apiClient.get<any, { result: CustomerDetailDto }>(
      API_ENDPOINTS.CUSTOMER_DETAIL(customerId),
    )
    return response.result
  },

  /**
   * Lấy lịch sử tương tác và chăm sóc của khách hàng từ ERP
   */
  async getCustomerHistory(
    customerId: number,
    type?: 'call' | 'care' | 'service',
  ): Promise<CustomerHistoryDto[]> {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    params.set('page_size', '100')
    const response = await apiClient.get<any, { result: { items: CustomerHistoryDto[] } }>(
      `${API_ENDPOINTS.CUSTOMER_HISTORY(customerId)}?${params.toString()}`,
    )
    return response.result?.items || []
  },

  /**
   * Ghi nhận kết quả chăm sóc khách hàng lên ERP
   */
  async saveCareLog(
    customerId: number,
    payload: SaveCareLogPayload,
    customIdempotencyKey?: string,
  ): Promise<any> {
    const { idempotencyKey: payloadKey, ...bodyPayload } = payload
    const key = customIdempotencyKey || payloadKey || generateIdempotencyKey()

    const headers: Record<string, string> = {}
    if (payload.result === 'closed') {
      headers['Idempotency-Key'] = key
    }

    return apiClient.post(API_ENDPOINTS.CUSTOMER_CARE_LOGS(customerId), bodyPayload, { headers })
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
