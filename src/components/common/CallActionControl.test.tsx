import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { CallActionControl } from './CallActionControl'
import { useCallStore } from '../../store/useCallStore'

// Mock useMakeCall hook
const mockMakeCall = vi.fn()
const mockEndCall = vi.fn()
const mockToggleMute = vi.fn()
const mockToggleHold = vi.fn()

vi.mock('../../hooks/useMakeCall', () => ({
  useMakeCall: () => ({
    makeCall: mockMakeCall,
    endCall: mockEndCall,
    toggleMute: mockToggleMute,
    toggleHold: mockToggleHold,
    isDialing: false,
    callStatus: useCallStore.getState().status,
    isCallActive:
      useCallStore.getState().status === 'calling' ||
      useCallStore.getState().status === 'connected' ||
      useCallStore.getState().status === 'paused',
    isMuted: useCallStore.getState().isMuted,
    isHeld: useCallStore.getState().isHeld,
    activeCaller: useCallStore.getState().caller,
  }),
}))

describe('CallActionControl', () => {
  it('hiển thị nút gọi tiêu chuẩn khi không có cuộc gọi', () => {
    useCallStore.getState().resetCall()

    render(
      <CallActionControl
        customerId={101}
        customerName="Nguyễn Văn A"
        buttonText="Gọi xác nhận"
      />,
    )

    const button = screen.getByRole('button', { name: /Gọi xác nhận/i })
    expect(button).toBeDefined()
  })

  it('kích hoạt onCallStarted và makeCall khi bấm nút gọi', () => {
    useCallStore.getState().resetCall()
    const onCallStarted = vi.fn()

    render(
      <CallActionControl
        customerId={101}
        customerName="Nguyễn Văn A"
        buttonText="Gọi xác nhận"
        onCallStarted={onCallStarted}
      />,
    )

    const button = screen.getByRole('button', { name: /Gọi xác nhận/i })
    fireEvent.click(button)

    expect(onCallStarted).toHaveBeenCalledTimes(1)
    expect(mockMakeCall).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 101,
        customerName: 'Nguyễn Văn A',
      }),
    )
  })

  it('chuyển đổi thành cụm điều khiển in-place khi cuộc gọi kết nối', () => {
    useCallStore.getState().startCall({
      customerId: 101,
      customerName: 'Nguyễn Văn A',
      phoneMasked: '09******66',
    })
    useCallStore.getState().connectCall()

    render(
      <CallActionControl
        customerId={101}
        customerName="Nguyễn Văn A"
      />,
    )

    expect(screen.getByText(/Đang đàm thoại/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /Tắt mic/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Giữ máy/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /Kết thúc/i })).toBeDefined()
  })
})

