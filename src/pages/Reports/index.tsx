import React, { useMemo, useState } from 'react'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Coins,
  Info,
  MessageCircle,
  Phone,
  ShoppingCart,
  Undo2,
  UserCheck,
  Users,
} from 'lucide-react'
import dayjs from '../../lib/dayjs'
import { useUserLists } from '../../hooks/useAuth'
import { useDailyResultsList } from '../../hooks/useTelesale'
import { useOrdersList } from '../../hooks/useOrders'
import { notify } from '../../utils/notify'
import { formatVND } from '../../utils/formatters'

interface PeriodOption {
  label: string
  getFromDate: () => string
  getToDate: () => string
  days: number
}

const PERIOD_OPTIONS: PeriodOption[] = [
  {
    label: 'Hôm nay',
    getFromDate: () => dayjs().format('YYYY-MM-DD'),
    getToDate: () => dayjs().format('YYYY-MM-DD'),
    days: 1,
  },
  {
    label: '7 ngày gần nhất',
    getFromDate: () => dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    getToDate: () => dayjs().format('YYYY-MM-DD'),
    days: 7,
  },
  {
    label: 'Tháng này',
    getFromDate: () => dayjs().startOf('month').format('YYYY-MM-DD'),
    getToDate: () => dayjs().format('YYYY-MM-DD'),
    days: dayjs().date(),
  },
]

interface ChartPointData {
  day: string
  calls: number
  orders: number
}

