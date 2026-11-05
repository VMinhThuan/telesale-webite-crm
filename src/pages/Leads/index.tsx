import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useCustomerDetail } from '../../hooks/useCustomers'
import { useCampaigns } from '../../hooks/useTelesale'
import { useAuthStore } from '../../store/useAuthStore'
import { DialogState } from '../../types'
import { LeadListPanel, CARE_STATUS_OPTIONS, DATE_PRESET_OPTIONS } from './components/LeadListPanel'
import { LeadTimelinePanel, HISTORY_TYPE_OPTIONS } from './components/LeadTimelinePanel'
import { LeadDetailAndCarePanel, careOutcomes } from './components/LeadDetailAndCarePanel'
import { LeadMediaPanel } from './components/LeadMediaPanel'
import { LeadSlotBar } from './components/LeadSlotBar'

// Re-export constants để đảm bảo tương thích ngược 100%
export { CARE_STATUS_OPTIONS, DATE_PRESET_OPTIONS, HISTORY_TYPE_OPTIONS, careOutcomes, LeadSlotBar }

export interface LeadsProps {
  onOpenDialog?: (dialog: DialogState) => void
}

export const Leads: React.FC<LeadsProps> = ({ onOpenDialog }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined)

  const { data: campaignsData } = useCampaigns()
  const userBranchId = useAuthStore((s) => s.user?.branchId)

  // Trích xuất danh sách các chi nhánh khả dụng từ chiến dịch, fallback theo chi nhánh của nhân viên
  const availableBranches = useMemo(() => {
    const map = new Map<number, string>()
    const list = campaignsData?.items || []
    list.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        map.set(c.branch_id, c.branch_name)
      }
    })
    if (userBranchId) {
      if (!map.has(userBranchId)) {
        map.set(userBranchId, `Chi nhánh #${userBranchId}`)
      }
    }
    if (map.size === 0) {
      map.set(3, 'Trụ sở Hà Nội')
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [campaignsData, userBranchId])

  // Chi nhánh cho thanh Slot Bar: ưu tiên chi nhánh đang chọn, hoặc chi nhánh đầu tiên có sẵn
  const activeSlotBranchId = selectedBranchId || availableBranches[0]?.id || 3
  const activeSlotBranchName = availableBranches.find((b) => b.id === activeSlotBranchId)?.name

  // Lấy chi tiết khách hàng đang chọn để cung cấp tên cho header của Timeline
  const { data: customerDetail } = useCustomerDetail(selectedCustomerId || undefined)

  return (
    <div className="content leads-content">
      {/* 1. Thanh hiển thị Slot chiến dịch nằm ngang (có thể rút gọn / mở rộng) */}
      <LeadSlotBar
        branchId={activeSlotBranchId}
        branchName={activeSlotBranchName}
        availableBranches={availableBranches}
        onBranchChange={setSelectedBranchId}
      />

      {/* 2. Cụm 4 Thẻ chỉ số KPI */}
      <section className="call-stat-grid">
        <article className="call-stat blue">
          <div className="card-icon">
            <Users size={21} />
          </div>
          <div>
            <p>Tổng khách tiềm năng</p>
            <strong>3332</strong>
          </div>
          <BarChart3 size={15} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <CalendarDays size={21} />
          </div>
          <div>
            <p>Cần chăm sóc hôm nay</p>
            <strong>12</strong>
          </div>
          <BarChart3 size={15} />
        </article>

        <article className="call-stat green">
          <div className="card-icon">
            <CalendarCheck size={21} />
          </div>
          <div>
            <p>Đã hẹn lịch</p>
            <strong>8</strong>
          </div>
          <BarChart3 size={15} />
        </article>

        <article className="call-stat rose">
          <div className="card-icon">
            <ShoppingCart size={21} />
          </div>
          <div>
            <p>Đã chốt</p>
            <strong>6</strong>
          </div>
          <BarChart3 size={15} />
        </article>
      </section>

      {/* 3. Bố cục 2 cột chính của trang */}
      <div className="leads-grid">
        {/* CỘT TRÁI: Bảng danh sách khách hàng & Lịch sử tương tác đa kênh */}
        <div className="lead-list-column">
          <LeadListPanel
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            availableBranches={availableBranches}
          />
          <LeadTimelinePanel
            customerId={selectedCustomerId}
            customerName={customerDetail?.customer_name}
          />
        </div>

        {/* CỘT PHẢI: Hồ sơ khách hàng, Form cập nhật CSKH & Dữ liệu đa phương tiện */}
        <aside className="lead-detail-column">
          <LeadDetailAndCarePanel
            customerId={selectedCustomerId}
            onOpenDialog={onOpenDialog}
          />
          <LeadMediaPanel customerId={selectedCustomerId} />
        </aside>
      </div>
    </div>
  )
}

export default Leads
