import { beforeEach, describe, expect, it, vi } from 'vitest'
import { telesaleService } from './telesale.service'
import apiClient from './apiClient'

vi.mock('./apiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./apiClient')>()
  return {
    ...actual,
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
    apiClientZomzem: {
      post: vi.fn(),
      get: vi.fn(),
    },
    getApiClient: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
    })),
  }
})

describe('telesaleService.getNextCustomer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bắt buộc ném AppApiError khi BE trả về success: false kèm thông báo lỗi (kể cả HTTP 200)', async () => {
    const { getApiClient } = await import('./apiClient')
    const mockPost = vi.fn().mockResolvedValue({
      result: null,
      success: false,
      error: 'Không có khách hàng nào để gọi',
    })
    ;(getApiClient as any).mockReturnValue({ post: mockPost })

    await expect(
      telesaleService.getNextCustomer({ campaign_id: 724, call_mode: 'chien_dich' }, 'locnuoc365'),
    ).rejects.toThrow('Không có khách hàng nào để gọi')
  })

  it('bắt buộc ném AppApiError khi BE trả về result: null', async () => {
    const { getApiClient } = await import('./apiClient')
    const mockPost = vi.fn().mockResolvedValue({
      result: null,
      success: true,
      error: null,
    })
    ;(getApiClient as any).mockReturnValue({ post: mockPost })

    await expect(
      telesaleService.getNextCustomer({ campaign_id: 724, call_mode: 'chien_dich' }, 'locnuoc365'),
    ).rejects.toThrow('Không có khách hàng nào để gọi')
  })

  it('trả về dữ liệu khách hàng hợp lệ kèm source_erp khi BE phản hồi thành công', async () => {
    const { getApiClient } = await import('./apiClient')
    const mockCustomer = {
      customer_id: 999,
      customer_name: 'Nguyễn Văn Test',
      phone_masked: '098*****88',
      members: [],
    }
    const mockPost = vi.fn().mockResolvedValue({
      result: mockCustomer,
      success: true,
      error: null,
    })
    ;(getApiClient as any).mockReturnValue({ post: mockPost })

    const res = await telesaleService.getNextCustomer(
      { campaign_id: 724, call_mode: 'chien_dich' },
      'locnuoc365',
    )

    expect(res).toBeDefined()
    expect(res.customer_id).toBe(999)
    expect(res.customer_name).toBe('Nguyễn Văn Test')
    expect(res.source_erp).toBe('locnuoc365')
  })
})
