import { beforeEach, describe, expect, it, vi } from 'vitest'
import userRoleConfigService from './userRoleConfig.service'
import { defaultUserRolesConfig, UserRolesConfigFile } from '../types/userRoleConfig'

describe('UserRoleConfigService Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('getConfig: trả về dữ liệu chuẩn từ CDN fetch khi response thành công', async () => {
    const mockData: UserRolesConfigFile = {
      version: '1.0',
      updatedAt: '2026-11-18T00:00:00.000Z',
      updatedBy: 'admin',
      users: {
        '0385337846': {
          username: '0385337846',
          name: 'Đặng Thị Hoa',
          role_type: 'sale_congty',
        },
        '0987111222': {
          username: '0987111222',
          name: 'Nguyễn Văn CTV',
          role_type: 'sale_ctv',
        },
      },
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    } as any)

    const result = await userRoleConfigService.getConfig()
    expect(result.users['0385337846'].role_type).toBe('sale_congty')
    expect(result.users['0987111222'].role_type).toBe('sale_ctv')
  })

  it('getConfig: fallback về default khi CDN và S3 gặp sự cố', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))
    vi.spyOn(userRoleConfigService as any, 'getLatestConfigFromStorage').mockResolvedValueOnce(defaultUserRolesConfig)

    const result = await userRoleConfigService.getConfig()
    expect(result.version).toBe('1.0')
    expect(result.users).toEqual({})
  })
})
