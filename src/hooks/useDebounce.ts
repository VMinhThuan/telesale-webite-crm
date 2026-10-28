import { useEffect, useState } from 'react'

/**
 * Hook trì hoãn cập nhật giá trị (Debounce) giúp chống spam API khi người dùng gõ tìm kiếm
 * @param value Giá trị đầu vào
 * @param delayMs Thời gian chờ sau lần gõ cuối (mặc định 400ms)
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debouncedValue
}

export default useDebounce
