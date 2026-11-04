import { describe, expect, it } from 'vitest'
import {
  calculateCommission,
  calculateMinutesBetween,
  calculateTotalWorkingMinutes,
  formatWorkingTime,
} from './useTelesale'
import { AttendanceDto } from '../types/api'

describe('useTelesale commission & attendance helpers', () => {
  describe('calculateCommission', () => {
    it('trả về 0 khi đơn phát sinh <= 0 hoặc không có', () => {
      expect(calculateCommission(0)).toBe(0)
      expect(calculateCommission(-5)).toBe(0)
      expect(calculateCommission(null as any)).toBe(0)
      expect(calculateCommission(undefined as any)).toBe(0)
    })

    it('áp dụng mức 75.000đ khi số đơn <= 100', () => {
      expect(calculateCommission(1)).toBe(75000)
      expect(calculateCommission(10)).toBe(750000)
      expect(calculateCommission(100)).toBe(7500000)
    })

    it('áp dụng mức 100.000đ khi số đơn > 100', () => {
      expect(calculateCommission(101)).toBe(10100000)
      expect(calculateCommission(150)).toBe(15000000)
    })
  })

  describe('calculateMinutesBetween & calculateTotalWorkingMinutes', () => {
    it('tính đúng số phút làm việc dạng HH:mm', () => {
      expect(calculateMinutesBetween('08:00', '12:00')).toBe(240)
      expect(calculateMinutesBetween('13:30', '17:30')).toBe(240)
      expect(calculateMinutesBetween('08:15', '08:45')).toBe(30)
    })

    it('trả về 0 khi giờ không hợp lệ hoặc giờ ra nhỏ hơn giờ vào', () => {
      expect(calculateMinutesBetween(undefined, '12:00')).toBe(0)
      expect(calculateMinutesBetween('12:00', undefined)).toBe(0)
      expect(calculateMinutesBetween('17:00', '08:00')).toBe(0)
    })

    it('tính tổng số phút từ 2 ca làm việc trong AttendanceDto', () => {
      const records: AttendanceDto[] = [
        {
          user_id: 1,
          ma_nhanvien: 'NV01',
          ten_nhanvien: 'Nguyễn Văn A',
          ngay_cham: '2026-11-04',
          gio_vao1: '08:00',
          gio_ra1: '12:00', // 240 mins
          gio_vao2: '13:30',
          gio_ra2: '17:30', // 240 mins -> tổng 480 mins = 8h
        },
      ]
      expect(calculateTotalWorkingMinutes(records)).toBe(480)
    })
  })

  describe('formatWorkingTime', () => {
    it('định dạng đúng "X giờ Y phút"', () => {
      expect(formatWorkingTime(0)).toBe('0 giờ 0 phút')
      expect(formatWorkingTime(45)).toBe('0 giờ 45 phút')
      expect(formatWorkingTime(60)).toBe('1 giờ 0 phút')
      expect(formatWorkingTime(510)).toBe('8 giờ 30 phút')
    })
  })
})

