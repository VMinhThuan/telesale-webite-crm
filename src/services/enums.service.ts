import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { EnumsCatalog } from '../types/api'
import apiClient from './apiClient'

// Cấu trúc danh mục mặc định ban đầu tránh lỗi null/undefined
const emptyEnumsCatalog: EnumsCatalog = {
  order_status: [],
  call_result: [],
  care_result: [],
  customer_status: [],
  services: [],
  do_can_mang: [],
  machine_problem: [],
  denied_reason: [],
  phong_ban: [],
  bo_phan: [],
  huy_note: [],
  tra_ve_note: [],
}

export const enumsService = {
  /**
   * Lấy danh mục mã và trạng thái từ máy chủ ERP
   * @param types Danh sách loại danh mục cần lấy (phân cách dấu phẩy). Bỏ trống = lấy tất cả
   */
  async getEnums(types?: string[]): Promise<EnumsCatalog> {
    try {
      const queryParam = types && types.length > 0 ? `?types=${types.join(',')}` : ''
      const response = await apiClient.get<any, { result: EnumsCatalog }>(
        `${API_ENDPOINTS.ENUMS}${queryParam}`,
      )
      return response.result || response || emptyEnumsCatalog
    } catch (err) {
      console.error('Lỗi khi gọi API danh mục Enums từ ERP:', err)
      return emptyEnumsCatalog
    }
  },
}

export default enumsService
