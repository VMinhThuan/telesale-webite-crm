import React, { useState } from 'react'
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
import { StaffPerformance } from '../../types'
import { notify } from '../../utils/notify'

interface ReportPeriodItem {
  label: string
  multiplier: number
  days: number
  chart: string[]
}

const reportPeriods: ReportPeriodItem[] = [
  { label: '01/10/2026 — 04/10/2026', multiplier: 1, days: 4, chart: ['01/10', '02/10', '03/10', '04/10'] },
  { label: '05/10/2026 — 11/10/2026', multiplier: 0.84, days: 7, chart: ['05/10', '06/10', '07/10', '08/10', '09/10', '10/10', '11/10'] },
  { label: 'Tháng 09/2026', multiplier: 5.2, days: 30, chart: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'] },
]

const reportStaff: StaffPerformance[] = [
  { name: 'Nguyễn Văn A', hours: 24, calls: 300, connected: 150, leads: 75, closed: 30, returned: 2, commission: 2750000 },
  { name: 'Trần Thị Lan', hours: 24, calls: 280, connected: 140, leads: 70, closed: 28, returned: 1, commission: 2500000 },
  { name: 'Lê Văn Hùng', hours: 24, calls: 280, connected: 130, leads: 65, closed: 22, returned: 2, commission: 2000000 },
]

const reportEmployeeOptions = ['Tất cả nhân viên', ...reportStaff.map((p) => p.name)]
const formatMoney = (val: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(val))}đ`
const asNumber = (val: number, mult: number) => Math.round(val * mult)

interface ChartPointData {
  day: string
  calls: number
  orders: number
}

function buildReportData(periodName: string, employee: string) {
  const period = reportPeriods.find((item) => item.label === periodName) || reportPeriods[0]
  const people = employee === 'Tất cả nhân viên' ? reportStaff : reportStaff.filter((p) => p.name === employee)
  const scale = period.multiplier

  const totals = people.reduce(
    (sum, person) => ({
      hours: sum.hours + asNumber(person.hours, scale),
      calls: sum.calls + asNumber(person.calls, scale),
      connected: sum.connected + asNumber(person.connected, scale),
      leads: sum.leads + asNumber(person.leads, scale),
      closed: sum.closed + asNumber(person.closed, scale),
      returned: sum.returned + asNumber(person.returned, scale),
      commission: sum.commission + Math.round(person.commission * scale),
    }),
    { hours: 0, calls: 0, connected: 0, leads: 0, closed: 0, returned: 0, commission: 0 },
  )

  const totalAllCalls = reportStaff.reduce((sum, p) => sum + p.calls, 0)
  const ratio = people.reduce((sum, p) => sum + p.calls, 0) / (totalAllCalls || 1)
  const baseCalls =
    period.chart.length === 4
      ? [200, 220, 210, 230]
      : period.chart.length === 7
      ? [118, 132, 125, 143, 137, 149, 156]
      : [1740, 1920, 1810, 2005]

  const baseOrders =
    period.chart.length === 4
      ? [18, 20, 19, 23]
      : period.chart.length === 7
      ? [11, 13, 12, 14, 13, 16, 17]
      : [158, 176, 166, 190]

  const chart: ChartPointData[] = period.chart.map((day, index) => ({
    day,
    calls: Math.max(1, Math.round(baseCalls[index] * scale * ratio)),
    orders: Math.max(0, Math.round(baseOrders[index] * scale * ratio)),
  }))

  const appointments = [8, 9, 7].map((amount, index) =>
    Math.max(0, Math.round(amount * scale * ratio + (index === 1 ? 0.2 : 0))),
  )

  return {
    period,
    people,
    totals,
    chart,
    appointments,
    care: Math.max(1, Math.round(12 * scale * ratio)),
    consulting: Math.max(1, Math.round(18 * scale * ratio)),
  }
}

function ReportChart({ values }: { values: ChartPointData[] }) {
  const maxCalls = Math.max(50, Math.ceil(Math.max(...values.map((item) => item.calls)) / 50) * 50)
  const maxOrders = Math.max(1, Math.max(...values.map((item) => item.orders)))
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
          style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}
        >
          {values.map((item) => (
            <div className="bar-group" key={item.day}>
              <div className="bar-zone">
                <span
                  className="call-bar"
                  title={`${item.calls} cuộc gọi`}
                  style={{ height: `${(item.calls / maxCalls) * 100}%` }}
                >
                  <b>{item.calls}</b>
                </span>
                <span
                  className="order-bar"
                  title={`${item.orders} đơn chốt`}
                  style={{ height: `${(item.orders / maxOrders) * 100}%` }}
                >
                  <b>{item.orders}</b>
                </span>
              </div>
              <small>{item.day}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="chart-footnote">Dữ liệu được cập nhật theo bộ lọc đang chọn.</p>
    </section>
  )
}

export const Reports: React.FC = () => {
  const [period, setPeriod] = useState(reportPeriods[0].label)
  const [employee, setEmployee] = useState('Tất cả nhân viên')

  const data = buildReportData(period, employee)
  const { totals } = data

  const metrics = [
    { label: 'Thời gian làm việc', value: `${totals.hours} giờ`, icon: Clock3, tone: 'blue' },
    { label: 'Tổng số cuộc gọi', value: String(totals.calls), icon: Phone, tone: 'green' },
    { label: 'Kết nối', value: String(totals.connected), icon: Users, tone: 'blue' },
    { label: 'Khách tiềm năng', value: String(totals.leads), icon: UserCheck, tone: 'amber' },
    { label: 'Đơn đã chốt', value: String(totals.closed), icon: ShoppingCart, tone: 'green' },
    { label: 'Đơn trả về', value: String(totals.returned), icon: Undo2, tone: 'rose' },
    {
      label: 'Số đơn trung bình/ngày',
      value: String(Math.max(0, Math.round(totals.closed / data.period.days))),
      icon: BarChart3,
      tone: 'blue',
    },
    { label: 'Tổng hoa hồng', value: formatMoney(totals.commission), icon: Coins, tone: 'amber' },
  ]

  const appointmentDays = ['T2 · 05/10', 'T3 · 06/10', 'T4 · 07/10']

  const handleExportCSV = () => {
    const csvContent =
      'Nhân viên,Cuộc gọi,Kết nối,Đã chốt,Hoa hồng\n' +
      data.people
        .map(
          (p) =>
            `${p.name},${asNumber(p.calls, data.period.multiplier)},${asNumber(
              p.connected,
              data.period.multiplier,
            )},${asNumber(p.closed, data.period.multiplier)},${Math.round(
              p.commission * data.period.multiplier,
            )}`,
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
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              aria-label="Chọn khoảng thời gian"
            >
              {reportPeriods.map((item) => (
                <option key={item.label}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="report-select">
            <Users size={16} />
            <select
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              aria-label="Chọn nhân viên"
            >
              {reportEmployeeOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <button
            className="apply"
            type="button"
            onClick={() => notify(`Đã áp dụng báo cáo: ${employee} · ${period}`)}
          >
            Áp dụng
          </button>
        </div>
      </div>

      <section className="report-filter-note">
        <Info size={14} /> Đang xem: <b>{employee}</b> · <span>{period}</span>
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
        <ReportChart values={data.chart} />

        <section className="call-panel upcoming">
          <div className="call-panel-heading">
            <div>
              <p className="eyebrow">LỊCH HẸN</p>
              <h2>Lịch hẹn 3 ngày tới</h2>
            </div>
          </div>
          <div className="upcoming-days">
            {appointmentDays.map((day, index) => (
              <div className={['blue', 'green', 'amber'][index]} key={day}>
                <CalendarDays size={17} />
                <span>{day}</span>
                <b>{data.appointments[index]} đơn</b>
              </div>
            ))}
          </div>
          <div className="total-booked">
            <CalendarDays size={21} />
            <span>Tổng đơn đã hẹn:</span>
            <strong>{data.appointments.reduce((sum, val) => sum + val, 0)}</strong>
          </div>
          <div className="upcoming-bottom">
            <div>
              <UserCheck size={21} />
              <span>
                Cần chăm sóc <b>{data.care} khách</b>
              </span>
            </div>
            <div>
              <MessageCircle size={21} />
              <span>
                Đang tư vấn <b>{data.consulting} khách</b>
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
              {data.people.map((person) => {
                const row = {
                  hours: asNumber(person.hours, data.period.multiplier),
                  calls: asNumber(person.calls, data.period.multiplier),
                  connected: asNumber(person.connected, data.period.multiplier),
                  leads: asNumber(person.leads, data.period.multiplier),
                  closed: asNumber(person.closed, data.period.multiplier),
                  returned: asNumber(person.returned, data.period.multiplier),
                  commission: Math.round(person.commission * data.period.multiplier),
                }
                return (
                  <tr key={person.name}>
                    <td>{person.name}</td>
                    <td>{row.hours} giờ</td>
                    <td>{row.calls}</td>
                    <td>{row.connected}</td>
                    <td>{row.leads}</td>
                    <td>{row.closed}</td>
                    <td>{row.returned}</td>
                    <td>
                      {row.connected
                        ? `${((row.closed / row.connected) * 100).toFixed(1).replace('.', ',')}%`
                        : '0%'}
                    </td>
                    <td>{formatMoney(row.commission)}</td>
                  </tr>
                )
              })}
              <tr className="total-row">
                {[
                  'Tổng',
                  `${totals.hours} giờ`,
                  totals.calls,
                  totals.connected,
                  totals.leads,
                  totals.closed,
                  totals.returned,
                  totals.connected
                    ? `${((totals.closed / totals.connected) * 100).toFixed(1).replace('.', ',')}%`
                    : '0%',
                  formatMoney(totals.commission),
                ].map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="report-caption">
          <Info size={14} /> Tỷ lệ chốt = Đơn đã chốt / Kết nối. Dữ liệu được tính toán theo thời gian thực.
        </p>
      </section>
    </div>
  )
}
