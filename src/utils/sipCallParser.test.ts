import { describe, expect, it } from 'vitest'
import {
  extractQ850Cause,
  parseSipTermination,
} from './sipCallParser'

describe('sipCallParser', () => {
  describe('extractQ850Cause', () => {
    it('trích xuất chính xác mã cause từ chuỗi Reason header', () => {
      expect(extractQ850Cause('Q.850;cause=17;text="USER_BUSY"')).toBe(17)
      expect(extractQ850Cause('Q.850; cause=21 ; text="CALL_REJECTED"')).toBe(21)
      expect(extractQ850Cause('Reason: Q.850 ; cause=1 ; text="UNALLOCATED"')).toBe(1)
      expect(extractQ850Cause(undefined)).toBeNull()
      expect(extractQ850Cause('')).toBeNull()
      expect(extractQ850Cause('Some other header')).toBeNull()
    })
  })

  describe('parseSipTermination', () => {
    it('nhận diện chính xác gói tin SIP 486 Busy Here và USER_BUSY (mẫu từ FreeSWITCH thật)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        cause: 'Busy',
        sipStatusCode: 486,
        reasonPhrase: 'Busy Here',
        reasonHeader: 'Q.850;cause=17;text="USER_BUSY"',
        wasConfirmed: false,
        durationSec: 0,
      })

      expect(result.code).toBe('user_busy')
      expect(result.sipStatusCode).toBe(486)
      expect(result.tone).toBe('amber')
      expect(result.suggestedOutcome).toBe('callback')
      expect(result.isNormalEnd).toBe(false)
      expect(result.label).toContain('486')
    })

    it('nhận diện chính xác mã SIP 603 và CALL_REJECTED (Khách từ chối)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        cause: 'Rejected',
        sipStatusCode: 603,
        reasonHeader: 'Q.850;cause=21;text="CALL_REJECTED"',
      })

      expect(result.code).toBe('call_rejected')
      expect(result.sipStatusCode).toBe(603)
      expect(result.tone).toBe('rose')
      expect(result.suggestedOutcome).toBe('no_answer')
    })

    it('nhận diện số không tồn tại / sai số (404 / 484)', () => {
      const result404 = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        cause: 'Not Found',
        sipStatusCode: 404,
      })
      expect(result404.code).toBe('invalid_number')
      expect(result404.suggestedOutcome).toBe('wrong_number')

      const result484 = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        cause: 'Address Incomplete',
        sipStatusCode: 484,
      })
      expect(result484.code).toBe('invalid_number')
      expect(result484.suggestedOutcome).toBe('wrong_number')
    })

    it('nhận diện thuê bao tắt máy / ngoài vùng (Q.850 cause 20)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        reasonHeader: 'Q.850;cause=20;text="SUBSCRIBER_ABSENT"',
      })
      expect(result.code).toBe('unreachable')
      expect(result.suggestedOutcome).toBe('no_answer')
    })

    it('nhận diện đổ chuông hết giờ không nghe máy (SIP 480 / cause 19 NO_ANSWER)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'remote',
        sipStatusCode: 480,
        reasonHeader: 'Q.850;cause=19;text="NO_ANSWER"',
      })
      expect(result.code).toBe('no_answer')
      expect(result.suggestedOutcome).toBe('no_answer')
    })

    it('nhận diện nhân viên telesale chủ động hủy trước khi kết nối (originator: local)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'local',
        cause: 'Canceled',
        wasConfirmed: false,
        durationSec: 0,
      })
      expect(result.code).toBe('local_canceled')
      expect(result.isNormalEnd).toBe(false)
      expect(result.label).toBe('Bạn đã hủy cuộc gọi')
    })

    it('nhận diện nhân viên telesale kết thúc sau khi đã đàm thoại (originator: local, confirmed)', () => {
      const result = parseSipTermination({
        status: 'ended',
        originator: 'local',
        wasConfirmed: true,
        durationSec: 45,
      })
      expect(result.code).toBe('local_hangup')
      expect(result.isNormalEnd).toBe(true)
    })

    it('nhận diện khách hàng gác máy sau đàm thoại (originator: remote, status: ended)', () => {
      const result = parseSipTermination({
        status: 'ended',
        originator: 'remote',
        wasConfirmed: true,
        durationSec: 120,
      })
      expect(result.code).toBe('remote_hangup')
      expect(result.isNormalEnd).toBe(true)
      expect(result.label).toContain('120s')
    })

    it('nhận diện lỗi hệ thống / microphone bị chặn (originator: system)', () => {
      const result = parseSipTermination({
        status: 'failed',
        originator: 'system',
        cause: 'User Denied Media Access',
      })
      expect(result.code).toBe('system_error')
      expect(result.tone).toBe('rose')
    })

    it('xử lý an toàn trường hợp không rõ nguyên nhân (fallback unknown)', () => {
      const result = parseSipTermination({
        status: 'failed',
      })
      expect(result.code).toBe('unknown')
      expect(result.tone).toBe('gray')
    })
  })
})
