import React from 'react'

/**
 * Lấy 2 chữ cái đầu của tên để làm avatar chữ cái
 */
export function getInitials(name: string): string {
  if (!name) return 'U'
  const clean = name.trim().replace(/^Hội thoại\s*#/i, '')
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Hiển thị thời gian tin nhắn (nếu khác ngày hiện tại thì kèm thêm DD/MM)
 */
export function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return ''
  const clean = dateStr.replace('T', ' ')
  if (clean.length < 16) return clean
  const msgDate = clean.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  const time = clean.slice(11, 16)
  if (msgDate === today) {
    return time
  }
  const parts = msgDate.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]} ${time}`
  }
  return clean.slice(5, 16)
}

/**
 * Bôi vàng từ khóa tìm kiếm trong nội dung tin nhắn
 */
export function renderHighlightedContent(text: string, keyword: string): React.ReactNode {
  if (!keyword || !keyword.trim()) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)
  if (parts.length === 1) return text
  return parts.map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark
        key={index}
        style={{
          backgroundColor: '#fef08a',
          color: '#854d0e',
          padding: '1px 3px',
          borderRadius: '3px',
          fontWeight: 700,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

/**
 * Định dạng dung lượng tệp tin (KB, MB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Hiển thị đường phân cách ngày trò chuyện
 */
export function formatDateDivider(dateStr?: string): string {
  if (!dateStr) return 'Gần đây'
  const dateOnly = dateStr.replace('T', ' ').slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)
  if (dateOnly === today) return 'Hôm nay'

  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().slice(0, 10)
  if (dateOnly === yesterday) return 'Hôm qua'

  const parts = dateOnly.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateOnly
}

/**
 * Định dạng thời gian cho danh sách cuộc trò chuyện (Hôm nay: HH:mm, Hôm qua, Trong năm: DD/MM, Khác năm: DD/MM/YY)
 */
export function formatConversationTime(dateStr?: string): string {
  if (!dateStr) return ''
  const clean = dateStr.replace('T', ' ')
  if (clean.length < 10) return clean
  const msgDate = clean.slice(0, 10)
  const today = new Date().toISOString().slice(0, 10)

  // Hôm nay: Hiển thị giờ:phút
  if (msgDate === today) {
    return clean.length >= 16 ? clean.slice(11, 16) : clean
  }

  // Hôm qua: Hiển thị "Hôm qua"
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().slice(0, 10)
  if (msgDate === yesterday) {
    return 'Hôm qua'
  }

  // Cùng năm: DD/MM (ví dụ 31/10, 28/10, 29/08)
  const thisYear = today.slice(0, 4)
  const msgYear = msgDate.slice(0, 4)
  const parts = msgDate.split('-')
  if (parts.length === 3) {
    if (msgYear === thisYear) {
      return `${parts[2]}/${parts[1]}`
    }
    // Khác năm: DD/MM/YY (ví dụ 28/12/25)
    return `${parts[2]}/${parts[1]}/${parts[0].slice(2)}`
  }

  return clean.slice(5, 10)
}

/**
 * Kiểm tra xem tệp tin hoặc tin nhắn có phải là hình ảnh không
 */
export function isImageFile(item: any): boolean {
  if (!item) return false
  if (item.type === 'image' || item.type === 1) return true
  const name = item.file_name || item.content || item.name || ''
  const url = item.file_url || item.url || ''
  const imageRegex = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i
  if (imageRegex.test(name) || imageRegex.test(url)) return true
  if (typeof name === 'string' && name.toLowerCase().includes('blob_img_')) return true
  if (typeof url === 'string' && url.toLowerCase().includes('blob_img_')) return true
  return false
}

export interface UserColorTheme {
  name: string
  bg: string      // Nền avatar dịu mắt
  text: string    // Chữ avatar & Màu tên người gửi (WCAG AA compliant)
  border: string  // Viền avatar nhẹ nhàng
}

/**
 * Bảng 10 màu Pastel cao cấp với độ tương phản cao đạt chuẩn WCAG AA
 */
export const USER_PALETTES: UserColorTheme[] = [
  { name: 'emerald', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // Xanh lá ngọc
  { name: 'purple',  bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' }, // Tím hoa cà
  { name: 'amber',   bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // Cam hổ phách
  { name: 'rose',    bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, // Hồng đỏ đậm
  { name: 'indigo',  bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, // Xanh chàm
  { name: 'teal',    bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' }, // Xanh mòng két
  { name: 'orange',  bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' }, // Cam đất
  { name: 'violet',  bg: '#faf5ff', text: '#86198f', border: '#f5d0fe' }, // Tím quả mọng
  { name: 'cyan',    bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // Xanh cyan
  { name: 'wine',    bg: '#fdf2f8', text: '#9d174d', border: '#fbcfe8' }, // Đỏ rượu
]

/**
 * Lấy bộ màu đại diện cố định theo tên người gửi (Deterministic Color Hash)
 */
export function getUserColor(name?: string): UserColorTheme {
  if (!name || !name.trim()) return USER_PALETTES[0]
  const clean = name.trim().toLowerCase()
  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % USER_PALETTES.length
  return USER_PALETTES[index]
}


