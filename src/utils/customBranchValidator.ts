import { CampaignDto, ErpSource } from '../types/api'
import { CustomBranchItem } from '../types/customBranchConfig'

export interface BranchValidationResult {
  isValid: boolean
  errorMessage?: string
  conflictType?: 'invalid_input' | 'campaign' | 'custom_branch'
  conflictCampaign?: CampaignDto
  conflictCustomBranch?: CustomBranchItem
}

/**
 * Kiểm tra tính hợp lệ và chống trùng lặp branch_id theo nguồn ERP
 */
export function validateBranchIdDuplicate({
  inputBranchId,
  inputSourceErp,
  campaigns = [],
  existingCustomBranches = [],
  currentEditingId,
}: {
  inputBranchId: number | string
  inputSourceErp: ErpSource
  campaigns?: CampaignDto[]
  existingCustomBranches?: CustomBranchItem[]
  currentEditingId?: string
}): BranchValidationResult {
  const numericBranchId = Number(inputBranchId)
  if (!numericBranchId || isNaN(numericBranchId) || numericBranchId <= 0) {
    return {
      isValid: false,
      conflictType: 'invalid_input',
      errorMessage: 'Mã chi nhánh (branch_id) phải là số nguyên dương lớn hơn 0.',
    }
  }

  const sourceLabel = inputSourceErp === 'zomzem' ? 'Zomzem' : 'Lọc Nước 365'

  // 1. Kiểm tra trùng lặp với danh sách chiến dịch đang có của cùng nguồn ERP
  const dupCampaign = campaigns.find(
    (c) =>
      Number(c.branch_id) === numericBranchId &&
      (c.source_erp || 'locnuoc365') === inputSourceErp,
  )

  if (dupCampaign) {
    return {
      isValid: false,
      conflictType: 'campaign',
      conflictCampaign: dupCampaign,
      errorMessage: `Chi nhánh ID #${numericBranchId} đã tồn tại trong chiến dịch "${dupCampaign.name}" (${dupCampaign.branch_name || 'Chi nhánh'}) của nguồn ${sourceLabel}. Vui lòng không nhập trùng.`,
    }
  }

  // 2. Kiểm tra trùng lặp với các chi nhánh bổ sung khác trong cùng nguồn ERP
  const dupCustom = existingCustomBranches.find(
    (b) =>
      b.id !== currentEditingId &&
      Number(b.branch_id) === numericBranchId &&
      b.source_erp === inputSourceErp,
  )

  if (dupCustom) {
    return {
      isValid: false,
      conflictType: 'custom_branch',
      conflictCustomBranch: dupCustom,
      errorMessage: `Chi nhánh ID #${numericBranchId} đã có trong danh sách chi nhánh bổ sung ("${dupCustom.branch_name}") của nguồn ${sourceLabel}.`,
    }
  }

  return { isValid: true }
}
