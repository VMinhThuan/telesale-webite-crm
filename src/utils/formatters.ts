import dayjs from '../lib/dayjs'

/**
 * Định dạng số tiền sang chuẩn hiển thị VNĐ (Ví dụ: 12.500.000đ)
 */
export const formatVND = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0đ'
  const numeric = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]+/g, '')) : value
  if (isNaN(numeric)) return '0đ'
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(numeric))}đ`
}

/**
 * Định dạng ngày giờ chuẩn tiếng Việt
 */
export const formatDate = (
  date: string | Date | null | undefined,
  template = 'DD/MM/YYYY',
): string => {
  if (!date) return '—'
  const d = dayjs(date)
  return d.isValid() ? d.format(template) : '—'
}

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = dayjs(date)
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : '—'
}

/**
 * Định dạng thời lượng tính bằng giây sang dạng mm:ss hoặc hh:mm:ss
 */
export const formatDuration = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Lấy tone màu sắc hiển thị phù hợp với trạng thái đơn / trạng thái khách
 */
export const getStatusBadgeTone = (
  status: string | null | undefined,
): 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'gray' => {
  if (!status) return 'gray'
  const s = status.toLowerCase()

  if (s.includes('đã chốt') || s.includes('thành công') || s.includes('đã hẹn') || s.includes('answer')) {
    return 'green'
  }
  if (s.includes('đang tư vấn') || s.includes('kết nối') || s.includes('kho') || s.includes('outgoing')) {
    return 'blue'
  }
  if (s.includes('gọi lại') || s.includes('tiềm năng') || s.includes('chờ') || s.includes('hôm nay')) {
    return 'amber'
  }
  if (s.includes('đã xác nhận') || s.includes('chờ xác nhận')) {
    return 'purple'
  }
  if (s.includes('trả về') || s.includes('hủy') || s.includes('lùi') || s.includes('từ chối')) {
    return 'rose'
  }
  return 'gray'
}
