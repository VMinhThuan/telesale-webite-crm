export type PageType =
  | 'dashboard'
  | 'telesale'
  | 'leads'
  | 'orders'
  | 'training'
  | 'reports'
  | 'chat'
  | 'settings'

export type PeriodType = 'Hôm nay' | '7 ngày gần nhất' | 'Tháng 09/2025' | 'Tháng 10/2025'

export interface NotificationItem {
  id: number
  title: string
  detail: string
  page: PageType
}

export interface SummaryCardItem {
  label: string
  value: string
  change: string
  icon: any
  tone: 'blue' | 'teal' | 'rose' | 'amber' | 'green'
}

export interface ChartPoint {
  date: string
  value: number
}

export interface PeriodData {
  commission: string
  orders: string
  returned: string
  avg: string
  calls: string
  connections: string
  leads: string
  closed: string
  work: string
  chart: ChartPoint[]
  rows: string[][]
}

export interface LeadItem {
  name: string
  phone: string
  last: string
  care: string
  status: string
  tone: string
}

export interface OrderItem {
  id: string
  customerName: string
  phone: string
  service: string
  appointment: string
  status: string
  tone: string
}

export interface TrainingItem {
  title: string
  desc: string
  icon: any
  meta: string
  type: string
  category: string
  tone: string
}

export interface StaffPerformance {
  name: string
  hours: number
  calls: number
  connected: number
  leads: number
  closed: number
  returned: number
  commission: number
}

export interface DialogState {
  title: string
  type: 'video' | 'document' | 'call'
}
