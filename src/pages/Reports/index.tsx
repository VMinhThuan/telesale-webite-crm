import React, { useMemo, useState } from 'react'
import {
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  Coins,
  Info,
  Phone,
  ShieldCheck,
  ShoppingCart,
  Undo2,
  UserCheck,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import { useUserLists } from '../../hooks/useAuth'
import {
  calculateCommission,
  useCampaigns,
  useDailyResultsList,
} from '../../hooks/useTelesale'
import { useOrdersList } from '../../hooks/useOrders'
import { formatVND } from '../../utils/formatters'
import { notify } from '../../utils/notify'

type DatePreset = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'custom'

export const Reports: React.FC = () => {
  // 1. Quản lý trạng thái bộ lọc khoảng ngày (Từ ngày ... đến ngày)
  const [datePreset, setDatePreset] = useState<DatePreset>('7days')
  const [fromDate, setFromDate] = useState(() => dayjs().subtract(6, 'day').format('YYYY-MM-DD'))
  const [toDate, setToDate] = useState(() => dayjs().format('YYYY-MM-DD'))

  // 2. Quản lý bộ lọc Chi nhánh, Cấp bậc và Nhân viên
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedRole, setSelectedRole] = useState<'all' | 'leader' | 'agent'>('all')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  // Tải danh mục chi nhánh từ danh sách Chiến dịch (useCampaigns)
  const { data: campaignsData } = useCampaigns()

  // Tải danh sách nhân sự Telesale (Phòng ban 19: API 05 get-user-lists)
  const { data: userListsData } = useUserLists({ phong_ban: 19 })

  // Danh sách các chi nhánh chuẩn hóa (lấy trực tiếp duy nhất từ useCampaigns)
  const branchOptions = useMemo(() => {
    const map = new Map<string, { id: string | number; name: string }>()

    campaignsData?.items?.forEach((c) => {
      const branchId = c.branch_id
      const branchName = (c.branch_name || c.name || '').trim()
      if (branchId && branchName) {
        map.set(String(branchId), { id: branchId, name: branchName })
      }
    })

    return Array.from(map.values())
  }, [campaignsData])

  // Chuẩn hóa danh sách nhân sự Telesale kèm vai trò (Trưởng nhóm / Nhân viên) và chi nhánh
  const { employeeList, employeeMap } = useMemo(() => {
    const listFromApi: any[] = Array.isArray(userListsData)
      ? userListsData
      : (userListsData as any)?.items || (userListsData as any)?.users || []

    const map = new Map<
      string,
      {
        id: string | number
        name: string
        branchId?: number
        branchName?: string
        role?: string
        isLeader?: boolean
      }
    >()

    listFromApi.forEach((emp) => {
      const id = emp.id || emp.user_id
      if (id) {
        const name = (emp.full_name || emp.name || emp.first_name || `Nhân viên #${id}`).trim()
        const chucVuStr = String(emp.chuc_vu || emp.role_name || emp.role || emp.loai_nv || '').toLowerCase()
        const isLeader = Boolean(
          emp.is_leader === true ||
          emp.is_leader === 1 ||
          chucVuStr.includes('trưởng') ||
          chucVuStr.includes('leader') ||
          chucVuStr.includes('quản lý'),
        )
        const branchId = emp.branch_id || emp.chi_nhanh_id || undefined
        const branchName = emp.branch_name || emp.chi_nhanh || undefined

        map.set(String(id), {
          id,
          name,
          branchId,
          branchName,
          role: emp.chuc_vu || emp.role_name || (isLeader ? 'Trưởng nhóm' : 'Nhân viên'),
          isLeader,
        })
      }
    })

    return {
      employeeList: Array.from(map.values()),
      employeeMap: map,
    }
  }, [userListsData])

  // Danh sách nhân viên hiển thị trong dropdown sau khi lọc theo Chi nhánh và Cấp bậc
  const displayedEmployees = useMemo(() => {
    return employeeList.filter((emp) => {
      if (selectedBranchId !== 'all' && emp.branchId && String(emp.branchId) !== selectedBranchId) {
        return false
      }
      if (selectedRole === 'leader' && !emp.isLeader) {
        return false
      }
      if (selectedRole === 'agent' && emp.isLeader) {
        return false
      }
      return true
    })
  }, [employeeList, selectedBranchId, selectedRole])

  // Xác định user_id khi chọn 1 nhân viên cụ thể
  const queryUserId = selectedEmployeeId !== 'all' ? Number(selectedEmployeeId) : undefined

  // 3. Tải dữ liệu hiệu suất đàm thoại (API 10b: POST /api/telesale/daily-results)
  const { data: dailyResults = [], isLoading: isLoadingDaily } = useDailyResultsList({
    from_date: fromDate,
    to_date: toDate,
    user_id: queryUserId,
  })

  // 4. Tải đơn hàng 3 ngày tới để thống kê lịch hẹn (API 11b: POST /api/telesale/orders)
  const upcomingStartDate = dayjs().format('YYYY-MM-DD')
  const upcomingEndDate = dayjs().add(2, 'day').format('YYYY-MM-DD')
  const { data: upcomingOrdersData } = useOrdersList({
    from_date: upcomingStartDate,
    to_date: upcomingEndDate,
    page_size: 100,
    user_id: queryUserId,
  })

  // Lọc dữ liệu theo Nhân viên, Chi nhánh và Cấp bậc đã chọn
  const filteredResults = useMemo(() => {
    return dailyResults.filter((r) => {
      const emp = employeeMap.get(String(r.user_id))

      // Lọc theo nhân viên cụ thể nếu có chọn
      if (selectedEmployeeId !== 'all') {
        return String(r.user_id) === selectedEmployeeId
      }

      // Lọc theo chi nhánh
      if (selectedBranchId !== 'all') {
        if (emp?.branchId && String(emp.branchId) !== selectedBranchId) {
          return false
        }
      }

      // Lọc theo cấp bậc (Trưởng nhóm / Nhân viên)
      if (selectedRole === 'leader' && !emp?.isLeader) {
        return false
      }
      if (selectedRole === 'agent' && emp?.isLeader) {
        return false
      }

      return true
    })
  }, [dailyResults, selectedEmployeeId, selectedBranchId, selectedRole, employeeMap])

  // Tính tổng các chỉ số từ dữ liệu thật (bao gồm Tổng hoa hồng)
  const totals = useMemo(() => {
    return filteredResults.reduce(
      (acc, cur) => {
        const donPhatSinh = cur.don_phat_sinh ?? cur.tong_da_chot ?? 0
        const hoaHong = calculateCommission(donPhatSinh)
        return {
          hours: acc.hours + Math.round((cur.tong_tg_dam_thoai || 0) / 60),
          calls: acc.calls + (cur.tong_total_call || 0),
          connected: acc.connected + (cur.tong_call_answer || 0),
          leads: acc.leads + (cur.tong_giu_lai_cs || 0) + (cur.tong_hen_goi_lai || 0),
          closed: acc.closed + donPhatSinh,
          commission: acc.commission + hoaHong,
          confirmed: acc.confirmed + (cur.tong_don_da_xac_nhan || 0),
          returned: acc.returned + (cur.tong_don_tra_ve || 0),
        }
      },
      { hours: 0, calls: 0, connected: 0, leads: 0, closed: 0, commission: 0, confirmed: 0, returned: 0 },
    )
  }, [filteredResults])

  // Thống kê lịch hẹn 3 ngày tới từ danh sách đơn hàng thật
  const upcomingAppointments = useMemo(() => {
    const rawOrders = upcomingOrdersData?.items || []
    const orders =
      selectedEmployeeId === 'all'
        ? rawOrders
        : rawOrders.filter((o) => String(o.nvkd_id) === String(selectedEmployeeId))

    const days = [0, 1, 2].map((offset) => {
      const d = dayjs().add(offset, 'day')
      const dateStr = d.format('YYYY-MM-DD')
      const count = orders.filter((o) => o.ngay_hen_khach === dateStr).length
      return {
        label: `${offset === 0 ? 'Hôm nay' : offset === 1 ? 'Ngày mai' : d.format('DD/MM')} · ${d.format('DD/MM')}`,
        count,
      }
    })
    return days
  }, [upcomingOrdersData, selectedEmployeeId])

  // Số ngày trong khoảng thời gian đã chọn để tính trung bình
  const daysCount = Math.max(1, dayjs(toDate).diff(dayjs(fromDate), 'day') + 1)

  // Danh sách các thẻ chỉ số KPI trên cùng:
  // Hàng 1 (5 chỉ số: Tiếp cận, Hoa hồng & Khách tiềm năng)
  const row1Metrics = [
    { label: 'Tổng hoa hồng', value: formatVND(totals.commission), icon: Coins, tone: 'blue' },
    { label: 'Thời gian đàm thoại', value: `${totals.hours} giờ`, icon: Clock3, tone: 'blue' },
    { label: 'Tổng số cuộc gọi', value: String(totals.calls), icon: Phone, tone: 'green' },
    { label: 'Kết nối', value: String(totals.connected), icon: Users, tone: 'blue' },
    { label: 'Khách tiềm năng', value: String(totals.leads), icon: UserCheck, tone: 'amber' },
  ]

  // Hàng 2 (4 chỉ số: Đơn hàng, Giao nhận & Tỷ lệ ngày)
  const row2Metrics = [
    { label: 'Đơn phát sinh', value: String(totals.closed), icon: ShoppingCart, tone: 'green' },
    { label: 'Đã đi', value: String(totals.confirmed), icon: BadgeCheck, tone: 'green' },
    { label: 'Đơn trả về', value: String(totals.returned), icon: Undo2, tone: 'rose' },
    {
      label: 'Số đơn TB/ngày',
      value: String(Math.round(totals.closed / daysCount)),
      icon: BarChart3,
      tone: 'blue',
    },
  ]

  // Xử lý xuất file CSV báo cáo chi tiết
  const handleExportCSV = () => {
    const csvContent =
      'Nhân viên,Vai trò,Đàm thoại,Cuộc gọi,Kết nối,Tiềm năng,Đơn phát sinh,Hoa hồng,Đã đi,Trả về,Tỷ lệ chốt\n' +
      filteredResults
        .map((p) => {
          const emp = employeeMap.get(String(p.user_id))
          const role = emp?.isLeader ? 'Trưởng nhóm' : 'Nhân viên'
          const hours = `${Math.round((p.tong_tg_dam_thoai || 0) / 60)} giờ`
          const calls = p.tong_total_call || 0
          const connected = p.tong_call_answer || 0
          const leads = (p.tong_giu_lai_cs || 0) + (p.tong_hen_goi_lai || 0)
          const closed = p.don_phat_sinh ?? p.tong_da_chot ?? 0
          const commission = calculateCommission(closed)
          const confirmed = p.tong_don_da_xac_nhan || 0
          const returned = p.tong_don_tra_ve || 0
          const rate = connected > 0 ? `${((closed / connected) * 100).toFixed(1)}%` : '0%'
          return `"${p.user_name || 'Nhân viên'}","${role}",${hours},${calls},${connected},${leads},${closed},${commission},${confirmed},${returned},${rate}`
        })
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bao-cao-hieu-suat-${fromDate}-den-${toDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify('Đã tải xuống file báo cáo CSV')
  }

  // Nhãn hiển thị mô tả bộ lọc hiện tại
  const selectedBranchName = useMemo(() => {
    if (selectedBranchId === 'all') return 'Tất cả chi nhánh'
    const found = branchOptions.find((b) => String(b.id) === selectedBranchId)
    return found ? found.name : 'Chi nhánh'
  }, [selectedBranchId, branchOptions])

  const selectedRoleName =
    selectedRole === 'leader' ? 'Trưởng nhóm' : selectedRole === 'agent' ? 'Nhân viên' : 'Tất cả cấp bậc'

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployeeId === 'all') return 'Tất cả nhân viên'
    const found = employeeList.find((e) => String(e.id) === String(selectedEmployeeId))
    return found ? found.name : 'Nhân viên'
  }, [selectedEmployeeId, employeeList])

  // Xử lý chuyển đổi Preset ngày
  const handleSelectPreset = (p: DatePreset) => {
    setDatePreset(p)
    const today = dayjs()
    if (p === 'today') {
      setFromDate(today.format('YYYY-MM-DD'))
      setToDate(today.format('YYYY-MM-DD'))
    } else if (p === 'yesterday') {
      const y = today.subtract(1, 'day').format('YYYY-MM-DD')
      setFromDate(y)
      setToDate(y)
    } else if (p === '7days') {
      setFromDate(today.subtract(6, 'day').format('YYYY-MM-DD'))
      setToDate(today.format('YYYY-MM-DD'))
    } else if (p === 'thisMonth') {
      setFromDate(today.startOf('month').format('YYYY-MM-DD'))
      setToDate(today.format('YYYY-MM-DD'))
    }
  }

  return (
    <div className="content reports-content">
      {/* Tiêu đề trang & Thanh công cụ bộ lọc đa chiều */}
      <div className="page-title report-title" style={{ flexWrap: 'wrap', gap: '14px', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '20px', margin: '0 0 4px', fontWeight: 700, color: '#172c57' }}>
            Báo cáo hiệu suất Telesale
          </h2>
          <span style={{ fontSize: '11px', color: '#6d7f9c' }}>
            Phân tích số liệu cuộc gọi, hoa hồng và đơn hàng theo chi nhánh & nhân sự
          </span>
        </div>

        {/* Cụm bộ lọc 2 hàng: Hàng 1 (Thời gian), Hàng 2 (Chi nhánh, Cấp bậc, Nhân viên) */}
        <div className="report-filters-container">
          {/* Hàng 1: Bộ lọc Từ ngày ... đến ngày & Nút chọn nhanh */}
          <div className="report-filters-row">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#fff',
                border: '1px solid #dce6f0',
                borderRadius: '7px',
                padding: '4px 8px',
                height: '38px',
              }}
            >
              <CalendarDays size={15} color="#2877dc" />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setDatePreset('custom')
                }}
                style={{
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontSize: '11px',
                  color: '#1e293b',
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setDatePreset('custom')
                }}
                style={{
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontSize: '11px',
                  color: '#1e293b',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Các nút preset ngày nhanh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {(
                [
                  { id: 'today', label: 'Hôm nay' },
                  { id: 'yesterday', label: 'Hôm qua' },
                  { id: '7days', label: '7 ngày' },
                  { id: 'thisMonth', label: 'Tháng này' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  style={{
                    height: '38px',
                    padding: '0 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: datePreset === p.id ? 700 : 500,
                    background: datePreset === p.id ? '#2575df' : '#fff',
                    color: datePreset === p.id ? '#fff' : '#475569',
                    border: '1px solid',
                    borderColor: datePreset === p.id ? '#2575df' : '#dce6f0',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hàng 2: Bộ lọc Chi nhánh, Cấp bậc, Nhân viên & Nút Áp dụng */}
          <div className="report-filters-row">
            {/* 2. Bộ lọc Chi nhánh */}
            <label className="report-select" title="Lọc theo chi nhánh" style={{ height: '38px' }}>
              <Building2 size={15} color="#2575df" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value)
                  setSelectedEmployeeId('all')
                }}
                aria-label="Chọn chi nhánh"
              >
                <option value="all">Tất cả chi nhánh</option>
                {branchOptions.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>

            {/* 3. Bộ lọc Cấp bậc: Trưởng nhóm / Nhân viên */}
            <label className="report-select" title="Phân loại cấp bậc" style={{ height: '38px' }}>
              <ShieldCheck size={15} color="#d97706" />
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value as any)
                  setSelectedEmployeeId('all')
                }}
                aria-label="Chọn cấp bậc"
              >
                <option value="all">Tất cả cấp bậc</option>
                <option value="leader">⭐ Trưởng nhóm</option>
                <option value="agent">Nhân viên Telesale</option>
              </select>
              <ChevronDown size={14} />
            </label>

            {/* 4. Bộ lọc Nhân viên */}
            <label className="report-select" title="Chọn nhân viên" style={{ height: '38px' }}>
              <Users size={15} color="#0bad79" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                aria-label="Chọn nhân viên"
              >
                <option value="all">
                  Tất cả nhân viên{displayedEmployees.length > 0 ? ` (${displayedEmployees.length})` : ''}
                </option>
                {displayedEmployees.map((emp) => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.isLeader ? `⭐ ${emp.name} (Trưởng nhóm)` : emp.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>

            <button
              className="apply"
              type="button"
              style={{ height: '38px' }}
              onClick={() =>
                notify(`Đã cập nhật báo cáo: ${selectedBranchName} · ${selectedRoleName} · ${selectedEmployeeName}`)
              }
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>

      {/* Dòng ghi chú tóm tắt trạng thái lọc */}
      <section className="report-filter-note">
        <Info size={14} />
        <span>
          Đang xem: <b>{selectedBranchName}</b> · <b>{selectedRoleName}</b> · <b>{selectedEmployeeName}</b> ·{' '}
          <span>
            {dayjs(fromDate).format('DD/MM/YYYY')} - {dayjs(toDate).format('DD/MM/YYYY')}
          </span>
        </span>
      </section>

      {/* Khối thẻ chỉ số KPI: Chia 2 hàng rõ ràng, cân đối và trực quan */}
      <section className="report-metrics-container">
        {/* Hàng 1: 5 chỉ số Đàm thoại & Hoa hồng */}
        <div className="report-metrics-row-1">
          {row1Metrics.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className={`report-metric ${tone}`}>
              <div className="report-icon">
                <Icon size={22} />
              </div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </div>

        {/* Hàng 2: 4 chỉ số Đơn hàng & Hiệu suất */}
        <div className="report-metrics-row-2">
          {row2Metrics.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className={`report-metric ${tone}`}>
              <div className="report-icon">
                <Icon size={22} />
              </div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Khối Lịch hẹn 3 ngày tới (Đã loại bỏ các chỉ số trùng lặp theo yêu cầu) */}
      <section className="call-panel upcoming">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">LỊCH HẸN</p>
            <h2>Lịch hẹn 3 ngày tới</h2>
          </div>
        </div>
        <div className="upcoming-days">
          {upcomingAppointments.map((item, index) => (
            <div className={['blue', 'green', 'amber'][index % 3]} key={item.label}>
              <CalendarDays size={17} />
              <span>{item.label}</span>
              <b>{item.count} đơn</b>
            </div>
          ))}
        </div>
      </section>

      {/* Bảng chi tiết hiệu suất theo nhân viên */}
      <section className="call-panel staff-report">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">BẢNG CHI TIẾT</p>
            <h2>Hiệu suất theo nhân viên</h2>
          </div>
          <button className="subtle-select" onClick={handleExportCSV} type="button">
            Xuất báo cáo <ChevronDown size={14} />
          </button>
        </div>
        <div className="table-wrap">
          {isLoadingDaily ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              Đang tải dữ liệu...
            </div>
          ) : filteredResults.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              Chưa có dữ liệu hiệu suất cuộc gọi trong khoảng thời gian này.
            </div>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  {[
                    'Nhân viên',
                    'Đàm thoại',
                    'Cuộc gọi',
                    'Kết nối',
                    'Tiềm năng',
                    'Đơn phát sinh',
                    'Hoa hồng',
                    'Đã đi',
                    'Trả về',
                    'Tỷ lệ chốt',
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((person, idx) => {
                  const emp = employeeMap.get(String(person.user_id))
                  const isLeader = emp?.isLeader
                  const hours = Math.round((person.tong_tg_dam_thoai || 0) / 60)
                  const calls = person.tong_total_call || 0
                  const connected = person.tong_call_answer || 0
                  const leads = (person.tong_giu_lai_cs || 0) + (person.tong_hen_goi_lai || 0)
                  const closed = person.don_phat_sinh ?? person.tong_da_chot ?? 0
                  const commission = calculateCommission(closed)
                  const confirmed = person.tong_don_da_xac_nhan || 0
                  const returned = person.tong_don_tra_ve || 0
                  const rate = connected > 0 ? `${((closed / connected) * 100).toFixed(1)}%` : '0%'

                  return (
                    <tr key={person.user_id || idx}>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600 }}>{person.user_name || `Nhân viên #${person.user_id}`}</span>
                          {isLeader ? (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              Trưởng nhóm
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              Nhân viên
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{hours} giờ</td>
                      <td>{calls}</td>
                      <td>{connected}</td>
                      <td>{leads}</td>
                      <td>{closed}</td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>{formatVND(commission)}</td>
                      <td style={{ color: '#0bad79', fontWeight: 700 }}>{confirmed}</td>
                      <td style={{ color: returned > 0 ? '#e11d48' : '#64748b' }}>{returned}</td>
                      <td>{rate}</td>
                    </tr>
                  )
                })}
                <tr className="total-row">
                  <td><b>Tổng cộng</b></td>
                  <td>{totals.hours} giờ</td>
                  <td>{totals.calls}</td>
                  <td>{totals.connected}</td>
                  <td>{totals.leads}</td>
                  <td>{totals.closed}</td>
                  <td style={{ color: '#16a34a', fontWeight: 700 }}>{formatVND(totals.commission)}</td>
                  <td style={{ color: '#0bad79', fontWeight: 700 }}>{totals.confirmed}</td>
                  <td style={{ color: totals.returned > 0 ? '#e11d48' : '#64748b' }}>{totals.returned}</td>
                  <td>
                    {totals.connected > 0
                      ? `${((totals.closed / totals.connected) * 100).toFixed(1)}%`
                      : '0%'}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <p className="report-caption">
          <Info size={14} /> Dữ liệu được tính toán thời gian thực theo báo cáo tổng hợp.
        </p>
      </section>
    </div>
  )
}

export default Reports
