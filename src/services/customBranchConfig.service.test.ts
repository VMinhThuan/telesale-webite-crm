import { beforeEach, describe, expect, it, vi } from 'vitest'
import customBranchConfigService from './customBranchConfig.service'
import {
  CustomBranchConfigFile,
  defaultCustomBranchConfig,
} from '../types/customBranchConfig'

describe('CustomBranchConfigService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('getConfig: trả về dữ liệu chuẩn từ CDN fetch khi response thành công', async () => {
    const mockData: CustomBranchConfigFile = {
      version: '1.0',
      updatedAt: '2026-11-19T00:00:00.000Z',
      updatedBy: 'admin',
      branches: [
        {
          id: 'b-1',
          name: 'Bình Dương (Dĩ An)',
          branch_id: 104,
          branch_name: 'Dĩ An',
          source_erp: 'zomzem',
          is_active: true,
        },
      ],
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any)

    const result = await customBranchConfigService.getConfig()
    expect(result.branches).toHaveLength(1)
    expect(result.branches[0].name).toBe('Bình Dương (Dĩ An)')
    expect(result.branches[0].branch_name).toBe('Dĩ An')
    expect(result.branches[0].branch_id).toBe(104)
  })

  it('getConfig: trả về fallback ngay khi CDN phản hồi 404 mà không cần gọi S3 GetObject', async () => {
    const s3Spy = vi.spyOn(customBranchConfigService as any, 'getLatestConfigFromStorage')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as any)

    const result = await customBranchConfigService.getConfig()
    expect(result).toEqual(defaultCustomBranchConfig)
    expect(s3Spy).not.toHaveBeenCalled()
  })

  it('getConfig: fallback về default khi CDN và S3 gặp sự cố', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    vi.spyOn(
      customBranchConfigService as any,
      'getLatestConfigFromStorage',
    ).mockResolvedValueOnce(defaultCustomBranchConfig)

    const result = await customBranchConfigService.getConfig()
    expect(result.version).toBe('1.0')
    expect(result.branches).toEqual([])
  })
})
