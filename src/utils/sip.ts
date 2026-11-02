import { SipAccountConfig } from '../services/sipService'
import { UserProfile } from '../store/useAuthStore'

/**
 * Trích xuất cấu hình máy nhánh SIP hợp lệ từ thông tin người dùng được cấp bởi ERP.
 * Trả về null nếu thông tin chưa đầy đủ (thiếu impi, password, hoặc websocketProxyUrl).
 */
export function getEffectiveSipConfig(user?: UserProfile | null): SipAccountConfig | null {
  const rawSip = user?.sipConfig
  if (!rawSip?.impi || !rawSip?.password || !rawSip?.websocketProxyUrl) {
    return null
  }

  return {
    impi: rawSip.impi,
    impu: rawSip.impu || `sip:${rawSip.impi}@${rawSip.realm || 'tongdai.zozin.vn'}`,
    password: rawSip.password,
    websocketProxyUrl: rawSip.websocketProxyUrl,
    iceServerUrl: rawSip.iceServerUrl,
    realm: rawSip.realm,
    displayName: rawSip.displayName || user?.name || rawSip.impi,
  }
}

