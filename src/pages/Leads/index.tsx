import React, { useState } from 'react'
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ShoppingCart,
  Users,
} from 'lucide-react'
import { useCustomerDetail } from '../../hooks/useCustomers'
import { DialogState } from '../../types'
import { LeadListPanel, CARE_STATUS_OPTIONS, DATE_PRESET_OPTIONS } from './components/LeadListPanel'
import { LeadTimelinePanel, HISTORY_TYPE_OPTIONS } from './components/LeadTimelinePanel'
import { LeadDetailAndCarePanel, careOutcomes } from './components/LeadDetailAndCarePanel'
import { LeadMediaPanel } from './components/LeadMediaPanel'

// Re-export constants để đảm bảo tương thích ngược 100%
export { CARE_STATUS_OPTIONS, DATE_PRESET_OPTIONS, HISTORY_TYPE_OPTIONS, careOutcomes }

export interface LeadsProps {
  onOpenDialog?: (dialog: DialogState) => void
}

export const Leads: React.FC<LeadsProps> = ({ onOpenDialog }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)

  // Lấy chi tiết khách hàng đang chọn để cung cấp tên cho header của Timeline
  const { data: customerDetail } = useCustomerDetail(selectedCustomerId || undefined)

  return (
    <div className="content leads-content">
      {/* 4 Thẻ chỉ số KPI đầu trang */}
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

      {/* Bố cục 2 cột chính của trang */}
      <div className="leads-grid">
        {/* CỘT TRÁI: Bảng danh sách khách hàng & Lịch sử tương tác đa kênh */}
        <div className="lead-list-column">
          <LeadListPanel
            selectedCustomerId={selectedCustomerId}
            onSelectCustomer={setSelectedCustomerId}
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
