import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  MoreHorizontal,
  Phone,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ChartPoint, PeriodData, PeriodType, SummaryCardItem } from '../../types'
import { notify } from '../../utils/notify'

interface DashboardProps {
  period: PeriodType
}

const summaryCards: SummaryCardItem[] = [
  { label: 'Tổng hoa hồng', value: '7.250.000đ', change: '+12,5%', icon: TrendingUp, tone: 'blue' },
  { label: 'Số đơn trung bình/ngày', value: '8 đơn', change: '+8,2%', icon: Target, tone: 'teal' },
  { label: 'Đơn đã chốt', value: '24 đơn', change: '+16,8%', icon: ShoppingCart, tone: 'blue' },
  { label: 'Đơn trả về', value: '2 đơn', change: '−4,3%', icon: FileText, tone: 'rose' },
]

const defaultPeriodData: Record<PeriodType, PeriodData> = {
  'Hôm nay': {
    commission: '850.000đ',
    orders: '3 đơn',
    returned: '0 đơn',
    avg: '3 đơn',
    calls: '18',
    connections: '9',
    leads: '5',
    closed: '3',
    work: '2 giờ 35 phút',
    chart: [
      { date: '09:00', value: 120 },
      { date: '10:00', value: 260 },
      { date: '11:00', value: 410 },
      { date: '13:00', value: 530 },
      { date: '14:00', value: 680 },
      { date: '15:00', value: 850 },
    ],
    rows: [['Hôm nay', '2 giờ 35 phút', '18', '9', '5', '3', '33,3%']],
  },
  '7 ngày gần nhất': {
    commission: '7.250.000đ',
    orders: '24 đơn',
    returned: '2 đơn',
    avg: '8 đơn',
    calls: '86',
    connections: '42',
    leads: '21',
    closed: '8',
    work: '7 giờ 30 phút',
    chart: [
      { date: '18/09', value: 800 },
      { date: '19/09', value: 1100 },
      { date: '20/09', value: 950 },
      { date: '21/09', value: 1250 },
      { date: '22/09', value: 1600 },
      { date: '23/09', value: 1350 },
      { date: '24/09', value: 1700 },
    ],
    rows: [
      ['24/09/2025', '7 giờ 30 phút', '86', '42', '21', '8', '19,0%'],
      ['23/09/2025', '7 giờ 15 phút', '80', '40', '18', '6', '15,0%'],
      ['22/09/2025', '8 giờ', '90', '45', '24', '9', '20,0%'],
    ],
  },
  'Tháng 09/2025': {
    commission: '21.450.000đ',
    orders: '82 đơn',
    returned: '6 đơn',
    avg: '9 đơn',
    calls: '748',
    connections: '356',
    leads: '173',
    closed: '82',
    work: '64 giờ 15 phút',
    chart: [
      { date: 'Tuần 1', value: 3600 },
      { date: 'Tuần 2', value: 4900 },
      { date: 'Tuần 3', value: 5200 },
      { date: 'Tuần 4', value: 7750 },
    ],
    rows: [
      ['30/09/2025', '7 giờ 45 phút', '96', '44', '23', '9', '20,5%'],
      ['29/09/2025', '8 giờ', '91', '42', '19', '8', '19,0%'],
      ['28/09/2025', '7 giờ 30 phút', '84', '39', '18', '7', '17,9%'],
    ],
  },
  'Tháng 10/2025': {
    commission: '12.800.000đ',
    orders: '47 đơn',
    returned: '3 đơn',
    avg: '8 đơn',
    calls: '412',
    connections: '198',
    leads: '92',
    closed: '47',
    work: '38 giờ 20 phút',
    chart: [
      { date: 'Tuần 1', value: 2800 },
      { date: 'Tuần 2', value: 4100 },
      { date: 'Tuần 3', value: 5900 },
    ],
    rows: [
      ['14/10/2025', '7 giờ 20 phút', '83', '40', '18', '8', '20,0%'],
      ['13/10/2025', '8 giờ', '89', '43', '20', '9', '20,9%'],
      ['12/10/2025', '7 giờ 15 phút', '76', '36', '17', '6', '16,7%'],
    ],
  },
}

const performanceMetrics = [
  { label: 'Thời gian làm việc', key: 'work' as const, icon: Clock3 },
  { label: 'Tổng số cuộc gọi', key: 'calls' as const, icon: Phone },
  { label: 'Kết nối', key: 'connections' as const, icon: Users },
  { label: 'Khách tiềm năng', key: 'leads' as const, icon: Target },
  { label: 'Đã chốt', key: 'closed' as const, icon: CheckCircle2 },
]

