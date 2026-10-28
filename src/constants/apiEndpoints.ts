/**
 * Danh sách endpoint API theo tài liệu đặc tả API_TELESALE_APP.md
 * Hệ thống ERP: https://locnuoc365.xyz
 */

export const API_ENDPOINTS = {
  // 1. Xác thực & Tài khoản
  AUTH_LOGIN: '/api/login',
  AUTH_LOGOUT: '/api/logout',
  USER_INFO: '/api/manage-users/get-info',
  USER_UPDATE: '/api/manage-users/update-info',
  USER_LISTS: '/api/manage-users/get-user-lists',

  // 2. Danh mục & Trạng thái hệ thống
  ENUMS: '/api/telesale/enums',
  SYSTEM_STATUS: '/api/telesale/system/status',
  ATTENDANCE: '/api/telesale/attendance',

  // 3. Telesale & Cuộc gọi
  CALL_LOGS: '/api/telesale/call-logs',
  DAILY_RESULTS: '/api/telesale/daily-results',
  CAMPAIGNS: '/api/telesale/campaigns',
  CUSTOMER_NEXT: '/api/telesale/customers/next',
  CALLS_DIAL: '/api/telesale/calls',
  SAVE_CALL_RESULT: (customerId: number | string) => `/api/telesale/customers/${customerId}/call-result`,

  // 4. Khách hàng & Chăm sóc khách hàng (CSKH)
  CUSTOMERS: '/api/telesale/customers',
  CUSTOMER_DETAIL: (customerId: number | string) => `/api/telesale/customers/${customerId}`,
  CUSTOMER_HISTORY: (customerId: number | string) => `/api/telesale/customers/${customerId}/history`,
  CUSTOMER_CARE_LOGS: (customerId: number | string) => `/api/telesale/customers/${customerId}/care-logs`,

  // 5. Đơn hàng & Slot hẹn
  BRANCH_SLOTS: '/api/telesale/branch-slots',
  ORDERS: '/api/telesale/orders',
  ORDER_LOGS_LUI_HUY: '/api/telesale/order-logs/lui-huy',
  ORDER_RESCHEDULE: (orderId: number | string) => `/api/telesale/orders/${orderId}/reschedule`,
  ORDER_COMMENTS: (orderId: number | string) => `/api/telesale/orders/${orderId}/comments`,
  ORDER_LUI_HUY: (orderId: number | string) => `/api/telesale/orders/${orderId}/lui-huy`,
  ORDER_UPDATE_CHECKED: '/api/order/update-sale-checked-status',

  // 6. Thông báo
  NOTIFICATIONS: '/api/load-notifications',
  MASK_NOTIFY_READ: '/api/mask-notify-as-read',

  // 7. Chat nội bộ
  CHATS: '/api/chats',
  CHAT_THREAD: (threadId: number | string) => `/api/chats/${threadId}`,
  CHAT_MESSAGES: (threadId: number | string) => `/api/chats/${threadId}/messages`,
  CHAT_IMAGES: (threadId: number | string) => `/api/chats/${threadId}/images`,
  CHAT_DOCUMENTS: (threadId: number | string) => `/api/chats/${threadId}/documents`,
  CHAT_AUDIO: (threadId: number | string) => `/api/chats/${threadId}/audio`,
  CHAT_VIDEOS: (threadId: number | string) => `/api/chats/${threadId}/videos`,
  CHAT_SEARCH: (threadId: number | string) => `/api/chats/${threadId}/search`,
  CHAT_CONTACTS: '/api/chats/find/contacts',
  CHAT_MARK_READ: (threadId: number | string) => `/api/chats/${threadId}/mark-read`,
} as const
