/**
 * Query Key Factory tập trung cho React Query
 * Giúp quản lý cache tập trung, tránh lỗi sai sót chuỗi và hỗ trợ invalidate chính xác
 */

export const queryKeys = {
  // 1. Xác thực & Tài khoản
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    userLists: (params?: any) => [...queryKeys.auth.all, 'userLists', params] as const,
  },

  // 2. Danh mục & Enums
  enums: {
    all: ['enums'] as const,
    types: (types?: string[]) => [...queryKeys.enums.all, types] as const,
  },

  // 3. Khách hàng & Leads
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.customers.lists(), params] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id?: number) => [...queryKeys.customers.details(), id] as const,
    histories: () => [...queryKeys.customers.all, 'history'] as const,
    history: (id?: number, type?: string) => [...queryKeys.customers.histories(), id, type] as const,
  },

  // 4. Đơn hàng & Slot hẹn
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (params?: any) => [...queryKeys.orders.lists(), params] as const,
    slots: (branchId?: number, fromDate?: string, toDate?: string) =>
      [...queryKeys.orders.all, 'slots', branchId, fromDate, toDate] as const,
  },

  // 5. Telesale & Cuộc gọi
  telesale: {
    all: ['telesale'] as const,
    campaigns: () => [...queryKeys.telesale.all, 'campaigns'] as const,
    dailyResults: (date?: string) => [...queryKeys.telesale.all, 'dailyResults', date] as const,
  },

  // 6. Báo cáo & Chấm công
  reports: {
    all: ['reports'] as const,
    attendance: (params?: any) => [...queryKeys.reports.all, 'attendance', params] as const,
    callLogs: (params?: any) => [...queryKeys.reports.all, 'callLogs', params] as const,
  },
} as const