function CommissionChart({ series }: { series: ChartPoint[] }) {
  const [active, setActive] = useState(series.length - 1)
  useEffect(() => setActive(series.length - 1), [series])

  const chartMax = Math.ceil(Math.max(...series.map((item) => item.value)) / 500) * 500 || 500
  const step = series.length > 1 ? 852 / (series.length - 1) : 0
  const points = series
    .map((item, index) => `${55 + index * step},${234 - (item.value / chartMax) * 210}`)
    .join(' ')
  const activePoint = series[active] || series[0]

  return (
    <section className="panel chart-panel new-chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">DOANH THU</p>
          <h2>Hoa hồng theo ngày</h2>
        </div>
        <div className="chart-summary">
          <span>Ngày {activePoint?.date}</span>
          <strong>
            {new Intl.NumberFormat('vi-VN').format((activePoint?.value || 0) * 1000)}đ
          </strong>
          <button className="subtle-select" type="button">
            7 ngày gần nhất <ChevronDown size={16} />
          </button>
        </div>
      </div>
      <div className="commission-chart" role="img" aria-label="Biểu đồ hoa hồng">
        <div className="commission-axis">
          {[chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0].map((value) => (
            <span key={value}>{value ? `${(value / 1000).toLocaleString('vi-VN')}tr` : '0'}</span>
          ))}
        </div>
        <svg viewBox="0 0 940 270" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="commissionArea" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor="#2d7be8" stopOpacity=".24" />
              <stop offset="1" stopColor="#2d7be8" stopOpacity=".01" />
            </linearGradient>
          </defs>
          <g className="commission-grid">
            <line x1="35" x2="915" y1="24" y2="24" />
            <line x1="35" x2="915" y1="76" y2="76" />
            <line x1="35" x2="915" y1="129" y2="129" />
            <line x1="35" x2="915" y1="181" y2="181" />
            <line x1="35" x2="915" y1="234" y2="234" />
          </g>
          <path
            d={`M ${points.split(' ').join(' L ')} L ${55 + (series.length - 1) * step},234 L 55,234 Z`}
            fill="url(#commissionArea)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="#2473dc"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {series.map((item, index) => {
            const x = 55 + index * step
            const y = 234 - (item.value / chartMax) * 210
            return (
              <g
                className="commission-point"
                onClick={() => setActive(index)}
                key={item.date}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={active === index ? 8 : 6}
                  fill="#fff"
                  stroke="#2473dc"
                  strokeWidth="3"
                />
                <text x={x} y={y - 17} textAnchor="middle">
                  {(item.value / 1000).toLocaleString('vi-VN')}tr
                </text>
                <text className="commission-date" x={x} y="260" textAnchor="middle">
                  {item.date}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}

export const Dashboard: React.FC<DashboardProps> = ({ period }) => {
  const data = defaultPeriodData[period] || defaultPeriodData['7 ngày gần nhất']

  const getDashboardValue = (label: string, fallback: string) => {
    switch (label) {
      case 'Tổng hoa hồng':
        return data.commission
      case 'Số đơn trung bình/ngày':
        return data.avg
      case 'Đơn đã chốt':
        return data.orders
      case 'Đơn trả về':
        return data.returned
      default:
        return fallback
    }
  }

  return (
    <div className="content">
      <div className="page-title">
        <div>
          <p>
            Xin chào, Nguyễn Văn A <span>👋</span>
          </p>
          <h1>Tổng quan công việc</h1>
        </div>
        <button
          className="help"
          type="button"
          onClick={() => notify('Hướng dẫn sử dụng Dashboard SalesFlow')}
        >
          <CircleHelp size={17} /> Hướng dẫn
        </button>
      </div>

      <section className="summary-section">
        <div className="section-caption">
          <h2>Tổng quan · {period}</h2>
          <span>Dữ liệu được cập nhật theo kỳ</span>
        </div>
        <div className="summary-grid">
          {summaryCards.map(({ label, value, change, icon: Icon, tone }) => (
            <article className={`summary-card ${tone}`} key={label}>
              <div className="card-icon">
                <Icon size={22} />
              </div>
              <div>
                <p>{label}</p>
                <strong>{getDashboardValue(label, value)}</strong>
                <small className={change.includes('−') ? 'down' : ''}>
                  {change} so với kỳ trước
                </small>
              </div>
              <button
                type="button"
                onClick={() => notify(`Tùy chọn: ${label}`)}
              >
                <MoreHorizontal size={19} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <CommissionChart series={data.chart} />

      <section className="panel performance-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">HIỆU SUẤT</p>
            <h2>Hiệu suất làm việc</h2>
          </div>
          <button
            className="subtle-select"
            type="button"
            onClick={() => notify('Đang mở chi tiết báo cáo hiệu suất')}
          >
            Xem báo cáo <ChevronDown size={16} />
          </button>
        </div>
        <div className="metric-grid">
          {performanceMetrics.map(({ label, key, icon: Icon }) => (
            <div className="metric" key={label}>
              <div className="metric-icon">
                <Icon size={20} />
              </div>
              <div>
                <span>{label}</span>
                <strong>{data[key]}</strong>
              </div>
            </div>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Ngày',
                  'Thời gian làm việc',
                  'Tổng số cuộc gọi',
                  'Kết nối',
                  'Khách tiềm năng',
                  'Đã chốt',
                  'Tỷ lệ chốt',
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={j === 6 ? 'rate' : ''}>
                      {j === 5 ? <span className="closed">{c}</span> : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
