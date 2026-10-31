import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const TOKEN_KEY = 'salesflow_access_token'
const USER_KEY = 'salesflow_user_info'

export interface ApiResponse<T = any> {
  result: T | null
  success: boolean
  error: string | null
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
}

export class AppApiError extends Error {
  status: number | null
  rawResponse: any

  constructor(message: string, status: number | null = null, rawResponse: any = null) {
    super(message)
    this.name = 'AppApiError'
    this.status = status
    this.rawResponse = rawResponse
  }
}
/**
 * Địa chỉ máy chủ ERP chính thức: https://locnuoc365.xyz
 */
export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_BASE_URL || 'https://locnuoc365.xyz'

// Tự động dọn dẹp key lưu instance cũ trong localStorage nếu có
try {
  localStorage.removeItem('salesflow_erp_instance')
} catch {
  // ignore
}

/**
 * Lấy URL hệ thống ERP đang hoạt động
 */
export const getCurrentInstanceUrl = (): string => API_BASE_URL

/**
 * Đặt URL Backend ERP
 */
export const setApiBaseUrl = (_url: string): void => {
  apiClient.defaults.baseURL = API_BASE_URL
}

/**
 * Lấy token đã lưu
 */
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (err) {
    console.error('Không thể đọc token từ localStorage:', err)
    return null
  }
}

/**
 * Lưu token mới
 */
export const setStoredToken = (token: string | null): void => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch (err) {
    console.error('Không thể lưu token vào localStorage:', err)
  }
}

/**
 * Lấy thông tin user đã lưu
 */
export const getStoredUser = (): any | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error('Không thể đọc user từ localStorage:', err)
    return null
  }
}

/**
 * Lưu thông tin user vào localStorage
 */
export const setStoredUser = (user: any | null): void => {
  try {
    if (user) {
      // Bảo mật: Tuyệt đối không lưu mật khẩu SIP dạng plain text vào localStorage
      const sanitized = { ...user }
      if (sanitized.sipConfig) {
        const { password: _, ...safeSip } = sanitized.sipConfig
        sanitized.sipConfig = safeSip
      }
      localStorage.setItem(USER_KEY, JSON.stringify(sanitized))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  } catch (err) {
    console.error('Không thể lưu user vào localStorage:', err)
  }
}

/**
 * Xóa token và phiên làm việc
 */
export const clearStoredAuth = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  } catch (err) {
    console.error('Không thể xóa auth:', err)
  }
}

/**
 * Tạo Idempotency-Key chuẩn UUID ngẫu nhiên khi chốt đơn
 * Giúp chống tạo trùng lặp đơn hàng trong vòng 24h
 */
export const generateIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sf_${crypto.randomUUID()}`
  }
  return 'sf_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 11)
}

/**
 * Khởi tạo Axios Instance theo chuẩn API_TELESALE_APP.md
 */
const timeout = Number((import.meta as any).env?.VITE_API_TIMEOUT) || 15000

export const apiClient = axios.create({
  baseURL: getCurrentInstanceUrl(),
  timeout,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Luôn tự động gắn Bearer Token và cập nhật baseURL hiện tại
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getCurrentInstanceUrl()
    const token = getStoredToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response Interceptor: Chuẩn hóa dữ liệu trả về và bắt lỗi 401
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error: AxiosError<any>) => {
    const status = error.response ? error.response.status : null

    // 401: Token hết hạn hoặc chưa đăng nhập
    if (status === 401) {
      clearStoredAuth()
      window.dispatchEvent(
        new CustomEvent('salesflow:unauthorized', {
          detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        }),
      )
    }

    // Trích xuất thông điệp lỗi tiếng Việt
    let errorMessage = 'Lỗi kết nối máy chủ, vui lòng thử lại sau.'
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (status === 409) {
      errorMessage = 'Yêu cầu chốt đơn đang được hệ thống xử lý hoặc khách hàng đang có đơn chưa hoàn tất.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return Promise.reject(new AppApiError(errorMessage, status, error.response?.data))
  },
)

export default apiClient
