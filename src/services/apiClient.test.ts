import { describe, expect, it } from 'vitest'
import { generateIdempotencyKey } from './apiClient'

describe('ApiClient & Idempotency Key Tests', () => {
  it('sinh key luôn bắt đầu với tiền tố sf_', () => {
    const key = generateIdempotencyKey()
    expect(key.startsWith('sf_')).toBe(true)
  })

  it('hai lần gọi liên tiếp luôn sinh ra 2 key duy nhất khác nhau', () => {
    const key1 = generateIdempotencyKey()
    const key2 = generateIdempotencyKey()
    expect(key1).not.toBe(key2)
  })

  it('sinh 100 key ngẫu nhiên không có sự trùng lặp (Zero Collisions)', () => {
    const keys = new Set<string>()
    for (let i = 0; i < 100; i++) {
      keys.add(generateIdempotencyKey())
    }
    expect(keys.size).toBe(100)
  })
})

