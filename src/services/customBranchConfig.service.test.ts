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

  it('saveBranchAddress: cập nhật địa chỉ theo compound key và lưu cấu hình', async () => {
    const mockConfig: CustomBranchConfigFile = {
      version: '1.0',
      updatedAt: '2026-11-20T00:00:00.000Z',
      branches: [],
      branchAddresses: {},
    }
    vi.spyOn(customBranchConfigService, 'getConfig').mockResolvedValueOnce(mockConfig)
    const saveSpy = vi.spyOn(customBranchConfigService, 'saveConfig').mockImplementation(async (cfg) => cfg)

    const result = await customBranchConfigService.saveBranchAddress(
      'locnuoc365_3',
      'Số 12 Đại Kim, Hoàng Mai, Hà Nội',
      'admin_test',
    )

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branchAddresses: {
          locnuoc365_3: 'Số 12 Đại Kim, Hoàng Mai, Hà Nội',
        },
      }),
      'admin_test',
    )
    expect(result.branchAddresses?.['locnuoc365_3']).toBe('Số 12 Đại Kim, Hoàng Mai, Hà Nội')
  })
})
