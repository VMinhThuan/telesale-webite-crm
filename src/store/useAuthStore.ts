import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import {
  clearStoredAuth,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  setStoredUser,
} from '../services/apiClient'
import sipService from '../services/sipService'
import { useTelesaleCallStore } from './useTelesaleCallStore'
import { useCallStore } from './useCallStore'

export interface UserProfile {
  id: number | string
  name: string
  username: string
  role: string
  department?: string
  branchId?: number
  avatarUrl?: string
  email?: string
  contactNumber?: string
  surname?: string
  userExtension?: string
  chucVu?: string
  status?: string
  loaiNv?: string
  attendanceMethod?: string
  lastSeen?: string
  createdAt?: string
  listPdh?: Array<{ name: string; sdt: string }>
  features?: Record<string, boolean>
  bankName?: string
  bankAccountNumber?: string
  bankAccountName?: string
  bankQrImageUrl?: string | null
  frontImageUrl?: string | null
  leftImageUrl?: string | null
  rightImageUrl?: string | null
  isVerified?: boolean
  sipConfig?: {
    impi?: string
    impu?: string
    password?: string
    websocketProxyUrl?: string
    iceServerUrl?: string
    realm?: string
    displayName?: string
  }
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean

  // Actions
  login: (token: string, user: UserProfile) => void
  logout: () => void
  updateUser: (partial: Partial<UserProfile>) => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        token: getStoredToken(),
        user: getStoredUser(),
        isAuthenticated: Boolean(getStoredToken()),

        login: (token, user) => {
          if (!token) {
            clearStoredAuth()
            set({ token: null, user: null, isAuthenticated: false }, false, 'auth/login-failed')
            return
          }
          setStoredToken(token)
          setStoredUser(user)
          set({ token, user, isAuthenticated: true }, false, 'auth/login-success')
        },

        logout: () => {
          // 1. Hủy kết nối tổng đài SIP, gác máy toàn bộ các line
          try {
            sipService.destroy()
          } catch (e) {
            console.warn('Lỗi khi hủy SIP Service trong logout:', e)
          }

          // 2. Xóa sạch dữ liệu cuộc gọi và các tab Telesale
          try {
            useTelesaleCallStore.getState().resetTabs()
            useCallStore.getState().resetCall()
          } catch {
            // ignore
          }

          // 3. Xóa token và auth storage
          clearStoredAuth()
          set({ token: null, user: null, isAuthenticated: false }, false, 'auth/logout')
        },

        updateUser: (partial) =>
          set(
            (state) => {
              const updated = state.user ? { ...state.user, ...partial } : null
              setStoredUser(updated)
              return { user: updated }
            },
            false,
            'auth/updateUser',
          ),
      }),
      {
        name: 'salesflow_auth_storage',
        // Chỉ lưu token và user an toàn (loại bỏ mật khẩu SIP plain text) vào persistent storage
        partialize: (state) => {
          if (!state.user) {
            return { token: state.token, user: null, isAuthenticated: state.isAuthenticated }
          }
          const safeUser = { ...state.user }
          if (safeUser.sipConfig) {
            const { password: _, ...safeSip } = safeUser.sipConfig
            safeUser.sipConfig = safeSip
          }
          return {
            token: state.token,
            user: safeUser,
            isAuthenticated: state.isAuthenticated,
          }
        },
      },
    ),
    { name: 'AuthStore' },
  ),
)

// Atomic Selectors giúp tối ưu hiệu năng render khi chỉ cần lấy một trường cụ thể
export const useAuthUser = () => useAuthStore((s) => s.user)
export const useIsAuthenticated = () => useAuthStore((s) => s.isAuthenticated)
export const useAuthToken = () => useAuthStore((s) => s.token)

export default useAuthStore
