import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { UserProfile } from '../store/useAuthStore'
import apiClient, { clearStoredAuth, setStoredToken } from './apiClient'

export interface LoginCredentials {
  username: string
  password?: string
}

export interface LoginResponse {
  access_token: string
  token_type?: string
  user: UserProfile
}

export const authService = {
  /**
   * Đăng nhập lấy access_token từ hệ thống ERP
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<any, any>(API_ENDPOINTS.AUTH_LOGIN, {
      username: credentials.username,
      password: credentials.password,
    })

    // 1. Kiểm tra cờ thất bại từ ERP (backend trả HTTP 200 nhưng success: false hoặc có trường error)
    if (!response || response.success === false || response.error) {
      const errorMsg =
        response?.error ||
        response?.result?.msg ||
        response?.message ||
        'Đăng nhập thất bại, sai tên tài khoản hoặc mật khẩu.'
      throw new Error(errorMsg)
    }

    // 2. Trích xuất access_token
    const token =
      response.access_token ||
      response.token ||
      response.result?.access_token ||
      response.result?.token ||
      response.data?.access_token ||
      response.data?.token

    // Nếu không có token hợp lệ -> Bắt buộc ném lỗi, không cho phép đăng nhập
    if (!token || typeof token !== 'string') {
      const errorMsg =
        response?.error ||
        response?.result?.msg ||
        response?.message ||
        'Không nhận được mã xác thực access_token từ máy chủ.'
      throw new Error(errorMsg)
    }

    const user: UserProfile =
      response.user ||
      response.result?.user || {
        id: response.result?.user_id || response.user_id || 1,
        name: response.result?.name || response.name || credentials.username,
        username: credentials.username,
        role: response.result?.role || 'Telesale',
        department: response.result?.department || 'Phòng Telesale',
        branchId: response.result?.branch_id || 3,
      }

    setStoredToken(token)

    return {
      access_token: token,
      user,
    }
  },

  /**
   * Đăng xuất hủy phiên làm việc trên hệ thống ERP
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH_LOGOUT)
    } catch (err) {
      console.warn('Lỗi khi gọi API đăng xuất:', err)
    } finally {
      clearStoredAuth()
    }
  },

  /**
   * Lấy thông tin cá nhân, tài khoản ngân hàng và cấu hình SIP từ ERP
   */
  async getUserInfo(): Promise<UserProfile> {
    const response = await apiClient.post<any, any>(API_ENDPOINTS.USER_INFO)
    const raw = response.result || response.user || response

    return {
      id: raw.id || raw.user_id || 1,
      name: raw.name || raw.full_name || 'Nhân viên Telesale',
      username: raw.username || '',
      role: raw.role_name || raw.role || 'Telesale',
      department: raw.department_name || raw.department || 'Phòng Telesale',
      branchId: raw.branch_id || 3,
      sipConfig: raw.sip_config || (raw.impi ? {
        impi: raw.impi,
        impu: raw.impu,
        password: raw.sip_password || raw.password,
        websocketProxyUrl: raw.websocket_proxy_url,
        iceServerUrl: raw.ice_server_url,
      } : undefined),
    }
  },

  /**
   * Cập nhật thông tin tài khoản, ngân hàng, ảnh đại diện lên ERP
   */
  async updateUserInfo(formData: FormData): Promise<any> {
    return apiClient.post(API_ENDPOINTS.USER_UPDATE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  /**
   * Lấy danh sách nhân sự Telesale theo phòng ban và bộ phận
   */
  async getUserLists(params?: {
    phong_ban?: number
    bo_phan?: number
    branch_id?: number
  }): Promise<any> {
    const response = await apiClient.post<any, any>(API_ENDPOINTS.USER_LISTS, params || {})
    return response.result || response.items || response || []
  },
}

export default authService
