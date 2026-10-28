import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagination } from './usePagination'

describe('usePagination Hook Tests', () => {
  it('khởi tạo với giá trị mặc định page=1 và pageSize=10', () => {
    const { result } = renderHook(() => usePagination())
    expect(result.current.page).toBe(1)
    expect(result.current.pageSize).toBe(10)
  })

  it('tính toán toStartLength chính xác cho Offset-based APIs (API 09, 10a, 11b)', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 3, initialPageSize: 15 }),
    )

    // Trang 3, mỗi trang 15 bản ghi -> start = (3 - 1) * 15 = 30, length = 15
    expect(result.current.toStartLength()).toEqual({
      start: 30,
      length: 15,
    })
  })

  it('tính toán toPagePageSize chính xác cho Page-based APIs (API 19a, 20)', () => {
    const { result } = renderHook(() =>
      usePagination({ initialPage: 4, initialPageSize: 20 }),
    )

    expect(result.current.toPagePageSize()).toEqual({
      page: 4,
      page_size: 20,
    })
  })

  it('chặn hoàn toàn số âm: page tối thiểu luôn là 1', () => {
    const { result } = renderHook(() => usePagination({ initialPage: -5 }))
    expect(result.current.page).toBe(1)
    expect(result.current.toStartLength().start).toBe(0)
  })

  it('hàm setPage và resetPage hoạt động đúng', () => {
    const { result } = renderHook(() => usePagination({ initialPage: 1 }))

    act(() => {
      result.current.setPage(5)
    })
    expect(result.current.page).toBe(5)

    act(() => {
      result.current.resetPage()
    })
    expect(result.current.page).toBe(1)
  })

  it('tự động reset về trang 1 khi resetDeps thay đổi (người dùng đổi filter)', () => {
    let searchKeyword = 'lọc nước'

    const { result, rerender } = renderHook(
      ({ keyword }) =>
        usePagination({
          initialPage: 4,
          resetDeps: [keyword],
        }),
      { initialProps: { keyword: searchKeyword } },
    )

    expect(result.current.page).toBe(4)

    // Người dùng gõ từ khóa mới
    searchKeyword = 'thay lõi'
    rerender({ keyword: searchKeyword })

    // Hook phải tự động reset về trang 1
    expect(result.current.page).toBe(1)
  })
})

