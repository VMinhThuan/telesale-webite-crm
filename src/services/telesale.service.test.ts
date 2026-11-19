import { beforeEach, describe, expect, it, vi } from 'vitest'
import { telesaleService } from './telesale.service'
import apiClient, { apiClientZomzem } from './apiClient'
import customBranchConfigService from './customBranchConfig.service'

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

vi.mock('./customBranchConfig.service', () => ({
  default: {
    getConfig: vi.fn(),
  },
}))

describe('telesaleService.getCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gộp chiến dịch từ LocNuoc365, Zomzem và các chi nhánh bổ sung active của Admin', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      result: {
        items: [
          { campaign_id: 1, name: 'Hà Nội', branch_id: 3, branch_name: 'Chi Nhánh Đại Kim' },
        ],
      },
    })
    vi.mocked(apiClientZomzem.get).mockResolvedValueOnce({
      result: {
        items: [
          { campaign_id: 2, name: 'Sài Gòn', branch_id: 20, branch_name: 'Chi Nhánh Q1' },
        ],
      },
    })
    vi.mocked(customBranchConfigService.getConfig).mockResolvedValueOnce({
      version: '1.0',
      updatedAt: '2026-11-20T00:00:00Z',
      branches: [
        {
          id: 'b-104',
          name: 'Lào Xao',
          branch_id: 104,
          branch_name: 'An Phước',
          source_erp: 'locnuoc365',
          is_active: true,
        },
        {
          id: 'b-999',
          name: 'Tạm ẩn',
          branch_id: 999,
          branch_name: 'Chi Nhánh Ẩn',
          source_erp: 'locnuoc365',
          is_active: false,
        },
      ],
    })

    const res = await telesaleService.getCampaigns()

    expect(res.items).toHaveLength(3)
    // 1. LocNuoc365 item
    expect(res.items[0]).toEqual({
      campaign_id: 1,
      name: 'Hà Nội',
      branch_id: 3,
      branch_name: 'Chi Nhánh Đại Kim',
      source_erp: 'locnuoc365',
      is_custom: false,
    })
    // 2. Zomzem item
    expect(res.items[1]).toEqual({
      campaign_id: 2,
      name: 'Sài Gòn',
      branch_id: 20,
      branch_name: 'Chi Nhánh Q1',
      source_erp: 'zomzem',
      is_custom: false,
    })
    // 3. Active Custom Branch (b-104)
    expect(res.items[2]).toEqual({
      campaign_id: 104,
      name: 'Lào Xao',
      branch_id: 104,
      branch_name: 'An Phước',
      source_erp: 'locnuoc365',
      is_custom: true,
    })
  })

  it('không thêm trùng chi nhánh nếu branch_id và source_erp đã tồn tại trong API campaigns', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      result: {
        items: [
          { campaign_id: 1, name: 'Hà Nội', branch_id: 3, branch_name: 'Chi Nhánh Đại Kim' },
        ],
      },
    })
    vi.mocked(apiClientZomzem.get).mockResolvedValueOnce({
      result: { items: [] },
    })
    vi.mocked(customBranchConfigService.getConfig).mockResolvedValueOnce({
      version: '1.0',
      updatedAt: '2026-11-20T00:00:00Z',
      branches: [
        {
          id: 'b-dup',
          name: 'Đại Kim duplicate',
          branch_id: 3,
          branch_name: 'Chi Nhánh Đại Kim',
          source_erp: 'locnuoc365',
          is_active: true,
        },
      ],
    })

    const res = await telesaleService.getCampaigns()
    expect(res.items).toHaveLength(1)
    expect(res.items[0].branch_id).toBe(3)
    expect(res.items[0].is_custom).toBe(false)
  })
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
