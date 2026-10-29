/**
 * Định nghĩa Entity và DTO Types chuẩn xác theo tài liệu API_TELESALE_APP.md
 */

// 1. Phản hồi chuẩn từ API ERP
export interface ApiResponse<T = any> {
  result: T | null
  success: boolean
  error: string | null
}

export interface ApiPaginatedResult<T> {
  items: T[]
  total: number
}

// 2. Danh mục Enums hệ thống
export interface EnumItem {
  code: string
  label: string
  price?: number
  group?: string
  description?: string
}

export interface OrgEnumItem {
  id: number
  name: string
}

export interface DeniedReasonNode {
  code: string
  label: string
  input?: 'text' | null
  children?: DeniedReasonNode[]
}

export interface EnumsCatalog {
  order_status?: EnumItem[]
  lui_huy_type?: EnumItem[]
  call_status?: EnumItem[]
  call_direction?: EnumItem[]
  call_result?: EnumItem[]
  care_result?: EnumItem[]
  customer_status?: EnumItem[]
  denied_reason?: DeniedReasonNode[]
  pain_point?: EnumItem[]
  services?: EnumItem[]
  do_can_mang?: EnumItem[]
  more_request?: EnumItem[]
  machine_problem?: EnumItem[]
  huy_note?: EnumItem[]
  tra_ve_note?: EnumItem[]
  phong_ban?: OrgEnumItem[]
  bo_phan?: OrgEnumItem[]
  to?: OrgEnumItem[]
}

// 3. Khách hàng & Leads tiềm năng
export type CustomerStatusType = 'new' | 'no_answer' | 'potential' | 'invalid'
export type CareStatusType = 'callback' | 'scheduled' | 'no_need' | 'unreachable'

export interface CustomerMemberDto {
  member_id: number
  name: string
  phone_masked: string
  relationship?: string
}

export interface CustomerAudioRecordDto {
  recording_id: number
  call_id: number
  at: string
  url: string
}

export interface CustomerImageDto {
  image_id: number
  type: 'image' | 'video'
  flow?: string
  url: string
  note?: string
  upload_by?: string
  created_at: string
}

export interface CustomerDto {
  customer_id: number
  customer_code: string
  customer_name: string
  phone_masked: string
  district?: string
  province?: string
  customer_status: CustomerStatusType
  care_status?: CareStatusType | null
  last_contact_at?: string
  next_care_at?: string
  user_id?: number
}

export interface CustomerDetailDto extends CustomerDto {
  dia_chi?: string
  machine_model?: string
  last_filter_change_at?: string
  needs?: string
  customer_status_reason?: string | null
  note?: string
  members?: CustomerMemberDto[]
  record?: CustomerAudioRecordDto[]
  list_images?: CustomerImageDto[]
}

export interface CustomerHistoryDto {
  history_type: 'call' | 'care' | 'service'
  at: string
  user_name?: string | null
  result?: string | null
  note?: string | null
  ord_code?: string | null
}

// 4. Đơn hàng & Slot hẹn chi nhánh
export interface OrderDto {
  order_id: number
  created_at: string
  ord_code: string
  nvkd_id: number
  customer_id: number
  ten_khach_hang: string
  sdt_masked: string
  dia_chi: string
  status: string
  trang_thai: string
  doanh_so: number
  goi_dich_vu: string
  ngay_hen_khach: string
  gio_hen_khach: string
  sale_checked: boolean
  loai_may?: string
  machine_problem?: string
  description?: string
  branch_id?: number
  chi_nhanh?: string
  ten_ktv?: string
}

export interface BranchSlotDto {
  branch_id: number
  date: string
  day_of_week: string
  slot_id: number
  slot_time: string
  to_time: string
  available: number
  count_orders: number
  con_trong: number
  is_expired: boolean
  is_inactive: boolean
}

export interface OrderLuiHuyLogDto {
  order_id: number
  order_code: string
  nvkd_id: number
  nvkd_name: string
  action: 'lui' | 'huy' | 'tra_ve' | 'sai_may'
  action_text: string
  tra_ve_note?: string
  huy_note?: string
  before_log_time?: string
  after_log_time?: string
  created_at: string
}

