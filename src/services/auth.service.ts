import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { UserProfile } from '../store/useAuthStore'
import apiClient, { clearStoredAuth, setStoredToken, setStoredUser } from './apiClient'

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
    const raw =
      response.result?.user_info ||
      response.result?.user ||
      response.result ||
      response.user_info ||
      response.user ||
      response

    const userProfile: UserProfile = {
      id: raw.id || raw.user_id || 1,
      name: raw.full_name || raw.name || 'Nhân viên Telesale',
      username: raw.username || raw.contact_number || '',
      role: raw.chuc_vu || raw.role_name || raw.role || 'Nhân viên',
      department: raw.department_name || raw.department || 'Phòng Telesale',
      branchId: raw.branch_id || 3,
      avatarUrl: raw.avatar || undefined,
      email: raw.email || '',
      contactNumber: raw.contact_number || raw.username || '',
      surname: raw.surname || '',
      userExtension: raw.user_extension || '',
      chucVu: raw.chuc_vu || '',
      status: raw.status || 'active',
      loaiNv: raw.loai_nv || 'nvkd',
      attendanceMethod: raw.attendance_method || 'face_detection',
      lastSeen: raw.last_seen || '',
      createdAt: raw.created_at || '',
      listPdh: Array.isArray(raw.list_pdh) ? raw.list_pdh : [],
      features: raw.features || {},
      bankName: raw.bank_name || '',
      bankAccountNumber: raw.bank_account_number || '',
      bankAccountName: raw.bank_account_name || '',
      bankQrImageUrl: raw.bank_qr_image_url || null,
      frontImageUrl: raw.front_image_url || null,
      leftImageUrl: raw.left_image_url || null,
      rightImageUrl: raw.right_image_url || null,
      isVerified: Boolean(raw.front_image_url && raw.left_image_url && raw.right_image_url),
      sipConfig: raw.sip_config || (raw.impi ? {
        impi: raw.impi,
        impu: raw.impu,
        password: raw.sip_password || raw.password,
        websocketProxyUrl: raw.websocket_proxy_url,
        iceServerUrl: raw.ice_server_url,
        realm: raw.realm || 'grandstream',
        displayName: raw.display_name || raw.user_extension,
      } : undefined),
    }

    setStoredUser(userProfile)
    return userProfile
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
   * Lấy danh sách nhân sự Telesale theo phòng ban và bộ phận (API 05: POST /api/manage-users/get-user-lists)
   */
  async getUserLists(params?: {
    phong_ban?: number
    bo_phan?: number
    branch_id?: number
  }): Promise<any[]> {
    try {
      const response = await apiClient.post<any, any>(API_ENDPOINTS.USER_LISTS, params || {})
      const res = response?.result ?? response
      if (Array.isArray(res)) return res
      if (Array.isArray(res?.items)) return res.items
      if (Array.isArray(res?.users)) return res.users
      if (Array.isArray(res?.data)) return res.data
      return []
    } catch (error) {
      console.warn('Lỗi lấy danh sách nhân viên:', error)
      return []
    }
  },
}

export default authService
