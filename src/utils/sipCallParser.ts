/**
 * Bộ phân tích và chuẩn hóa nguyên nhân kết thúc cuộc gọi VoIP / FreeSWITCH (Call Termination Parser).
 * 
 * Bóc tách chính xác dựa trên các chuẩn viễn thông:
 * 1. SIP Response Status Code (RFC 3261)
 * 2. ITU-T Q.850 Reason Header (RFC 3326)
 * 3. JsSIP Internal Causes & Originator
 */

export type TerminationCode =
  | 'user_busy'
  | 'call_rejected'
  | 'no_answer'
  | 'unreachable'
  | 'invalid_number'
  | 'circuit_congestion'
  | 'local_canceled'
  | 'remote_hangup'
  | 'local_hangup'
  | 'system_error'
  | 'unknown'

export interface RawSipTerminationData {
  status: 'ended' | 'failed'
  originator?: 'local' | 'remote' | 'system'
  cause?: string
  sipStatusCode?: number
  reasonPhrase?: string
  reasonHeader?: string
  wasConfirmed?: boolean
  durationSec?: number
}

export interface ParsedCallTermination {
  code: TerminationCode
  label: string
  shortLabel: string
  detail: string
  tone: 'amber' | 'rose' | 'blue' | 'gray'
  suggestedOutcome?: 'callback' | 'no_answer' | 'wrong_number'
  isNormalEnd: boolean
  sipStatusCode?: number
  rawReason?: string
}

/**
 * Trích xuất mã số nguyên nhân Q.850 từ chuỗi header Reason
 * Ví dụ: 'Q.850;cause=17;text="USER_BUSY"' -> 17
 */
