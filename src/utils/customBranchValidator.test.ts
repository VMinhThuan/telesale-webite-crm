import { describe, expect, it } from 'vitest'
import { validateBranchIdDuplicate } from './customBranchValidator'
import { CampaignDto } from '../types/api'
import { CustomBranchItem } from '../types/customBranchConfig'

describe('validateBranchIdDuplicate Unit Tests', () => {
  const mockCampaigns: CampaignDto[] = [
    {
      campaign_id: 666,
      name: 'HÀ NỘI',
      branch_id: 3,
      branch_name: 'Chi Nhánh Đại Kim',
      source_erp: 'locnuoc365',
    },
    {
      campaign_id: 716,
      name: 'BẮC GIANG',
      branch_id: 6,
      branch_name: 'Chi Nhánh Bắc Giang',
      source_erp: 'locnuoc365',
    },
    {
      campaign_id: 122,
      name: 'TP. Hồ Chí Minh',
      branch_id: 3,
      branch_name: 'Gò Vấp',
      source_erp: 'zomzem',
    },
  ]

  const mockCustomBranches: CustomBranchItem[] = [
    {
      id: 'custom-1',
      campaign_id: 674,
      name: 'Bình Dương (Dĩ An)',
      branch_id: 104,
      branch_name: 'Chi nhánh Dĩ An',
      source_erp: 'zomzem',
      is_active: true,
    },
  ]

  it('báo lỗi khi branch_id không phải số nguyên dương', () => {
    const res1 = validateBranchIdDuplicate({
      inputBranchId: 0,
      inputSourceErp: 'locnuoc365',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res1.isValid).toBe(false)
    expect(res1.conflictType).toBe('invalid_input')

    const res2 = validateBranchIdDuplicate({
      inputBranchId: 'abc',
      inputSourceErp: 'locnuoc365',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res2.isValid).toBe(false)
  })

  it('báo lỗi khi branch_id trùng với chiến dịch của cùng nguồn locnuoc365', () => {
    const res = validateBranchIdDuplicate({
      inputBranchId: 3,
      inputSourceErp: 'locnuoc365',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res.isValid).toBe(false)
    expect(res.conflictType).toBe('campaign')
    expect(res.errorMessage).toContain('Chi nhánh ID #3 đã tồn tại trong chiến dịch "HÀ NỘI"')
  })

  it('cho phép branch_id trùng số nhưng khác nguồn ERP (ví dụ branch_id 6 ở zomzem trong khi locnuoc365 có 6)', () => {
    const res = validateBranchIdDuplicate({
      inputBranchId: 6,
      inputSourceErp: 'zomzem', // branch 6 chỉ có ở locnuoc365, không có ở zomzem
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res.isValid).toBe(true)
    expect(res.errorMessage).toBeUndefined()
  })

  it('báo lỗi khi branch_id trùng với chi nhánh bổ sung đã có trong cùng nguồn', () => {
    const res = validateBranchIdDuplicate({
      inputBranchId: 104,
      inputSourceErp: 'zomzem',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res.isValid).toBe(false)
    expect(res.conflictType).toBe('custom_branch')
    expect(res.errorMessage).toContain('Chi nhánh ID #104 đã có trong danh sách chi nhánh bổ sung ("Chi nhánh Dĩ An")')
  })

  it('cho phép giữ nguyên branch_id khi đang chỉnh sửa chính chi nhánh đó (currentEditingId trùng id)', () => {
    const res = validateBranchIdDuplicate({
      inputBranchId: 104,
      inputSourceErp: 'zomzem',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
      currentEditingId: 'custom-1', // Đang sửa chính nó
    })
    expect(res.isValid).toBe(true)
  })

  it('cho phép khi branch_id hoàn toàn mới và chưa tồn tại ở bất kỳ đâu', () => {
    const res = validateBranchIdDuplicate({
      inputBranchId: 999,
      inputSourceErp: 'locnuoc365',
      campaigns: mockCampaigns,
      existingCustomBranches: mockCustomBranches,
    })
    expect(res.isValid).toBe(true)
    expect(res.errorMessage).toBeUndefined()
  })
})
