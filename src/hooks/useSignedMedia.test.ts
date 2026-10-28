import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignedMedia } from './useSignedMedia'

describe('useSignedMedia Custom Hook Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('khởi tạo với initialUrl hợp lệ', () => {
    const { result } = renderHook(() =>
      useSignedMedia('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=valid'),
    )

    expect(result.current.mediaUrl).toBe('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=valid')
    expect(result.current.isRefreshing).toBe(false)
    expect(result.current.isExpired).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.retryCount).toBe(0)
  })

  it('tự động gọi onRefreshUrl khi thẻ media bắn sự kiện onError (403 expired)', async () => {
    const refreshSpy = vi.fn().mockResolvedValue('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=new_token_123')

    const { result } = renderHook(() =>
      useSignedMedia('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=expired', {
        onRefreshUrl: refreshSpy,
        maxRetries: 2,
      }),
    )

    // Tạo mock event media error
    const fakeMedia = {
      currentTime: 45.5,
      paused: false,
      ended: false,
    } as any

    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })

    expect(refreshSpy).toHaveBeenCalledTimes(1)
    expect(result.current.mediaUrl).toBe('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=new_token_123')
    expect(result.current.isExpired).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.retryCount).toBe(1)
  })

  it('khôi phục currentTime và resume playback khi nạp xong metadata URL mới', async () => {
    const playMock = vi.fn().mockResolvedValue(undefined)
    const fakeMedia = {
      currentTime: 120,
      paused: false,
      ended: false,
      play: playMock,
    } as any

    const refreshSpy = vi.fn().mockResolvedValue('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=new')

    const { result } = renderHook(() =>
      useSignedMedia('https://s3.locnuoc365.xyz/recordings/call_1.mp3?token=expired', {
        onRefreshUrl: refreshSpy,
        autoResume: true,
      }),
    )

    // Gặp lỗi khi đang nghe ở giây 120
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })

    // Khi link mới nạp xong metadata
    act(() => {
      result.current.handleLoadedMetadata({ currentTarget: fakeMedia } as any)
    })

    expect(fakeMedia.currentTime).toBe(120)
    expect(playMock).toHaveBeenCalled()
  })

  it('chống Infinite Loop: dừng re-fetch và bật cờ hasError khi vượt quá maxRetries', async () => {
    // Luôn trả về link lỗi khiến onError tiếp tục kích hoạt
    const refreshSpy = vi.fn().mockResolvedValue('https://s3.locnuoc365.xyz/recordings/still_error.mp3')

    const { result } = renderHook(() =>
      useSignedMedia('https://s3.locnuoc365.xyz/recordings/init.mp3', {
        onRefreshUrl: refreshSpy,
        maxRetries: 2,
      }),
    )

    const fakeMedia = { currentTime: 0, paused: true, ended: false } as any

    // Lần lỗi 1
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })
    expect(result.current.retryCount).toBe(1)
    expect(result.current.hasError).toBe(false)

    // Lần lỗi 2
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })
    expect(result.current.retryCount).toBe(2)
    expect(result.current.hasError).toBe(false)

    // Lần lỗi 3: vượt quá maxRetries (2) -> phải chặn và set hasError = true
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })
    expect(refreshSpy).toHaveBeenCalledTimes(2) // không gọi thêm lần 3
    expect(result.current.hasError).toBe(true)
    expect(result.current.isRefreshing).toBe(false)
  })

  it('manualRetry cho phép người dùng bấm thử lại để reset cờ lỗi', async () => {
    const refreshSpy = vi.fn().mockResolvedValue('https://s3.locnuoc365.xyz/recordings/recovered.mp3')

    const { result } = renderHook(() =>
      useSignedMedia('https://s3.locnuoc365.xyz/recordings/expired.mp3', {
        onRefreshUrl: refreshSpy,
        maxRetries: 1,
      }),
    )

    const fakeMedia = { currentTime: 0, paused: true, ended: false } as any

    // Vượt quá maxRetries
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })
    await act(async () => {
      result.current.handleMediaError({ currentTarget: fakeMedia } as any)
    })
    expect(result.current.hasError).toBe(true)

    // Bấm nút thử lại
    await act(async () => {
      await result.current.manualRetry()
    })

    expect(result.current.hasError).toBe(false)
    expect(result.current.mediaUrl).toBe('https://s3.locnuoc365.xyz/recordings/recovered.mp3')
  })
})

