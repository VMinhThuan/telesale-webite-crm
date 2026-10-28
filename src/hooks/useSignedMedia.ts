import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseSignedMediaOptions {
  /** Hàm bất đồng bộ gọi lại API nguồn để lấy Signed URL mới khi link hiện tại gặp lỗi 403 / hết hạn */
  onRefreshUrl?: () => Promise<string | null | undefined>
  /** Số lần tự động thử lại tối đa trước khi dừng để chống DDoS/Infinite loop (mặc định: 2) */
  maxRetries?: number
  /** Tự động tiếp tục phát tại vị trí currentTime cũ sau khi có link mới (mặc định: true) */
  autoResume?: boolean
}

export interface UseSignedMediaReturn {
  /** Đường dẫn URL media hiện tại */
  mediaUrl: string | null
  /** Đang trong tiến trình gọi API lấy lại link mới ngầm */
  isRefreshing: boolean
  /** Cờ báo hiệu link hiện tại đã hết hạn (403) */
  isExpired: boolean
  /** Có lỗi xảy ra sau khi đã thử lại hết số lần cho phép */
  hasError: boolean
  /** Số lần đã tự động re-fetch */
  retryCount: number
  /** Handler gắn vào sự kiện onError của <audio> hoặc <video> */
  handleMediaError: (e: React.SyntheticEvent<HTMLMediaElement>) => void
  /** Handler gắn vào sự kiện onLoadedMetadata để khôi phục currentTime và resume playback */
  handleLoadedMetadata: (e: React.SyntheticEvent<HTMLMediaElement>) => void
  /** Cho phép người dùng bấm "Thử lại" thủ công */
  manualRetry: () => Promise<void>
}

/**
 * Hook quản lý vòng đời của Signed URL (link có hạn 15 phút) cho các thẻ HTML5 Audio / Video.
 * Tự động phát hiện lỗi 403 / MediaError, bảo lưu vị trí đang phát (currentTime),
 * re-fetch link mới từ API nguồn và tiếp tục phát mượt mà (seamless resume).
 */
export function useSignedMedia(
  initialUrl?: string | null,
  options: UseSignedMediaOptions = {},
): UseSignedMediaReturn {
  const { onRefreshUrl, maxRetries = 2, autoResume = true } = options

  const [mediaUrl, setMediaUrl] = useState<string | null>(initialUrl || null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Lưu trữ vị trí phát và trạng thái phát hiện tại
  const lastSavedTimeRef = useRef<number>(0)
  const wasPlayingRef = useRef<boolean>(false)
  const retryCountRef = useRef<number>(0)

  // Đồng bộ mediaUrl khi initialUrl từ component cha thay đổi
  useEffect(() => {
    if (initialUrl) {
      setMediaUrl(initialUrl)
      setIsExpired(false)
      setHasError(false)
      retryCountRef.current = 0
      setRetryCount(0)
    }
  }, [initialUrl])

  /**
   * Tiến hành gọi API nguồn để lấy Signed URL mới
   */
  const executeRefresh = useCallback(async () => {
    if (!onRefreshUrl) {
      setHasError(true)
      return
    }

    if (retryCountRef.current >= maxRetries) {
      setHasError(true)
      setIsRefreshing(false)
      return
    }

    setIsRefreshing(true)
    setIsExpired(true)

    try {
      const newUrl = await onRefreshUrl()
      if (newUrl && typeof newUrl === 'string') {
        setMediaUrl(newUrl)
        setHasError(false)
        setIsExpired(false)
        retryCountRef.current += 1
        setRetryCount(retryCountRef.current)
      } else {
        setHasError(true)
      }
    } catch {
      setHasError(true)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefreshUrl, maxRetries])

  /**
   * Xử lý sự kiện lỗi từ thẻ <audio> hoặc <video>
   */
  const handleMediaError = useCallback(
    (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const mediaEl = e.currentTarget
      if (mediaEl) {
        lastSavedTimeRef.current = mediaEl.currentTime || 0
        wasPlayingRef.current = !mediaEl.paused && !mediaEl.ended
      }

      // Nếu không có onRefreshUrl hoặc đã vượt quá số lần retry
      if (!onRefreshUrl || retryCountRef.current >= maxRetries) {
        setHasError(true)
        setIsRefreshing(false)
        return
      }

      executeRefresh()
    },
    [onRefreshUrl, maxRetries, executeRefresh],
  )

  /**
   * Khi media nạp xong metadata của URL mới: khôi phục currentTime & resume nếu trước đó đang phát
   */
  const handleLoadedMetadata = useCallback(
    (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const mediaEl = e.currentTarget
      if (!mediaEl) return

      if (lastSavedTimeRef.current > 0 && autoResume) {
        try {
          mediaEl.currentTime = lastSavedTimeRef.current
        } catch {
          // Bỏ qua nếu thời lượng không hợp lệ
        }
      }

      if (wasPlayingRef.current && autoResume) {
        mediaEl.play().catch(() => {
          // Trình duyệt có thể chặn autoplay nếu chưa có tương tác trực tiếp
        })
      }
    },
    [autoResume],
  )

  /**
   * Cho phép người dùng bấm nút "Làm mới / Thử lại" trên UI
   */
  const manualRetry = useCallback(async () => {
    setRetryCount(0)
    retryCountRef.current = 0
    setHasError(false)
    await executeRefresh()
  }, [executeRefresh])

  return {
    mediaUrl,
    isRefreshing,
    isExpired,
    hasError,
    retryCount,
    handleMediaError,
    handleLoadedMetadata,
    manualRetry,
  }
}

export default useSignedMedia
