export type SaleRoleType = 'sale_congty' | 'sale_ctv'

export interface UserRoleOverrideItem {
  username: string
  name?: string
  role_type: SaleRoleType
  department?: string
  chuc_vu?: string
  updatedAt?: string
  updatedBy?: string
}

export interface UserRolesConfigFile {
  version: string
  updatedAt: string
  updatedBy?: string
  users: Record<string, UserRoleOverrideItem> // key: username (số điện thoại đăng nhập)
}

export const defaultUserRolesConfig: UserRolesConfigFile = {
  version: '1.0',
  updatedAt: new Date().toISOString(),
  users: {},
}
