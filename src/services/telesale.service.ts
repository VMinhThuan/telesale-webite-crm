import { API_ENDPOINTS } from '../constants/apiEndpoints'
import {
  CampaignsResponse,
  DailyResultDto,
  DialCallResponse,
  NextCustomerDto,
  SaveCallResultPayload,
  SaveCallResultResponse,
} from '../types/api'
import apiClient, { generateIdempotencyKey } from './apiClient'

export interface GetNextCustomerPayload {
  campaign_id: number
  call_mode?: 'kho_ca_nhan' | 'chien_dich'
  board_type?: 'new' | 'existing'
  selected_files?: number[]
}

export interface DialCallPayload {
  customer_id: number
  member_id?: number
}

export const telesaleService = {
  /**
   * Lấy danh sách chiến dịch đang hoạt động mà nhân viên được phân quyền
   */
  async getCampaigns(): Promise<CampaignsResponse> {
    const response = await apiClient.get<any, { result: CampaignsResponse }>(
      API_ENDPOINTS.CAMPAIGNS,
    )
    return response.result || response || { items: [], total: 0 }
  },

  /**
   * Lấy thông tin khách hàng tiếp theo để quay số gọi
   */
  async getNextCustomer(payload: GetNextCustomerPayload): Promise<NextCustomerDto> {
    const response = await apiClient.post<any, { result: NextCustomerDto }>(
      API_ENDPOINTS.CUSTOMER_NEXT,
      payload,
    )
    return response.result || response
  },

  /**
   * Lấy đầu số kỹ thuật và kích hoạt cuộc gọi tới khách hàng
   */
  async dialCall(payload: DialCallPayload): Promise<DialCallResponse> {
    const response = await apiClient.post<any, { result: DialCallResponse }>(
      API_ENDPOINTS.CALLS_DIAL,
      payload,
    )
    return response.result || response
  },

  /**
   * Ghi nhận kết quả cuộc gọi và tự động lên đơn nếu chốt thành công
   */
  async saveCallResult(
    customerId: number,
    payload: SaveCallResultPayload,
  ): Promise<SaveCallResultResponse> {
    const headers: Record<string, string> = {}
    if (payload.result === 'closed') {
      headers['Idempotency-Key'] = generateIdempotencyKey()
    }

    const response = await apiClient.post<any, { result: SaveCallResultResponse }>(
      API_ENDPOINTS.SAVE_CALL_RESULT(customerId),
      payload,
      { headers },
    )
    return response.result || response
  },

  /**
   * Lấy thống kê hiệu suất đàm thoại trong ngày của nhân viên
   */
  async getDailyResults(date?: string): Promise<DailyResultDto | null> {
    const payload: Record<string, any> = {}
    if (date) {
      payload.from_date = date
      payload.to_date = date
    }

    const response = await apiClient.post<any, { result: DailyResultDto[] | DailyResultDto }>(
      API_ENDPOINTS.DAILY_RESULTS,
      payload,
    )

    const result = response.result || response
    if (Array.isArray(result)) {
      return result[0] || null
    }
    return result || null
  },
}

export default telesaleService
