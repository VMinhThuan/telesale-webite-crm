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

