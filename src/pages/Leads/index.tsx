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
import { ErpSource } from '../../types/api'
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
  const [selectedCustomerSource, setSelectedCustomerSource] = useState<ErpSource>('locnuoc365')
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined)

  const handleSelectCustomer = (id: number, source_erp?: ErpSource) => {
    setSelectedCustomerId(id)
    if (source_erp) {
      setSelectedCustomerSource(source_erp)
    }
  }

  const { data: campaignsData } = useCampaigns()
  const userBranchId = useAuthStore((s) => s.user?.branchId)
  const [selectedBranchKey, setSelectedBranchKey] = useState<string | undefined>(undefined)

  // Trích xuất danh sách tất cả các chi nhánh khả dụng từ chiến dịch của cả 2 ERP
  // Dùng compound key `${erp}_${branch_id}` tránh việc chi nhánh cùng id (ví dụ branch_id = 3) ghi đè nhau
  const availableBranches = useMemo(() => {
    const map = new Map<string, { key: string; id: number; name: string; source_erp: ErpSource }>()
    const list = campaignsData?.items || []
    list.forEach((c) => {
      if (c.branch_id && c.branch_name) {
        const erp = c.source_erp || 'locnuoc365'
        const key = `${erp}_${c.branch_id}`
        map.set(key, {
          key,
          id: c.branch_id,
          name: c.branch_name,
          source_erp: erp,
        })
      }
    })
    if (userBranchId && !Array.from(map.values()).some((b) => b.id === userBranchId)) {
      map.set(`locnuoc365_${userBranchId}`, {
        key: `locnuoc365_${userBranchId}`,
        id: userBranchId,
        name: `Chi nhánh #${userBranchId}`,
        source_erp: 'locnuoc365',
      })
    }
    if (map.size === 0) {
      map.set('locnuoc365_3', {
        key: 'locnuoc365_3',
        id: 3,
        name: 'Chi Nhánh Đại Kim',
        source_erp: 'locnuoc365',
      })
    }
    return Array.from(map.values())
  }, [campaignsData, userBranchId])

  // Chi nhánh cho thanh Slot Bar: ưu tiên chi nhánh theo key đang chọn, hoặc Chi Nhánh Đại Kim (Hà Nội của LocNuoc365)
  const activeSlotBranch = useMemo(() => {
    if (selectedBranchKey) {
      const found = availableBranches.find((b) => b.key === selectedBranchKey)
      if (found) return found
    }
    if (selectedBranchId) {
      const found = availableBranches.find((b) => b.id === selectedBranchId)
      if (found) return found
    }
    const hanoi = availableBranches.find((b) => b.id === 3 && b.source_erp === 'locnuoc365')
    return hanoi || availableBranches[0]
  }, [selectedBranchKey, selectedBranchId, availableBranches])

  const activeSlotBranchId = activeSlotBranch?.id || 3
  const activeSlotBranchName = activeSlotBranch?.name || 'Chi Nhánh Đại Kim'
  const activeSlotBranchSource = activeSlotBranch?.source_erp || 'locnuoc365'

  // Lấy chi tiết khách hàng đang chọn từ đúng ERP để cung cấp tên cho header của Timeline
  const { data: customerDetail } = useCustomerDetail(
    selectedCustomerId || undefined,
    selectedCustomerSource,
  )

  return (
    <div className="content leads-content">
      {/* 1. Thanh hiển thị Slot chiến dịch nằm ngang (có thể rút gọn / mở rộng) */}
      <LeadSlotBar
        branchId={activeSlotBranchId}
        branchName={activeSlotBranchName}
        availableBranches={availableBranches}
        selectedBranchKey={activeSlotBranch?.key}
        onBranchChange={(newBranchId, _source, newKey) => {
          setSelectedBranchId(newBranchId)
          if (newKey) {
            setSelectedBranchKey(newKey)
          }
        }}
        source_erp={activeSlotBranchSource}
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

        <article className="call-stat green">
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
            selectedCustomerSource={selectedCustomerSource}
            onSelectCustomer={handleSelectCustomer}
            selectedBranchId={selectedBranchId}
            onBranchChange={setSelectedBranchId}
            availableBranches={availableBranches}
          />
          <LeadTimelinePanel
            customerId={selectedCustomerId}
            customerName={customerDetail?.customer_name}
            source_erp={selectedCustomerSource}
          />
        </div>

        {/* CỘT PHẢI: Hồ sơ khách hàng, Form cập nhật CSKH & Dữ liệu đa phương tiện */}
        <aside className="lead-detail-column">
          <LeadDetailAndCarePanel
            customerId={selectedCustomerId}
            onOpenDialog={onOpenDialog}
            source_erp={selectedCustomerSource}
          />
          <LeadMediaPanel
            customerId={selectedCustomerId}
            source_erp={selectedCustomerSource}
          />
        </aside>
      </div>
    </div>
  )
}

export default Leads
