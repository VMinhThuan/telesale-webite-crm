import { useCallback, useEffect, useRef, useState } from 'react'

export interface UsePaginationOptions {
  /** Trang bắt đầu (mặc định 1) */
  initialPage?: number
  /** Kích thước trang mặc định (mặc định 10) */
  initialPageSize?: number
  /**
   * Danh sách dependencies (VD: [searchQuery, filterTab, status]).
   * Khi bất kỳ giá trị nào trong mảng này thay đổi, trang sẽ tự động reset về 1 để tránh kẹt trang rỗng.
   */
  resetDeps?: unknown[]
}

export interface UsePaginationReturn {
  /** Chỉ số trang hiện tại (bắt đầu từ 1) */
  page: number
  /** Số lượng bản ghi trên một trang */
  pageSize: number
  /** Cập nhật số trang */
  setPage: (newPage: number | ((prev: number) => number)) => void
  /** Cập nhật kích thước trang */
  setPageSize: (newSize: number | ((prev: number) => number)) => void
  /** Đưa trang về 1 */
  resetPage: () => void
  /**
   * Chuyển đổi sang format Offset-based (start / length)
   * Phù hợp cho các API: 09 (attendance), 10a (call-logs), 10b (daily-results), 11b (orders), 11c (order-logs)
   */
  toStartLength: (customPage?: number, customLength?: number) => { start: number; length: number }
  /**
   * Chuyển đổi sang format Page-based (page / page_size)
   * Phù hợp cho các API: 19a (customers), 20 (customer history)
   */
  toPagePageSize: (customPage?: number, customSize?: number) => { page: number; page_size: number }
  /**
   * Bộ thuộc tính gắn trực tiếp vào component <Pagination />
   * Giúp code giao diện ngắn gọn: <Pagination {...paginationProps} total={total} />
   */
  paginationProps: {
    page: number
    pageSize: number
    onChange: (newPage: number) => void
  }
}

/**
 * Hook trừu tượng hóa (abstract) và chuẩn hóa 2 format phân trang khác nhau của Backend ERP.
 * Hỗ trợ chuyển đổi tự động giữa {start, length} và {page, page_size}, đồng thời tự động
 * đưa trang về 1 khi người dùng đổi bộ lọc tìm kiếm (tránh lỗi kẹt trang rỗng).
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 10, resetDeps } = options

  const [page, setPage] = useState<number>(() => Math.max(1, initialPage))
  const [pageSize, setPageSize] = useState<number>(() => Math.max(1, initialPageSize))

  // Đánh dấu lần render đầu tiên để tránh trigger reset dư thừa khi mount
  const isMountedRef = useRef(false)

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }

    if (resetDeps && resetDeps.length > 0) {
      setPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps || [])

  // Chuyển đổi Offset-based: start = (page - 1) * length, length = pageSize
  const toStartLength = useCallback(
    (customPage?: number, customLength?: number) => {
      const activePage = Math.max(1, customPage ?? page)
      const activeLength = Math.max(1, customLength ?? pageSize)
      return {
        start: (activePage - 1) * activeLength,
        length: activeLength,
      }
    },
    [page, pageSize],
  )

  // Chuyển đổi Page-based: page, page_size
  const toPagePageSize = useCallback(
    (customPage?: number, customSize?: number) => {
      return {
        page: Math.max(1, customPage ?? page),
        page_size: Math.max(1, customSize ?? pageSize),
      }
    },
    [page, pageSize],
  )

  const handlePageChange = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPage: () => setPage(1),
    toStartLength,
    toPagePageSize,
    paginationProps: {
      page,
      pageSize,
      onChange: handlePageChange,
    },
  }
}

export default usePagination

