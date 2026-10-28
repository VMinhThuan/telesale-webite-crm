import { useQuery } from '@tanstack/react-query'
import enumsService from '../services/enums.service'
import { EnumsCatalog } from '../types/api'

export const ENUMS_QUERY_KEY = ['enums_catalog']

/**
 * Hook tải và cache danh mục mã ERP toàn cục
 * StaleTime = Infinity (chỉ gọi đúng 1 lần trong phiên làm việc)
 */
export function useEnums(types?: string[]) {
  const query = useQuery<EnumsCatalog>({
    queryKey: [...ENUMS_QUERY_KEY, types?.join(',') || 'all'],
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
  }
}

export default useEnums
