import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatVND,
  getStatusBadgeTone,
} from './formatters'

describe('Formatters Unit Tests', () => {
  describe('formatVND()', () => {
    it('định dạng số tiền VNĐ chuẩn xác có dấu chấm phân cách hàng nghìn', () => {
      expect(formatVND(250000)).toMatch(/250[.,]000đ/)
      expect(formatVND(12500000)).toMatch(/12[.,]500[.,]000đ/)
    })

    it('xử lý chuỗi số hoặc giá trị 0', () => {
      expect(formatVND(0)).toBe('0đ')
      expect(formatVND('500000')).toMatch(/500[.,]000đ/)
    })

    it('trả về 0đ khi giá trị null, undefined hoặc rỗng', () => {
      expect(formatVND(null)).toBe('0đ')
      expect(formatVND(undefined)).toBe('0đ')
      expect(formatVND('')).toBe('0đ')
      expect(formatVND('không phải số')).toBe('0đ')
    })
  })

  describe('formatDuration()', () => {
    it('định dạng số giây dưới 1 giờ sang mm:ss', () => {
      expect(formatDuration(0)).toBe('00:00')
      expect(formatDuration(59)).toBe('00:59')
      expect(formatDuration(65)).toBe('01:05')
      expect(formatDuration(600)).toBe('10:00')
    })

    it('định dạng số giây trên 1 giờ sang hh:mm:ss', () => {
      expect(formatDuration(3600)).toBe('01:00:00')
      expect(formatDuration(3665)).toBe('01:01:05')
    })

    it('xử lý giá trị âm hoặc NaN', () => {
      expect(formatDuration(-10)).toBe('00:00')
      expect(formatDuration(NaN)).toBe('00:00')
    })
  })

  describe('formatDate() & formatDateTime()', () => {
    it('định dạng ngày theo chuẩn DD/MM/YYYY', () => {
      expect(formatDate('2026-10-28')).toBe('28/10/2026')
      expect(formatDate('2026-05-09')).toBe('09/05/2026')
    })

    it('định dạng ngày giờ DD/MM/YYYY HH:mm', () => {
      expect(formatDateTime('2026-10-28 14:30:00')).toBe('28/10/2026 14:30')
    })

    it('trả về ký tự gạch nối — khi ngày rỗng hoặc không hợp lệ', () => {
      expect(formatDate(null)).toBe('—')
      expect(formatDate(undefined)).toBe('—')
      expect(formatDate('invalid-date')).toBe('—')
    })
  })

  describe('getStatusBadgeTone()', () => {
    it('ánh xạ đúng tone màu theo từ khóa trạng thái', () => {
      expect(getStatusBadgeTone('Đã chốt đơn')).toBe('green')
      expect(getStatusBadgeTone('Đang tư vấn')).toBe('blue')
      expect(getStatusBadgeTone('Hẹn gọi lại')).toBe('amber')
      expect(getStatusBadgeTone('Đã xác nhận')).toBe('purple')
      expect(getStatusBadgeTone('Đã hủy')).toBe('rose')
      expect(getStatusBadgeTone('Trả về')).toBe('rose')
      expect(getStatusBadgeTone(null)).toBe('gray')
    })
  })
})

