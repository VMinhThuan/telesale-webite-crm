import { API_ENDPOINTS } from '../constants/apiEndpoints'
import {
  ApiPaginatedResult,
  AttendanceDto,
  CallLogDto,
  CampaignDto,
  CampaignsResponse,
  DailyResultDto,
  DialCallResponse,
  ErpSource,
  NextCustomerDto,
  SaveCallResultPayload,
  SaveCallResultResponse,
} from '../types/api'
import apiClient, { apiClientZomzem, generateIdempotencyKey, getApiClient } from './apiClient'

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
   * Helper trích xuất 1 DailyResultDto từ response
   */
  _extractDailyResult(result: any, source_erp?: ErpSource): DailyResultDto | null {
    if (!result) return null
    let item: any = null
    if (Array.isArray(result.items)) {
      item = result.items[0] || null
    } else if (Array.isArray(result)) {
      item = result[0] || null
    } else if (typeof result === 'object' && ('tong_total_call' in result || 'user_id' in result)) {
      item = result
    }
    if (item && source_erp) {
      return { ...item, source_erp }
    }
    return item
  },

  /**
   * Helper trích xuất mảng DailyResultDto từ response
   */
  _extractDailyResultsList(result: any, source_erp?: ErpSource): DailyResultDto[] {
    if (!result) return []
    let list: any[] = []
    if (Array.isArray(result.items)) {
      list = result.items
    } else if (Array.isArray(result)) {
      list = result
    } else if (typeof result === 'object' && ('tong_total_call' in result || 'user_id' in result)) {
      list = [result]
    }
    if (source_erp) {
      return list.map((i) => ({ ...i, source_erp }))
    }
    return list
  },

  /**
   * Lấy danh sách chiến dịch đang hoạt động từ cả 2 hệ thống ERP (LocNuoc365 & Zomzem)
   */
  async getCampaigns(): Promise<CampaignsResponse> {
    const [ln365Settled, zomzemSettled] = await Promise.allSettled([
      apiClient.get<any, { result: CampaignsResponse }>(API_ENDPOINTS.CAMPAIGNS),
      apiClientZomzem.get<any, { result: CampaignsResponse }>(API_ENDPOINTS.CAMPAIGNS),
    ])

    let ln365Items: CampaignDto[] = []
    if (ln365Settled.status === 'fulfilled') {
      const raw = ln365Settled.value?.result || ln365Settled.value
      const list = Array.isArray(raw) ? raw : raw?.items || []
      ln365Items = list.map((c: any) => ({
        ...c,
        source_erp: 'locnuoc365' as ErpSource,
      }))
    } else {
      console.warn('[LN365] Lỗi lấy danh sách chiến dịch:', ln365Settled.reason)
    }

    let zomzemItems: CampaignDto[] = []
    if (zomzemSettled.status === 'fulfilled') {
      const raw = zomzemSettled.value?.result || zomzemSettled.value
      const list = Array.isArray(raw) ? raw : raw?.items || []
      zomzemItems = list.map((c: any) => ({
        ...c,
        source_erp: 'zomzem' as ErpSource,
      }))
    } else {
      console.warn('[Zomzem] Chưa có chiến dịch hoặc lỗi kết nối Zomzem:', zomzemSettled.reason)
    }

    const combinedItems = [...ln365Items, ...zomzemItems]
    return {
      items: combinedItems,
      total: combinedItems.length,
    }
  },

  /**
   * Lấy thông tin khách hàng tiếp theo để quay số gọi từ hệ thống ERP tương ứng
   */
  async getNextCustomer(payload: GetNextCustomerPayload, source_erp?: ErpSource): Promise<NextCustomerDto> {
    const client = getApiClient(source_erp)
    const response = await client.post<any, { result: NextCustomerDto }>(
      API_ENDPOINTS.CUSTOMER_NEXT,
      payload,
    )
    const res = response.result || response
    if (res && typeof res === 'object') {
      res.source_erp = source_erp || 'locnuoc365'
    }
    return res
  },

  /**
   * Lấy đầu số kỹ thuật và kích hoạt cuộc gọi tới khách hàng
   */
  async dialCall(payload: DialCallPayload, source_erp?: ErpSource): Promise<DialCallResponse> {
    const client = getApiClient(source_erp)
    const response = await client.post<any, { result: DialCallResponse }>(
      API_ENDPOINTS.CALLS_DIAL,
      payload,
    )
    return response.result || response
  },

  /**
   * Ghi nhận kết quả cuộc gọi và tự động lên đơn nếu chốt thành công lên đúng hệ thống ERP
   */
  async saveCallResult(
    customerId: number,
    payload: SaveCallResultPayload,
    customIdempotencyKey?: string,
    source_erp?: ErpSource,
  ): Promise<SaveCallResultResponse> {
    const { idempotencyKey: payloadKey, ...bodyPayload } = payload
    const key = customIdempotencyKey || payloadKey || generateIdempotencyKey()

    const headers: Record<string, string> = {}
    if (payload.result === 'closed') {
      headers['Idempotency-Key'] = key
    }

    const client = getApiClient(source_erp)
    const response = await client.post<any, { result: SaveCallResultResponse }>(
      API_ENDPOINTS.SAVE_CALL_RESULT(customerId),
      bodyPayload,
      { headers },
    )
    return response.result || response
  },

  /**
   * Lấy thống kê hiệu suất đàm thoại trong ngày hoặc khoảng ngày của nhân viên
   * Hỗ trợ lọc theo nguồn: 'locnuoc365' | 'zomzem' | 'all' (tổng hợp)
   */
  async getDailyResults(
    date?: string | { from_date?: string; to_date?: string },
    source_erp: ErpSource | 'all' = 'all',
  ): Promise<DailyResultDto | null> {
    const payload: Record<string, any> = {}
    if (typeof date === 'string') {
      payload.from_date = date
      payload.to_date = date
    } else if (date && typeof date === 'object') {
      if (date.from_date) payload.from_date = date.from_date
      if (date.to_date) payload.to_date = date.to_date
    }

    if (source_erp === 'locnuoc365') {
      const response = await apiClient.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload)
      return this._extractDailyResult(response.result || response, 'locnuoc365')
    }

    if (source_erp === 'zomzem') {
      const response = await apiClientZomzem.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload)
      return this._extractDailyResult(response.result || response, 'zomzem')
    }

    // 'all': Gọi song song cả 2 và cộng dồn số liệu
    const [ln365Settled, zomzemSettled] = await Promise.allSettled([
      apiClient.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload),
      apiClientZomzem.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload),
    ])

    const ln365Res = ln365Settled.status === 'fulfilled' ? ln365Settled.value?.result || ln365Settled.value : null
    const zomzemRes = zomzemSettled.status === 'fulfilled' ? zomzemSettled.value?.result || zomzemSettled.value : null

    const ln365 = this._extractDailyResult(ln365Res)
    const zomzem = this._extractDailyResult(zomzemRes)

    if (!ln365 && !zomzem) return null
    if (!ln365) return zomzem
    if (!zomzem) return ln365

    return {
      ...ln365,
      source_erp: undefined,
      tong_total_call: (ln365.tong_total_call || 0) + (zomzem.tong_total_call || 0),
      tong_call_answer: (ln365.tong_call_answer || 0) + (zomzem.tong_call_answer || 0),
      tong_tg_dam_thoai: (ln365.tong_tg_dam_thoai || 0) + (zomzem.tong_tg_dam_thoai || 0),
      tong_da_chot: (ln365.tong_da_chot || 0) + (zomzem.tong_da_chot || 0),
      don_phat_sinh: ((ln365.don_phat_sinh ?? ln365.tong_da_chot ?? 0) + (zomzem.don_phat_sinh ?? zomzem.tong_da_chot ?? 0)),
      tong_don_da_xac_nhan: (ln365.tong_don_da_xac_nhan || 0) + (zomzem.tong_don_da_xac_nhan || 0),
      tong_don_tra_ve: (ln365.tong_don_tra_ve || 0) + (zomzem.tong_don_tra_ve || 0),
      tong_hen_goi_lai: (ln365.tong_hen_goi_lai || 0) + (zomzem.tong_hen_goi_lai || 0),
      tong_giu_lai_cs: (ln365.tong_giu_lai_cs || 0) + (zomzem.tong_giu_lai_cs || 0),
      tong_k_nhu_cau: (ln365.tong_k_nhu_cau || 0) + (zomzem.tong_k_nhu_cau || 0),
      tong_sai_so: (ln365.tong_sai_so || 0) + (zomzem.tong_sai_so || 0),
      tong_k_dung_may: (ln365.tong_k_dung_may || 0) + (zomzem.tong_k_dung_may || 0),
    }
  },

  /**
   * Lấy danh sách hiệu suất theo khoảng thời gian hoặc theo danh sách nhân viên (API 10b: POST /api/telesale/daily-results)
   * Quản lý / Admin có thể gửi kèm user_id để lấy riêng 1 nhân viên
   * Hỗ trợ lọc theo nguồn ERP: 'locnuoc365' | 'zomzem' | 'all' (tổng hợp gộp theo user)
   */
  async getDailyResultsList(
    payload?: {
      from_date?: string
      to_date?: string
      user_id?: number
      start?: number
      length?: number
    },
    source_erp: ErpSource | 'all' = 'all',
  ): Promise<DailyResultDto[]> {
    if (source_erp === 'locnuoc365') {
      const response = await apiClient.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload || {})
      return this._extractDailyResultsList(response.result || response, 'locnuoc365')
    }

    if (source_erp === 'zomzem') {
      const response = await apiClientZomzem.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload || {})
      return this._extractDailyResultsList(response.result || response, 'zomzem')
    }

    // 'all': Gọi song song 2 server và gộp theo user_id
    const [ln365Settled, zomzemSettled] = await Promise.allSettled([
      apiClient.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload || {}),
      apiClientZomzem.post<any, any>(API_ENDPOINTS.DAILY_RESULTS, payload || {}),
    ])

    const ln365Res = ln365Settled.status === 'fulfilled' ? ln365Settled.value?.result || ln365Settled.value : null
    const zomzemRes = zomzemSettled.status === 'fulfilled' ? zomzemSettled.value?.result || zomzemSettled.value : null

    const ln365List = this._extractDailyResultsList(ln365Res, 'locnuoc365')
    const zomzemList = this._extractDailyResultsList(zomzemRes, 'zomzem')

    const map = new Map<string, DailyResultDto>()

    const mergeItem = (item: DailyResultDto) => {
      const key = String(item.user_id || item.user_name)
      if (!map.has(key)) {
        map.set(key, { ...item, source_erp: undefined })
      } else {
        const existing = map.get(key)!
        existing.tong_total_call = (existing.tong_total_call || 0) + (item.tong_total_call || 0)
        existing.tong_call_answer = (existing.tong_call_answer || 0) + (item.tong_call_answer || 0)
        existing.tong_tg_dam_thoai = (existing.tong_tg_dam_thoai || 0) + (item.tong_tg_dam_thoai || 0)
        existing.tong_da_chot = (existing.tong_da_chot || 0) + (item.tong_da_chot || 0)
        existing.don_phat_sinh = ((existing.don_phat_sinh ?? existing.tong_da_chot ?? 0) + (item.don_phat_sinh ?? item.tong_da_chot ?? 0))
        existing.tong_don_da_xac_nhan = (existing.tong_don_da_xac_nhan || 0) + (item.tong_don_da_xac_nhan || 0)
        existing.tong_don_tra_ve = (existing.tong_don_tra_ve || 0) + (item.tong_don_tra_ve || 0)
        existing.tong_hen_goi_lai = (existing.tong_hen_goi_lai || 0) + (item.tong_hen_goi_lai || 0)
        existing.tong_giu_lai_cs = (existing.tong_giu_lai_cs || 0) + (item.tong_giu_lai_cs || 0)
        existing.tong_k_nhu_cau = (existing.tong_k_nhu_cau || 0) + (item.tong_k_nhu_cau || 0)
        existing.tong_sai_so = (existing.tong_sai_so || 0) + (item.tong_sai_so || 0)
        existing.tong_k_dung_may = (existing.tong_k_dung_may || 0) + (item.tong_k_dung_may || 0)
      }
    }

    ln365List.forEach(mergeItem)
    zomzemList.forEach(mergeItem)

    return Array.from(map.values())
  },

  /**
   * Helper nạp lịch sử cuộc gọi từ 1 server đơn lẻ
   */
  async _fetchCallLogsSingle(
    client: any,
    payload?: CallLogsPayload,
    source_erp?: ErpSource,
  ): Promise<ApiPaginatedResult<CallLogDto>> {
    try {
      const response: any = await (client as any).post(
        API_ENDPOINTS.CALL_LOGS,
        payload || { start: 0, length: 50 },
      )
      const result = response?.result !== undefined ? response.result : response
      let items: CallLogDto[] = []
      let total = 0
      if (Array.isArray(result)) {
        items = result
        total = result.length
      } else {
        const rawItems = result?.items || result?.data || []
        items = Array.isArray(rawItems) ? rawItems : []
        total =
          result?.total ??
          result?.recordsTotal ??
          result?.count ??
          items.length
      }
      return {
        items: items.map((item) => ({ ...item, source_erp })),
        total: typeof total === 'number' ? total : 0,
      }
    } catch (err) {
      console.warn(`[getCallLogs] Lỗi lấy lịch sử cuộc gọi từ ${source_erp}:`, err)
      return { items: [], total: 0 }
    }
  },

  /**
   * Lấy lịch sử cuộc gọi telesale (API 10a: POST /api/telesale/call-logs)
   * Mặc định 'all': Gọi song song cả 2 hệ thống ERP (LocNuoc365 & Zomzem), gộp và sắp xếp mới nhất
   */
  async getCallLogs(
    payload?: CallLogsPayload,
    source_erp: ErpSource | 'all' = 'all',
  ): Promise<ApiPaginatedResult<CallLogDto>> {
    if (source_erp === 'locnuoc365') {
      return this._fetchCallLogsSingle(apiClient, payload, 'locnuoc365')
    }
    if (source_erp === 'zomzem') {
      return this._fetchCallLogsSingle(apiClientZomzem, payload, 'zomzem')
    }

    const [ln365Res, zomzemRes] = await Promise.allSettled([
      this._fetchCallLogsSingle(apiClient, payload, 'locnuoc365'),
      this._fetchCallLogsSingle(apiClientZomzem, payload, 'zomzem'),
    ])

    const ln365 = ln365Res.status === 'fulfilled' ? ln365Res.value : { items: [], total: 0 }
    const zomzem = zomzemRes.status === 'fulfilled' ? zomzemRes.value : { items: [], total: 0 }

    const combined = [...ln365.items, ...zomzem.items]
    combined.sort((a, b) => {
      const timeA = new Date(a.call_date_time_start || 0).getTime()
      const timeB = new Date(b.call_date_time_start || 0).getTime()
      if (timeA && timeB && timeA !== timeB) return timeB - timeA
      return (Number(b.call_id) || 0) - (Number(a.call_id) || 0)
    })

    return {
      items: combined,
      total: ln365.total + zomzem.total,
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
    const result = response?.result !== undefined ? response.result : response
    if (Array.isArray(result)) {
      return { items: result, total: result.length }
    }
    const items = result?.items || result?.data || []
    const total =
      result?.total ??
      result?.recordsTotal ??
      result?.count ??
      (Array.isArray(items) ? items.length : 0)
    return {
      items: Array.isArray(items) ? items : [],
      total: typeof total === 'number' ? total : 0,
    }
  },
}

export default telesaleService
