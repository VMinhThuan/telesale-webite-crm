import { beforeEach, describe, expect, it } from 'vitest'
import { useCallStore } from './useCallStore'

describe('useCallStore Zustand Tests', () => {
  beforeEach(() => {
    useCallStore.getState().resetCall()
  })

  it('khởi tạo với trạng thái idle và không có cuộc gọi', () => {
    const state = useCallStore.getState()
    expect(state.status).toBe('idle')
    expect(state.caller).toBeNull()
    expect(state.durationSec).toBe(0)
    expect(state.isMuted).toBe(false)
    expect(state.isHeld).toBe(false)
  })

  it('bắt đầu cuộc gọi chuyển status sang calling và lưu thông tin người gọi', () => {
    const mockCaller = {
      customerId: 123,
      customerName: 'Nguyễn Văn A',
      phoneMasked: '09******90',
      dialNumber: '150912345690',
    }

    useCallStore.getState().startCall(mockCaller)

    const state = useCallStore.getState()
    expect(state.status).toBe('calling')
    expect(state.caller).toEqual(mockCaller)
    expect(state.durationSec).toBe(0)
  })

  it('kết nối cuộc gọi và tăng thời lượng đàm thoại', () => {
    useCallStore.getState().connectCall()
    expect(useCallStore.getState().status).toBe('connected')

    useCallStore.getState().tickDuration()
    useCallStore.getState().tickDuration()
    expect(useCallStore.getState().durationSec).toBe(2)
  })

  it('chuyển đổi mute và hold', () => {
    useCallStore.getState().toggleMute()
    expect(useCallStore.getState().isMuted).toBe(true)

    useCallStore.getState().toggleHold()
    expect(useCallStore.getState().isHeld).toBe(true)
    expect(useCallStore.getState().status).toBe('paused')

    // Bỏ hold -> quay lại connected
    useCallStore.getState().toggleHold()
    expect(useCallStore.getState().isHeld).toBe(false)
    expect(useCallStore.getState().status).toBe('connected')
  })

  it('kết thúc cuộc gọi và reset trạng thái', () => {
    useCallStore.getState().startCall({
      customerName: 'Khách hàng',
      phoneMasked: '09******11',
    })
    useCallStore.getState().endCall()
    expect(useCallStore.getState().status).toBe('ended')

    useCallStore.getState().resetCall()
    expect(useCallStore.getState().status).toBe('idle')
    expect(useCallStore.getState().caller).toBeNull()
  })
})

