/**
 * Query Key Factory tập trung cho TanStack React Query
 * Giúp quản lý cache tập trung, tránh lỗi sai sót chuỗi và hỗ trợ hierarchical invalidation chính xác
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
    dailyResultsList: (params?: any) => [...queryKeys.telesale.all, 'dailyResultsList', params] as const,
  },

  // 6. Báo cáo & Chấm công
  reports: {
    all: ['reports'] as const,
    attendance: (params?: any) => [...queryKeys.reports.all, 'attendance', params] as const,
    callLogs: (params?: any) => [...queryKeys.reports.all, 'callLogs', params] as const,
  },

  // 7. Thông báo hệ thống
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
  },

  // 8. Chat nội bộ
  chat: {
    all: ['chat'] as const,
    threads: () => [...queryKeys.chat.all, 'threads'] as const,
    threadList: (page?: number, perPage?: number) =>
      [...queryKeys.chat.threads(), 'list', page, perPage] as const,
    threadInfinite: (perPage?: number) =>
      [...queryKeys.chat.threads(), 'infinite', perPage] as const,
    thread: (threadId?: number | string) =>
      [...queryKeys.chat.all, 'thread', threadId] as const,
    messages: (threadId?: number | string) =>
      [...queryKeys.chat.thread(threadId), 'messages'] as const,
    contacts: () => [...queryKeys.chat.all, 'contacts'] as const,
    search: (threadId?: number | string, keyword?: string) =>
      [...queryKeys.chat.thread(threadId), 'search', keyword] as const,
  },
} as const

export default queryKeys
