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

  it('cho phép claimMaster để chủ động nhận quyền', () => {
    tabLeaderService.init()
    tabLeaderService.claimMaster()
    expect(tabLeaderService.isLeader()).toBe(true)
  })
})