export function extractQ850Cause(reasonHeader?: string): number | null {
  if (!reasonHeader) return null
  const match = reasonHeader.match(/cause\s*=\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Phân tích dữ liệu kết thúc cuộc gọi thô thành thông tin chuẩn hóa có ý nghĩa cho giao diện và CRM
 */
export function parseSipTermination(data: RawSipTerminationData): ParsedCallTermination {
  const {
    status,
    originator,
    cause = '',
    sipStatusCode,
    reasonPhrase = '',
    reasonHeader = '',
    wasConfirmed = false,
    durationSec = 0,
  } = data

  const q850Cause = extractQ850Cause(reasonHeader)
  const normalizedReason = (reasonHeader + ' ' + cause + ' ' + reasonPhrase).toUpperCase()

  // 1. NHÓM MÁY BẬN (USER_BUSY - Q.850 Cause 17 hoặc SIP 486 hoặc JsSIP 'Busy')
  if (
    sipStatusCode === 486 ||
    q850Cause === 17 ||
    normalizedReason.includes('USER_BUSY') ||
    cause.toLowerCase() === 'busy'
  ) {
    return {
      code: 'user_busy',
      label: 'Máy khách bận (486 - Đang bận hoặc từ chối)',
      shortLabel: 'Máy bận',
      detail: 'Khách hàng đang bận cuộc gọi khác hoặc bấm nút dập máy ngay khi chuông reo.',
      tone: 'amber',
      suggestedOutcome: 'callback',
      isNormalEnd: false,
      sipStatusCode: 486,
      rawReason: reasonHeader || cause || 'Busy',
    }
  }

  // 2. NHÓM ĐẦU XA TỪ CHỐI (CALL_REJECTED - Q.850 Cause 21 hoặc SIP 603 hoặc JsSIP 'Rejected')
  if (
    sipStatusCode === 603 ||
    q850Cause === 21 ||
    normalizedReason.includes('CALL_REJECTED') ||
    cause.toLowerCase() === 'rejected'
  ) {
    return {
      code: 'call_rejected',
      label: 'Khách từ chối cuộc gọi (603 Decline)',
      shortLabel: 'Khách từ chối',
      detail: 'Đầu máy khách hàng đã chủ động bấm từ chối nhận cuộc gọi.',
      tone: 'rose',
      suggestedOutcome: 'no_answer',
      isNormalEnd: false,
      sipStatusCode: 603,
      rawReason: reasonHeader || cause || 'Rejected',
    }
  }

  // 3. NHÓM SỐ KHÔNG TỒN TẠI / SAI SỐ (UNALLOCATED_NUMBER - Q.850 Cause 1 hoặc SIP 404/484)
  if (
    sipStatusCode === 404 ||
    sipStatusCode === 484 ||
    q850Cause === 1 ||
    q850Cause === 28 ||
    normalizedReason.includes('UNALLOCATED_NUMBER') ||
    normalizedReason.includes('INVALID_NUMBER_FORMAT') ||
    cause.toLowerCase() === 'not found' ||
    cause.toLowerCase() === 'address incomplete'
  ) {
    return {
      code: 'invalid_number',
      label: `Số điện thoại không tồn tại (${sipStatusCode || 404})`,
      shortLabel: 'Sai số',
      detail: 'Số điện thoại không có thực hoặc sai định dạng số viễn thông.',
      tone: 'rose',
      suggestedOutcome: 'wrong_number',
      isNormalEnd: false,
      sipStatusCode: sipStatusCode || 404,
      rawReason: reasonHeader || cause || 'Invalid Number',
    }
  }

  // 4. NHÓM THUÊ BAO TẮT MÁY / NGOÀI VÙNG PHỦ SÓNG (SUBSCRIBER_ABSENT - Q.850 Cause 20)
  if (
    q850Cause === 20 ||
    normalizedReason.includes('SUBSCRIBER_ABSENT')
  ) {
    return {
      code: 'unreachable',
      label: 'Thuê bao không liên lạc được / Tắt máy (480)',
      shortLabel: 'Tắt máy / Ngoài vùng',
      detail: 'Thuê bao ngoài vùng phủ sóng hoặc điện thoại đang tắt máy.',
      tone: 'gray',
      suggestedOutcome: 'no_answer',
      isNormalEnd: false,
      sipStatusCode: sipStatusCode || 480,
      rawReason: reasonHeader || cause || 'Subscriber Absent',
    }
  }

  // 5. NHÓM KHÔNG NGHE MÁY / HẾT THỜI GIAN CHỜ (NO_ANSWER - Q.850 Cause 19 hoặc SIP 480/408)
  if (
    sipStatusCode === 480 ||
    sipStatusCode === 408 ||
    q850Cause === 19 ||
    q850Cause === 18 ||
    normalizedReason.includes('NO_ANSWER') ||
    normalizedReason.includes('NO_USER_RESPONSE') ||
    cause.toLowerCase() === 'unavailable' ||
    cause.toLowerCase() === 'request timeout'
  ) {
    return {
      code: 'no_answer',
      label: 'Khách không nghe máy (Hết thời gian chờ)',
      shortLabel: 'Không nghe máy',
      detail: 'Đã đổ chuông đầy đủ nhưng khách hàng không nhấc máy.',
      tone: 'gray',
      suggestedOutcome: 'no_answer',
      isNormalEnd: false,
      sipStatusCode: sipStatusCode || 480,
      rawReason: reasonHeader || cause || 'No Answer',
    }
  }

  // 6. NHÓM NGHẼN MẠNG VIỄN THÔNG / LỖI GATEWAY (Q.850 Cause 34 hoặc SIP 502/503/504)
  if (
    sipStatusCode === 502 ||
    sipStatusCode === 503 ||
    sipStatusCode === 504 ||
    q850Cause === 34 ||
    q850Cause === 27 ||
    normalizedReason.includes('CONGESTION') ||
    normalizedReason.includes('DESTINATION_OUT_OF_ORDER')
  ) {
    return {
      code: 'circuit_congestion',
      label: `Nghẽn mạng viễn thông / Kênh bận (${sipStatusCode || 503})`,
      shortLabel: 'Nghẽn mạng',
      detail: 'Hạ tầng nhà mạng hoặc kênh tổng đài đang bị nghẽn mạch cục bộ.',
      tone: 'amber',
      suggestedOutcome: 'callback',
      isNormalEnd: false,
      sipStatusCode: sipStatusCode || 503,
      rawReason: reasonHeader || cause || 'Circuit Congestion',
    }
  }

  // 7. NHÓM NHÂN VIÊN CHỦ ĐỘNG HỦY / GÁC MÁY (originator: 'local')
  if (originator === 'local') {
    if (!wasConfirmed && (status === 'failed' || durationSec === 0)) {
      return {
        code: 'local_canceled',
        label: 'Bạn đã hủy cuộc gọi',
        shortLabel: 'Đã hủy',
        detail: 'Nhân viên telesale đã chủ động bấm dừng cuộc gọi trước khi khách nhấc máy.',
        tone: 'blue',
        isNormalEnd: false,
        rawReason: 'Local Canceled',
      }
    }
    return {
      code: 'local_hangup',
      label: 'Bạn đã kết thúc cuộc gọi',
      shortLabel: 'Đã kết thúc',
      detail: 'Nhân viên telesale đã chủ động gác máy kết thúc đàm thoại.',
      tone: 'blue',
      isNormalEnd: true,
      rawReason: 'Local Hangup',
    }
  }

  // 8. NHÓM KHÁCH HÀNG GÁC MÁY SAU KHI ĐÃ ĐÀM THOẠI (status: 'ended', wasConfirmed hoặc durationSec > 0)
  if (status === 'ended' && (wasConfirmed || durationSec > 0)) {
    return {
      code: 'remote_hangup',
      label: `Khách hàng đã gác máy (${durationSec > 0 ? `${durationSec}s` : 'Kết thúc'})`,
      shortLabel: 'Khách gác máy',
      detail: 'Khách hàng đã kết thúc cuộc đàm thoại hai chiều.',
      tone: 'blue',
      isNormalEnd: true,
      rawReason: reasonHeader || cause || 'Remote BYE',
    }
  }

  // 9. NHÓM LỖI THIẾT BỊ / HỆ THỐNG / QUYỀN MICROPHONE (originator: 'system' hoặc WebRTC Error)
  if (
    originator === 'system' ||
    normalizedReason.includes('MEDIA') ||
    normalizedReason.includes('RTP') ||
    normalizedReason.includes('CONNECTION_ERROR')
  ) {
    return {
      code: 'system_error',
      label: `Lỗi kết nối âm thanh / Thiết bị (${cause || 'System'})`,
      shortLabel: 'Lỗi thiết bị',
      detail: 'Không thể khởi tạo luồng âm thanh hoặc microphone bị chặn quyền truy cập.',
      tone: 'rose',
      isNormalEnd: false,
      rawReason: cause || 'System Error',
    }
  }

  // 10. MẶC ĐỊNH: Không xác định được nguyên nhân cụ thể
  return {
    code: 'unknown',
    label: 'Cuộc gọi kết thúc (Chưa xác định nguyên nhân)',
    shortLabel: 'Đã kết thúc',
    detail: 'Tổng đài viễn thông không cung cấp chi tiết mã lý do kết thúc.',
    tone: 'gray',
    isNormalEnd: wasConfirmed || durationSec > 0,
    sipStatusCode,
    rawReason: reasonHeader || cause || undefined,
  }
}