// 5. Telesale & Cuộc gọi (Campaigns, Next Customer, Calls, Call Result)
export interface CampaignDto {
  campaign_id: number
  name: string
  branch_id: number
  branch_name: string
}

export interface CampaignsResponse {
  items: CampaignDto[]
  total: number
  default_call_mode?: 'kho_ca_nhan' | 'chien_dich'
}

export interface NextCustomerDto {
  customer_id: number
  cus_campaign_id: number
  customer_code: string
  customer_name: string
  masked_address: string
  lock_info: boolean
  lock_info_reason?: string | null
  members: CustomerMemberDto[]
}

export interface DialCallResponse {
  customer_id: number
  member_id: number
  member_name: string
  phone_masked: string
  dial_number: string
}

export type CallResultOutcome =
  | 'potential'
  | 'callback'
  | 'no_answer'
  | 'not_interested'
  | 'wrong_number'
  | 'closed'

export interface SaveCallResultPayload {
  result: CallResultOutcome
  note?: string
  callback_at?: string
  denied_note?: string
  sub_denied_note?: string
  sub_sub_denied_note?: string
  pain_point?: string

  // Các trường khi chốt đơn (closed)
  ngay_hen_khach?: string
  slot_id?: number
  gio_hen_khach?: string
  branch_id?: number
  services?: string[]
  do_can_mang?: string[]
  working_with?: string
  other_working_with?: string
  gio_co_nha_from?: string
  gio_co_nha_to?: string
  more_request?: string
  other_more_request?: string
  machine_problem?: string
  other_machine_problem?: string
  /** Khóa chống trùng lặp đơn hàng khi kết quả là 'closed' (Header Idempotency-Key) */
  idempotencyKey?: string
}

export interface SaveCallResultResponse {
  care_log_id: number
  customer_id: number
  result: string
  customer_status: string
  care_status: string
  next_care_at: string | null
  last_contact_at: string
  order_id?: number
  ord_code?: string
  gio_hen?: string
}

// 6. Báo cáo & Chấm công hiệu suất
export interface AttendanceDto {
  user_id: number
  ma_nhanvien: string
  ten_nhanvien: string
  ngay_cham: string
  gio_vao1?: string
  gio_ra1?: string
  gio_vao2?: string
  gio_ra2?: string
  status?: string
}

export interface CallLogDto {
  call_id: number
  user_id: number
  user_name: string
  customer_id: number
  customer_code: string
  customer_name: string
  customer_address: string
  phone_masked: string
  call_date_time_start: string
  call_date_time_end: string
  bill_sec: number
  is_connected: boolean
  record?: string | null
  call_status: 'answer' | 'no_answer'
  direction: 'outgoing' | 'incoming'
  description?: string
}

export interface DailyResultDto {
  user_id: number
  user_name: string
  tong_total_call: number
  tong_call_answer: number
  tong_giu_lai_cs: number
  tong_hen_goi_lai: number
  tong_da_chot: number
  tong_don_tra_ve: number
  tong_don_da_xac_nhan: number
  tong_tg_dam_thoai: number // tính theo phút
  tong_kh_tiem_nang?: number
  doanh_so?: number
  date?: string
  ngay?: string
}

// 7. Thông báo hệ thống (API 06 & 07)
export interface AppNotification {
  id: number | string
  title: string
  content: string
  is_read: boolean
  created_at: string
  type?: 'order' | 'call' | 'customer' | 'system'
  target_page?: 'orders' | 'telesale' | 'leads' | 'reports' | 'dashboard' | 'training' | 'chat' | 'settings'
  target_id?: number | string
}

// 8. Tin nhắn Chat & Đính kèm đa phương tiện (API 35–42)
export type ChatMessageType = 'text' | 'image' | 'document' | 'audio' | 'video'

export interface ChatMessageItem {
  id: string | number
  sender_name: string
  is_outgoing: boolean
  type: ChatMessageType
  content?: string
  file_url?: string
  file_name?: string
  file_size?: number
  created_at: string
}
