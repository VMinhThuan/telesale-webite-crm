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

/**
 * Kiểm tra xem đơn hàng có thuộc nhóm trạng thái kết thúc/tiêu cực (Hủy, Trả về, Sai máy) hay không
 */
export const isTerminatedOrderStatus = (
  status?: string | null,
  trangThai?: string | null,
): boolean => {
  const s = (status || '').toLowerCase()
  const t = (trangThai || '').toLowerCase()
  return (
    ['huy', 'tra_ve', 'sai_may'].includes(s) ||
    t.includes('hủy') ||
    t.includes('trả về') ||
    t.includes('sai máy')
  )
}

export interface OrderStatusCheckable {
  status?: string | null
  trang_thai?: string | null
  sale_checked?: boolean | null
}

/**
 * Kiểm tra xem đơn hàng đã được xác nhận lịch hẹn hay chưa
 * (Dựa trên cờ sale_checked, status da_xac_nhan hoặc chuỗi trạng thái chứa 'đã xác nhận')
 */
export const isConfirmedOrderStatus = (
  order?: OrderStatusCheckable | null,
): boolean => {
  if (!order) return false
  if (isTerminatedOrderStatus(order.status, order.trang_thai)) return false
  if (order.sale_checked) return true
  const s = (order.status || '').toLowerCase()
  const t = (order.trang_thai || '').toLowerCase()
  return (
    s === 'da_xac_nhan' ||
    t.includes('đã xác nhận') ||
    t.includes('da_xac_nhan')
  )
}

/**
 * Che (mask) khoảng 30% phần đầu địa chỉ của khách hàng để bảo mật thông tin (số nhà, ngõ/ngách)
 * Giữ nguyên phần sau (phường/xã, quận/huyện, tỉnh/thành phố) để telesale nắm được khu vực
 */
export const maskAddress = (address?: string | null, maskRatio = 0.3): string => {
  if (!address || !address.trim()) return 'Chưa cập nhật địa chỉ'
  const trimmed = address.trim()
  if (trimmed.startsWith('*') || trimmed.includes('******')) {
    return trimmed
  }

  // Tính vị trí cắt theo tỷ lệ mask (mặc định 30%)
  const targetIndex = Math.max(3, Math.round(trimmed.length * maskRatio))

  // Tìm khoảng trắng gần nhất sau targetIndex để tránh cắt cụt giữa một từ
  let splitIndex = trimmed.indexOf(' ', targetIndex)
  if (splitIndex === -1 || splitIndex > targetIndex + 12) {
    splitIndex = targetIndex
  }

  const remaining = trimmed.slice(splitIndex).replace(/^[\s,.-]+/, '')
  return remaining ? `****** ${remaining}` : '******'
}