function ReportChart({ values }: { values: ChartPointData[] }) {
  const maxCalls = Math.max(10, Math.ceil(Math.max(1, ...values.map((item) => item.calls)) / 10) * 10)
  const maxOrders = Math.max(1, Math.max(1, ...values.map((item) => item.orders)))
  const scaleLabels = Array.from({ length: 6 }, (_, index) =>
    Math.round(maxCalls - (maxCalls / 5) * index),
  )

  return (
    <section className="call-panel report-chart">
      <div className="call-panel-heading">
        <div>
          <p className="eyebrow">PHÂN TÍCH</p>
          <h2>Xu hướng cuộc gọi & đơn chốt</h2>
        </div>
        <div className="chart-legend">
          <span>
            <i className="blue" /> Cuộc gọi
          </span>
          <span>
            <i className="green" /> Đơn chốt
          </span>
        </div>
      </div>
      <div className="modern-chart">
        <div className="chart-scale">
          {scaleLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          className="bar-groups"
          style={{ gridTemplateColumns: `repeat(${Math.max(1, values.length)}, 1fr)` }}
        >
          {values.map((item) => (
            <div className="bar-group" key={item.day}>
              <div className="bar-zone">
                <span
                  className="call-bar"
                  title={`${item.calls} cuộc gọi`}
                  style={{ height: `${Math.min(100, (item.calls / maxCalls) * 100)}%` }}
                >
                  <b>{item.calls}</b>
                </span>
                <span
                  className="order-bar"
                  title={`${item.orders} đơn chốt`}
                  style={{ height: `${Math.min(100, (item.orders / maxOrders) * 100)}%` }}
                >
                  <b>{item.orders}</b>
                </span>
              </div>
              <small>{item.day}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="chart-footnote">Dữ liệu thời gian thực theo khoảng thời gian đang chọn.</p>
    </section>
  )
}

export const Reports: React.FC = () => {
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(1) // 7 ngày gần nhất
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all')

  const currentPeriod = PERIOD_OPTIONS[selectedPeriodIndex] || PERIOD_OPTIONS[1]
  const fromDate = currentPeriod.getFromDate()
  const toDate = currentPeriod.getToDate()

  // 1. Tải danh sách nhân sự Telesale
  const { data: userListsData } = useUserLists({ phong_ban: 19 })
  const employeeList = useMemo(() => {
    if (!userListsData) return []
    if (Array.isArray(userListsData)) return userListsData
    return userListsData.items || []
  }, [userListsData])

  // 2. Tải dữ liệu hiệu suất đàm thoại
  const { data: dailyResults = [], isLoading: isLoadingDaily } = useDailyResultsList({
    from_date: fromDate,
    to_date: toDate,
  })

  // 3. Tải đơn hàng 3 ngày tới để thống kê lịch hẹn
  const upcomingStartDate = dayjs().format('YYYY-MM-DD')
  const upcomingEndDate = dayjs().add(2, 'day').format('YYYY-MM-DD')
  const { data: upcomingOrdersData } = useOrdersList({
    from_date: upcomingStartDate,
    to_date: upcomingEndDate,
    page_size: 100,
  })

  // Lọc dữ liệu theo nhân viên nếu chọn cụ thể
  const filteredResults = useMemo(() => {
    if (selectedEmployeeId === 'all') return dailyResults
    return dailyResults.filter((r) => String(r.user_id) === selectedEmployeeId)
  }, [dailyResults, selectedEmployeeId])

  // Tính tổng các chỉ số từ dữ liệu thật
  const totals = useMemo(() => {
    return filteredResults.reduce(
      (acc, cur) => ({
        hours: acc.hours + Math.round((cur.tong_tg_dam_thoai || 0) / 60),
        calls: acc.calls + (cur.tong_total_call || 0),
        connected: acc.connected + (cur.tong_call_answer || 0),
        leads: acc.leads + (cur.tong_giu_lai_cs || 0) + (cur.tong_hen_goi_lai || 0),
        closed: acc.closed + (cur.tong_da_chot || 0),
        returned: acc.returned + (cur.tong_don_tra_ve || 0),
        commission: acc.commission + (cur.tong_da_chot || 0) * 150000,
      }),
      { hours: 0, calls: 0, connected: 0, leads: 0, closed: 0, returned: 0, commission: 0 },
    )
  }, [filteredResults])

  // Biểu đồ xu hướng cuộc gọi & đơn chốt theo từng ngày trong kỳ
  const chartData: ChartPointData[] = useMemo(() => {
    const daysCount = currentPeriod.days
    const start = dayjs(fromDate)
    const points: ChartPointData[] = []

    for (let i = 0; i < Math.min(daysCount, 7); i++) {
      const dayStr = start.add(i, 'day').format('DD/MM')
      const targetDate = start.add(i, 'day').format('YYYY-MM-DD')

      const dayMatches = filteredResults.filter(
        (r) => (r as any).date === targetDate || (r as any).ngay === targetDate,
      )

      const calls = dayMatches.reduce((sum, r) => sum + (r.tong_total_call || 0), 0)
      const orders = dayMatches.reduce((sum, r) => sum + (r.tong_da_chot || 0), 0)

      points.push({ day: dayStr, calls, orders })
    }

    return points
  }, [currentPeriod, fromDate, filteredResults])

  // Thống kê lịch hẹn 3 ngày tới từ danh sách đơn hàng thật
  const upcomingAppointments = useMemo(() => {
    const orders = upcomingOrdersData?.items || []
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
  }, [upcomingOrdersData])

  const metrics = [
    { label: 'Thời gian làm việc', value: `${totals.hours} giờ`, icon: Clock3, tone: 'blue' },
    { label: 'Tổng số cuộc gọi', value: String(totals.calls), icon: Phone, tone: 'green' },
    { label: 'Kết nối', value: String(totals.connected), icon: Users, tone: 'blue' },
    { label: 'Khách tiềm năng', value: String(totals.leads), icon: UserCheck, tone: 'amber' },
    { label: 'Đơn đã chốt', value: String(totals.closed), icon: ShoppingCart, tone: 'green' },
    { label: 'Đơn trả về', value: String(totals.returned), icon: Undo2, tone: 'rose' },
    {
      label: 'Số đơn trung bình/ngày',
      value: String(Math.round(totals.closed / Math.max(1, currentPeriod.days))),
      icon: BarChart3,
      tone: 'blue',
    },
    { label: 'Tổng hoa hồng', value: formatVND(totals.commission), icon: Coins, tone: 'amber' },
  ]

  const handleExportCSV = () => {
    const csvContent =
      'Nhân viên,Cuộc gọi,Kết nối,Đã chốt,Hoa hồng\n' +
      filteredResults
        .map(
          (p) =>
            `${p.user_name || 'Nhân viên'},${p.tong_total_call || 0},${p.tong_call_answer || 0},${p.tong_da_chot || 0
            },${(p.tong_da_chot || 0) * 150000}`,
        )
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bao-cao-hieu-suat-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify('Đã tải xuống file báo cáo CSV')
  }

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployeeId === 'all') return 'Tất cả nhân viên'
    const found = employeeList.find((e: any) => String(e.id || e.user_id) === selectedEmployeeId)
    return found ? found.name || found.user_name || found.username : 'Nhân viên'
  }, [selectedEmployeeId, employeeList])

  return (
    <div className="content reports-content">
      <div className="page-title report-title">
        <div>
          <p>Dành cho quản lý · Dữ liệu báo cáo hiệu suất</p>
          <h1>Báo cáo tổng hợp</h1>
        </div>
        <div className="report-filters">
          <label className="report-select">
            <CalendarDays size={16} />
            <select
              value={selectedPeriodIndex}
              onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
              aria-label="Chọn khoảng thời gian"
            >
              {
                PERIOD_OPTIONS.map((item, index) => (
                  <option key={item.label} value={index}>
                    {item.label}
                  </option>
                ))
              }
            </select>
          </label>
          <label className="report-select">
            <Users size={16} />
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              aria-label="Chọn nhân viên"
            >
              <option value="all">Tất cả nhân viên</option>
              {employeeList.map((emp: any) => {
                const id = emp.id || emp.user_id
                const name = emp.name || emp.user_name || emp.username || `NV #${id}`
                return (
                  <option key={id} value={String(id)}>
                    {name}
                  </option>
                )
              })}
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="apply"
            type="button"
            onClick={() =>
              notify(`Đã cập nhật báo cáo: ${selectedEmployeeName} · ${currentPeriod.label}`)
            }
          >
            Áp dụng
          </button>
        </div>
      </div>

      <section className="report-filter-note">
        <Info size={14} /> Đang xem: <b>{selectedEmployeeName}</b> · <span>{currentPeriod.label}</span>
      </section>

      <section className="report-metrics">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
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
      </section>

      <div className="report-main-grid">
        <ReportChart values={chartData} />

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
          <div className="total-booked">
            <CalendarDays size={21} />
            <span>Tổng đơn đã hẹn:</span>
            <strong>{upcomingAppointments.reduce((sum, val) => sum + val.count, 0)}</strong>
          </div>
          <div className="upcoming-bottom">
            <div>
              <UserCheck size={21} />
              <span>
                Khách tiềm năng: <b>{totals.leads} khách</b>
              </span>
            </div>
            <div>
              <MessageCircle size={21} />
              <span>
                Đơn đã chốt: <b>{totals.closed} đơn</b>
              </span>
            </div>
          </div>
        </section>
      </div>

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
                    'Thời gian',
                    'Cuộc gọi',
                    'Kết nối',
                    'Tiềm năng',
                    'Đã chốt',
                    'Trả về',
                    'Tỷ lệ chốt',
                    'Hoa hồng',
                  ].map((x) => (
                    <th key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((person, idx) => {
                  const hours = Math.round((person.tong_tg_dam_thoai || 0) / 60)
                  const calls = person.tong_total_call || 0
                  const connected = person.tong_call_answer || 0
                  const leads = (person.tong_giu_lai_cs || 0) + (person.tong_hen_goi_lai || 0)
                  const closed = person.tong_da_chot || 0
                  const returned = person.tong_don_tra_ve || 0
                  const rate = connected > 0 ? `${((closed / connected) * 100).toFixed(1)}%` : '0%'
                  const commission = closed * 150000

                  return (
                    <tr key={person.user_id || idx}>
                      <td>{person.user_name || `Nhân viên #${person.user_id}`}</td>
                      <td>{hours} giờ</td>
                      <td>{calls}</td>
                      <td>{connected}</td>
                      <td>{leads}</td>
                      <td>{closed}</td>
                      <td>{returned}</td>
                      <td>{rate}</td>
                      <td>{formatVND(commission)}</td>
                    </tr>
                  )
                })}
                <tr className="total-row">
                  <td>Tổng cộng</td>
                  <td>{totals.hours} giờ</td>
                  <td>{totals.calls}</td>
                  <td>{totals.connected}</td>
                  <td>{totals.leads}</td>
                  <td>{totals.closed}</td>
                  <td>{totals.returned}</td>
                  <td>
                    {totals.connected > 0
                      ? `${((totals.closed / totals.connected) * 100).toFixed(1)}%`
                      : '0%'}
                  </td>
                  <td>{formatVND(totals.commission)}</td>
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
