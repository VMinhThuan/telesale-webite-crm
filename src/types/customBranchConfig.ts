import { ErpSource } from './api'

export interface CustomBranchItem {
  id: string // UUID duy nhất của cấu hình
  campaign_id?: number // ID chiến dịch (nếu có, mặc định là branch_id)
  name?: string // Tên chiến dịch hiển thị trên dropdown (VD: "Bình Dương (Dĩ An)"). Fallback sang branch_name nếu trống
  branch_id: number // ID chi nhánh thực tế trên hệ thống ERP (VD: 104)
  branch_name: string // Tên chi nhánh hiển thị ở Cột 1 và Cột 3 (VD: "Dĩ An")
  source_erp: ErpSource // Nguồn hệ thống: 'locnuoc365' | 'zomzem'
  is_active: boolean // Trạng thái kích hoạt (true: hiển thị cho telesale, false: ẩn)
  updatedAt?: string
  updatedBy?: string
}

export interface CustomBranchConfigFile {
  version: string
  updatedAt: string
  updatedBy?: string
  branches: CustomBranchItem[]
}

export const defaultCustomBranchConfig: CustomBranchConfigFile = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  branches: [],
}
