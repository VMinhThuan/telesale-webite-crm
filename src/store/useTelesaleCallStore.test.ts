import { beforeEach, describe, expect, it } from 'vitest'
import { useTelesaleCallStore } from './useTelesaleCallStore'

describe('useTelesaleCallStore Zustand Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    useTelesaleCallStore.getState().resetTabs()
    useTelesaleCallStore.getState().setIsAutoDialEnabled(true)
  })

  it('khởi tạo với 3 tabs mặc định ở trạng thái idle', () => {
    const state = useTelesaleCallStore.getState()
    expect(state.tabs).toHaveLength(3)
    expect(state.activeTabId).toBe(1)
    expect(state.tabs.every((t) => t.status === 'idle')).toBe(true)
    expect(state.isAutoDialEnabled).toBe(true)
  })

  it('cập nhật và lưu trạng thái isAutoDialEnabled vào localStorage', () => {
    useTelesaleCallStore.getState().setIsAutoDialEnabled(false)
    expect(useTelesaleCallStore.getState().isAutoDialEnabled).toBe(false)
    expect(localStorage.getItem('telesale_auto_dial')).toBe('false')

    useTelesaleCallStore.getState().setIsAutoDialEnabled(true)
    expect(useTelesaleCallStore.getState().isAutoDialEnabled).toBe(true)
    expect(localStorage.getItem('telesale_auto_dial')).toBe('true')
  })

  it('cập nhật thông tin tab độc lập', () => {
    useTelesaleCallStore.getState().updateTab(2, { status: 'calling' })
    const state = useTelesaleCallStore.getState()
    expect(state.tabs.find((t) => t.id === 2)?.status).toBe('calling')
    expect(state.tabs.find((t) => t.id === 1)?.status).toBe('idle')
  })

  it('cập nhật và reset bản nháp của tab', () => {
    useTelesaleCallStore.getState().updateTabDraft(1, { note: 'Khách hẹn gọi lại sau 15h' })
    expect(useTelesaleCallStore.getState().getTabDraft(1).note).toBe('Khách hẹn gọi lại sau 15h')

    useTelesaleCallStore.getState().resetTabDraft(1, '2026-11-20')
    const resetDraft = useTelesaleCallStore.getState().getTabDraft(1)
    expect(resetDraft.note).toBe('')
    expect(resetDraft.orderDate).toBe('2026-11-20')
  })
})
