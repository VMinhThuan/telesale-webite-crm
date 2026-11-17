import { describe, expect, it } from 'vitest'
import { checkCanViewCommission } from './useUserRoleConfig'
import { UserRolesConfigFile } from '../types/userRoleConfig'

describe('checkCanViewCommission unit tests', () => {
  const mockConfig: UserRolesConfigFile = {
    version: '1.0',
    updatedAt: '2026-11-18T00:00:00.000Z',
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

  it('Admin luôn có quyền xem hoa hồng', () => {
    const adminUser = {
      username: 'admin',
      phan_quyen: 'admin',
    }
    expect(checkCanViewCommission(adminUser, mockConfig)).toBe(true)
  })

  it('Sale CTV cấu hình trên Cloudflare R2 được hiển thị hoa hồng', () => {
    const ctvUser = {
      username: '0987111222',
      phan_quyen: 'nhan_vien',
      chuc_vu: 'Nhân viên',
    }
    expect(checkCanViewCommission(ctvUser, mockConfig)).toBe(true)
  })

  it('Sale Công ty cấu hình trên Cloudflare R2 bị ẩn hoa hồng', () => {
    const congtyUser = {
      username: '0385337846',
      phan_quyen: 'nhan_vien',
      chuc_vu: 'Nhân viên',
    }
    expect(checkCanViewCommission(congtyUser, mockConfig)).toBe(false)
  })

  it('Nhân viên mới chưa được cấu hình: Mặc định là ẩn hoa hồng (Default-Deny)', () => {
    const newUser = {
      username: '0999888777',
      phan_quyen: 'nhan_vien',
      chuc_vu: 'Nhân viên',
      loaiNv: 'nvkd',
    }
    expect(checkCanViewCommission(newUser, mockConfig)).toBe(false)
  })

  it('Cờ tính năng hoa_hong từ Backend được ưu tiên nếu có', () => {
    const userWithFeature = {
      username: '0385337846', // trên R2 là sale_congty
      features: {
        hoa_hong: true,
      },
    }
    expect(checkCanViewCommission(userWithFeature, mockConfig)).toBe(true)
  })
})
