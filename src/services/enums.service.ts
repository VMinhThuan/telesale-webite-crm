import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { EnumsCatalog } from '../types/api'
import apiClient, { apiClientZomzem } from './apiClient'

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
  relationship: [],
}

export const enumsService = {
  /**
   * Lấy danh mục mã và trạng thái từ cả 2 máy chủ ERP (LocNuoc365 & Zomzem)
   * Tự động hợp nhất danh mục và loại bỏ trùng lặp mã code
   */
  async getEnums(types?: string[]): Promise<EnumsCatalog> {
    const queryParam = types && types.length > 0 ? `?types=${types.join(',')}` : ''

    const [ln365Settled, zomzemSettled] = await Promise.allSettled([
      apiClient.get<any, { result: EnumsCatalog }>(`${API_ENDPOINTS.ENUMS}${queryParam}`),
      apiClientZomzem.get<any, { result: EnumsCatalog }>(`${API_ENDPOINTS.ENUMS}${queryParam}`),
    ])

    const ln365Res = ln365Settled.status === 'fulfilled' ? ln365Settled.value?.result || ln365Settled.value : null
    const zomzemRes = zomzemSettled.status === 'fulfilled' ? zomzemSettled.value?.result || zomzemSettled.value : null

    if (!ln365Res && !zomzemRes) {
      return emptyEnumsCatalog
    }

    const mergeCatalog = (base: EnumsCatalog, incoming: any): EnumsCatalog => {
      if (!incoming || typeof incoming !== 'object') return base
      const result: EnumsCatalog = { ...base }
      for (const key of Object.keys(incoming)) {
        const arrIncoming = incoming[key]
        if (Array.isArray(arrIncoming)) {
          const existingArr = (result as any)[key] || []
          const existingCodes = new Set(
            existingArr.map((item: any) => String(item.code ?? item.id ?? item.label ?? '')),
          )
          const newItems = arrIncoming.filter(
            (item: any) => !existingCodes.has(String(item.code ?? item.id ?? item.label ?? '')),
          )
          ;(result as any)[key] = [...existingArr, ...newItems]
        }
      }
      return result
    }

    let combined = mergeCatalog(emptyEnumsCatalog, ln365Res)
    combined = mergeCatalog(combined, zomzemRes)
    return combined
  },
}

export default enumsService
