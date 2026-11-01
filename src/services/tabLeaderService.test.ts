import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tabLeaderService } from './tabLeaderService'

describe('tabLeaderService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    tabLeaderService.destroy()
    vi.useRealTimers()
  })

  it('khởi tạo tab đầu tiên trở thành Master khi không có ai phản hồi', () => {
    tabLeaderService.init()
    expect(tabLeaderService.getTabId()).toBeDefined()

    // Chạy qua thời gian discovery 300ms
    vi.advanceTimersByTime(350)
    expect(tabLeaderService.isLeader()).toBe(true)
  })

  it('thông báo cho listeners khi quyền Master thay đổi', () => {
    const listener = vi.fn()
    const unsubscribe = tabLeaderService.onLeaderChange(listener)

    expect(listener).toHaveBeenCalledWith(false)

    tabLeaderService.init()
    vi.advanceTimersByTime(350)

    expect(listener).toHaveBeenCalledWith(true)
    unsubscribe()
  })

  it('cho phép claimMaster để chủ động nhận quyền', async () => {
    tabLeaderService.init()
    const promise = tabLeaderService.claimMaster()
    vi.advanceTimersByTime(350)
    const result = await promise
    expect(result.success).toBe(true)
    expect(tabLeaderService.isLeader()).toBe(true)
  })

  it('từ chối yêu cầu takeover khi đang có cuộc gọi hoạt động', () => {
    tabLeaderService.init()
    vi.advanceTimersByTime(350)
    expect(tabLeaderService.isLeader()).toBe(true)

    tabLeaderService.setActiveCallsChecker(() => true)

    const postMessageSpy = vi.spyOn(tabLeaderService as any, 'postMessage')

    ;(tabLeaderService as any).handleMessage({
      type: 'REQUEST_TAKEOVER',
      requesterTabId: 'other_tab',
      requestId: 'req_123',
      force: false,
    })

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TAKEOVER_REJECTED',
        requesterTabId: 'other_tab',
        requestId: 'req_123',
      }),
    )
    expect(tabLeaderService.isLeader()).toBe(true)
  })

  it('chấp thuận yêu cầu takeover khi không có cuộc gọi hoạt động', () => {
    tabLeaderService.init()
    vi.advanceTimersByTime(350)
    expect(tabLeaderService.isLeader()).toBe(true)

    tabLeaderService.setActiveCallsChecker(() => false)

    const postMessageSpy = vi.spyOn(tabLeaderService as any, 'postMessage')

    ;(tabLeaderService as any).handleMessage({
      type: 'REQUEST_TAKEOVER',
      requesterTabId: 'other_tab',
      requestId: 'req_456',
      force: false,
    })

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TAKEOVER_ACCEPTED',
        requesterTabId: 'other_tab',
        requestId: 'req_456',
      }),
    )
    expect(tabLeaderService.isLeader()).toBe(false)
  })

  it('phân xử xung đột I_AM_MASTER bằng tabId duy nhất tránh mutual concession', () => {
    tabLeaderService.init()
    vi.advanceTimersByTime(350)
    expect(tabLeaderService.isLeader()).toBe(true)

    const myTabId = tabLeaderService.getTabId()
    // Tab khác có tabId lớn hơn -> Tab này nhường
    const largerTabId = myTabId + '_larger'
    ;(tabLeaderService as any).handleMessage({
      type: 'I_AM_MASTER',
      masterTabId: largerTabId,
    })
    expect(tabLeaderService.isLeader()).toBe(false)
    expect(tabLeaderService.getMasterTabId()).toBe(largerTabId)
  })

  it('giữ quyền Master nếu tabId của mình lớn hơn khi xung đột I_AM_MASTER', () => {
    tabLeaderService.init()
    vi.advanceTimersByTime(350)
    expect(tabLeaderService.isLeader()).toBe(true)

    const myTabId = tabLeaderService.getTabId()
    // Tab khác có tabId nhỏ hơn -> Tab này giữ quyền và broadcast lại I_AM_MASTER
    const smallerTabId = '000_smaller_tab'
    const postMessageSpy = vi.spyOn(tabLeaderService as any, 'postMessage')

    ;(tabLeaderService as any).handleMessage({
      type: 'I_AM_MASTER',
      masterTabId: smallerTabId,
    })
    expect(tabLeaderService.isLeader()).toBe(true)
    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'I_AM_MASTER',
      masterTabId: myTabId,
    })
  })
})
