import { create } from 'zustand'
import { clearStoredAuth, getStoredToken, setStoredToken } from '../services/apiClient'

export interface UserProfile {
  id: number | string
  name: string
  username: string
  role: string
  department?: string
  branchId?: number
  avatarUrl?: string
  sipConfig?: {
    impi?: string
    impu?: string
    password?: string
    websocketProxyUrl?: string
    iceServerUrl?: string
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

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: {
    id: 1,
    name: 'Nguyễn Văn A',
    username: 'nguyenvana',
    role: 'Telesale',
    department: 'Phòng Telesale',
  },
  isAuthenticated: Boolean(getStoredToken()),

  login: (token, user) => {
    setStoredToken(token)
    set({ token, user, isAuthenticated: true })
  },

  logout: () => {
    clearStoredAuth()
    set({ token: null, user: null, isAuthenticated: false })
  },

  updateUser: (partial) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
}))
