import { describe, expect, it } from 'vitest'
import {
  formatConversationTime,
  formatDateDivider,
  formatMessageTime,
  getInitials,
  getUserColor,
  isImageFile,
  USER_PALETTES,
} from './chatUtils'

describe('chatUtils Unit Tests', () => {
  describe('getUserColor', () => {
    it('trả về màu mặc định nếu tên rỗng hoặc undefined', () => {
      expect(getUserColor('')).toEqual(USER_PALETTES[0])
      expect(getUserColor(undefined)).toEqual(USER_PALETTES[0])
    })

    it('gán màu nhất quán (deterministic) cho cùng một người', () => {
      const color1 = getUserColor('Mai Thị Trang')
      const color2 = getUserColor('Mai Thị Trang')
      const color3 = getUserColor('mai thị trang')
      expect(color1).toEqual(color2)
      expect(color1).toEqual(color3)
    })

    it('phân bổ các màu khác nhau cho những người khác nhau', () => {
      const colorA = getUserColor('Mai Thị Trang')
      const colorB = getUserColor('Giáp Văn Anh')
      const colorC = getUserColor('Đỗ Thu Hà')

      expect(colorA.bg).toBeTruthy()
      expect(colorA.text).toBeTruthy()
      expect(colorB.bg).toBeTruthy()
      expect(colorC.bg).toBeTruthy()
    })
  })

  describe('getInitials', () => {
    it('lấy 2 chữ cái đầu và cuối của họ tên', () => {
      expect(getInitials('Mai Thị Trang')).toBe('MT')
      expect(getInitials('Giáp Văn Anh')).toBe('GA')
      expect(getInitials('Đỗ Thu Hà')).toBe('ĐH')
      expect(getInitials('Nam')).toBe('NA')
      expect(getInitials('')).toBe('U')
    })
  })

  describe('formatMessageTime', () => {
    it('định dạng giờ đúng định dạng', () => {
      expect(formatMessageTime('')).toBe('')
      expect(formatMessageTime('2026-11-02 14:30:00')).toBeTruthy()
    })
  })

  describe('isImageFile', () => {
    it('nhận diện đúng các định dạng hình ảnh', () => {
      expect(isImageFile({ type: 'image' })).toBe(true)
      expect(isImageFile({ file_name: 'photo.png' })).toBe(true)
      expect(isImageFile({ file_name: 'blob_img_123.png' })).toBe(true)
      expect(isImageFile({ file_name: 'document.pdf' })).toBe(false)
      expect(isImageFile(null)).toBe(false)
    })
  })

  describe('formatDateDivider', () => {
    it('trả về Hôm nay nếu là ngày hiện tại', () => {
      const today = new Date().toISOString()
      expect(formatDateDivider(today)).toBe('Hôm nay')
    })
  })

  describe('formatConversationTime', () => {
    it('trả về rỗng nếu không có thời gian', () => {
      expect(formatConversationTime('')).toBe('')
      expect(formatConversationTime(undefined)).toBe('')
    })

    it('trả về giờ:phút nếu là ngày hôm nay', () => {
      const today = new Date().toISOString().slice(0, 10)
      const res = formatConversationTime(`${today} 17:06:35`)
      expect(res).toBe('17:06')
    })

    it('trả về Hôm qua nếu là ngày hôm qua', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().slice(0, 10)
      expect(formatConversationTime(`${yStr} 15:00:00`)).toBe('Hôm qua')
    })

    it('trả về DD/MM nếu cùng năm', () => {
      const thisYear = new Date().getFullYear()
      expect(formatConversationTime(`${thisYear}-10-31 17:12:17`)).toBe('31/10')
      expect(formatConversationTime(`${thisYear}-08-29 08:24:03`)).toBe('29/08')
    })

    it('trả về DD/MM/YY nếu khác năm', () => {
      expect(formatConversationTime('2024-12-28 11:00:00')).toBe('28/12/24')
    })
  })
})

