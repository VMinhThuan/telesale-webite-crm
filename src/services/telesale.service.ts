import { API_ENDPOINTS } from '../constants/apiEndpoints'
import {
  ApiPaginatedResult,
  AttendanceDto,
  CallLogDto,
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

export interface CallLogsPayload {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
}

export interface AttendancePayload {
  from_date?: string
  to_date?: string
  start?: number
  length?: number
  user_id?: number
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
    customIdempotencyKey?: string,
  ): Promise<SaveCallResultResponse> {
    const { idempotencyKey: payloadKey, ...bodyPayload } = payload
    const key = customIdempotencyKey || payloadKey || generateIdempotencyKey()

    const headers: Record<string, string> = {}
    if (payload.result === 'closed') {
      headers['Idempotency-Key'] = key
    }

    const response = await apiClient.post<any, { result: SaveCallResultResponse }>(
      API_ENDPOINTS.SAVE_CALL_RESULT(customerId),
      bodyPayload,
      { headers },
    )
    return response.result || response
  },

  /**
   * Lấy thống kê hiệu suất đàm thoại trong ngày hoặc khoảng ngày của nhân viên
   */
  async getDailyResults(
    date?: string | { from_date?: string; to_date?: string },
  ): Promise<DailyResultDto | null> {
    const payload: Record<string, any> = {}
    if (typeof date === 'string') {
      payload.from_date = date
      payload.to_date = date
    } else if (date && typeof date === 'object') {
      if (date.from_date) payload.from_date = date.from_date
      if (date.to_date) payload.to_date = date.to_date
    }

    const response = await apiClient.post<any, any>(
      API_ENDPOINTS.DAILY_RESULTS,
      payload,
    )

    const result = response.result || response
    if (result && Array.isArray(result.items)) {
      return result.items[0] || null
    }
    if (Array.isArray(result)) {
      return result[0] || null
    }
    if (result && typeof result === 'object' && ('tong_total_call' in result || 'user_id' in result)) {
      return result
    }
    return null
  },

  /**
   * Lấy danh sách hiệu suất theo khoảng thời gian hoặc theo danh sách nhân viên (API 10b: POST /api/telesale/daily-results)
   * Quản lý / Admin có thể gửi kèm user_id để lấy riêng 1 nhân viên
   */
  async getDailyResultsList(payload?: {
    from_date?: string
    to_date?: string
    user_id?: number
    start?: number
    length?: number
  }): Promise<DailyResultDto[]> {
    const response = await apiClient.post<any, any>(
      API_ENDPOINTS.DAILY_RESULTS,
      payload || {},
    )

    const result = response.result || response
    if (result && Array.isArray(result.items)) {
      return result.items
    }
    if (Array.isArray(result)) {
      return result
    }
    if (result && typeof result === 'object' && ('tong_total_call' in result || 'user_id' in result)) {
      return [result]
    }
    return []
  },

  /**
   * Lấy lịch sử cuộc gọi telesale (API 10a: POST /api/telesale/call-logs)
   */
  async getCallLogs(payload?: CallLogsPayload): Promise<ApiPaginatedResult<CallLogDto>> {
    const response = await apiClient.post<any, any>(
      API_ENDPOINTS.CALL_LOGS,
      payload || { start: 0, length: 50 },
    )
    const result = response.result || response || {}
    if (Array.isArray(result)) {
      return { items: result, total: result.length }
    }
    return {
      items: result.items || [],
      total: result.total ?? (result.items?.length || 0),
    }
  },

  /**
   * Lấy dữ liệu chấm công nhân sự (API 09: POST /api/telesale/attendance)
   */
  async getAttendance(payload?: AttendancePayload): Promise<ApiPaginatedResult<AttendanceDto>> {
    const response = await apiClient.post<any, any>(
      API_ENDPOINTS.ATTENDANCE,
      payload || { start: 0, length: 50 },
    )
    const result = response.result || response || {}
    if (Array.isArray(result)) {
      return { items: result, total: result.length }
    }
    return {
      items: result.items || [],
      total: result.total ?? (result.items?.length || 0),
    }
  },
}

export default telesaleService
