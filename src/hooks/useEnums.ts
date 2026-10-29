import { useQuery } from '@tanstack/react-query'
import enumsService from '../services/enums.service'
import { EnumsCatalog } from '../types/api'
import { queryKeys } from '../constants/queryKeys'

export const ENUMS_QUERY_KEY = queryKeys.enums.all

/**
 * Hook tải và cache danh mục mã ERP toàn cục
 * StaleTime = Infinity (chỉ gọi đúng 1 lần trong phiên làm việc)
 */
export function useEnums(types?: string[]) {
  const query = useQuery<EnumsCatalog>({
    queryKey: queryKeys.enums.types(types),
    queryFn: () => enumsService.getEnums(types),
    staleTime: Infinity,
  })

  const enums = query.data || {}

  /**
   * Helper tìm nhãn tiếng Việt theo mã code
   */
  const getLabel = (
    catalogKey: keyof Omit<EnumsCatalog, 'denied_reason' | 'phong_ban' | 'bo_phan' | 'to'>,
    code: string | null | undefined,
  ): string => {
    if (!code) return '—'
    const list = enums[catalogKey]
    if (!list) return code
    const found = list.find((item) => item.code === code)
    return found ? found.label : code
  }

  return {
    ...query,
    enums,
    getLabel,
    orderStatuses: enums.order_status || [],
    callResults: enums.call_result || [],
    careResults: enums.care_result || [],
    customerStatuses: enums.customer_status || [],
    services: enums.services || [],
    doCanMang: enums.do_can_mang || [],
    machineProblems: enums.machine_problem || [],
    deniedReasons: enums.denied_reason || [],
    branches: enums.phong_ban || [],
    huyNote: enums.huy_note || [],
    traVeNote: enums.tra_ve_note || [],
    moreRequest: enums.more_request || [],
    painPoint: enums.pain_point || [],
    luiHuyType: enums.lui_huy_type || [],
    callStatuses: enums.call_status || [],
    callDirections: enums.call_direction || [],
    departments: enums.bo_phan || [],
    teams: enums.to || [],
  }
}

export default useEnums