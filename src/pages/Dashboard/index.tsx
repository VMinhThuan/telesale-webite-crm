import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  MoreHorizontal,
  Phone,
  ShoppingCart,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react'
import { ChartPoint, PeriodType, SummaryCardItem } from '../../types'
import { notify } from '../../utils/notify'
import { useAuth } from '../../hooks/useAuth'
import { useDailyResults } from '../../hooks/useTelesale'
import { formatVND } from '../../utils/formatters'

interface DashboardProps {
  period: PeriodType
}

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
  const { user } = useAuth()
  const { data: dailyResults } = useDailyResults()

  // Dữ liệu thật từ API 10b (POST /api/telesale/daily-results)
  const totalCalls = dailyResults?.tong_total_call ?? 0
  const connectedCalls = dailyResults?.tong_call_answer ?? 0
  const closedOrders = dailyResults?.tong_da_chot ?? 0
  const leadsCount =
    dailyResults?.tong_kh_tiem_nang ??
    ((dailyResults?.tong_giu_lai_cs || 0) + (dailyResults?.tong_hen_goi_lai || 0))
  const talkTimeMins = dailyResults?.tong_tg_dam_thoai ?? 0
  const revenue = dailyResults?.doanh_so ?? closedOrders * 150000
  const closeRate =
    connectedCalls > 0 ? `${((closedOrders / connectedCalls) * 100).toFixed(1)}%` : '0%'

  const cards: SummaryCardItem[] = [
    {
      label: 'Tổng doanh số',
      value: formatVND(revenue),
      change: 'Hôm nay',
      icon: TrendingUp,
      tone: 'blue',
    },
    {
      label: 'Tổng cuộc gọi',
      value: `${totalCalls} cuộc`,
      change: `${connectedCalls} kết nối`,
      icon: Phone,
      tone: 'teal',
    },
    {
      label: 'Đơn đã chốt',
      value: `${closedOrders} đơn`,
      change: `Tỷ lệ ${closeRate}`,
      icon: ShoppingCart,
      tone: 'blue',
    },
    {
      label: 'Khách tiềm năng',
      value: `${leadsCount} khách`,
      change: 'Hôm nay',
      icon: Target,
      tone: 'rose',
    },
  ]

  const metrics = [
    { label: 'Thời gian đàm thoại', value: `${talkTimeMins} phút`, icon: Clock3 },
    { label: 'Tổng số cuộc gọi', value: `${totalCalls} cuộc`, icon: Phone },
    { label: 'Kết nối thành công', value: `${connectedCalls} cuộc`, icon: Users },
    { label: 'Khách tiềm năng', value: `${leadsCount} khách`, icon: Target },
    { label: 'Đã chốt hôm nay', value: `${closedOrders} đơn`, icon: CheckCircle2 },
  ]

  const chartSeries: ChartPoint[] = [
    { date: '08:00', value: 0 },
    { date: '11:00', value: Math.round((revenue * 0.3) / 1000) },
    { date: '14:00', value: Math.round((revenue * 0.7) / 1000) },
    { date: 'Hôm nay', value: Math.round(revenue / 1000) },
  ]

  const tableRows = [
    [
      dailyResults?.date || 'Hôm nay',
      `${talkTimeMins} phút`,
      String(totalCalls),
      String(connectedCalls),
      String(leadsCount),
      String(closedOrders),
      closeRate,
    ],
  ]

  return (
    <div className="content">
      <div className="page-title">
        <div>
          <p>
            Xin chào, {user?.name || user?.username || 'Nhân viên'} <span>👋</span>
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
          <span>Dữ liệu thời gian thực từ ERP</span>
        </div>
        <div className="summary-grid">
          {cards.map(({ label, value, change, icon: Icon, tone }) => (
            <article className={`summary-card ${tone}`} key={label}>
              <div className="card-icon">
                <Icon size={22} />
              </div>
              <div>
                <p>{label}</p>
                <strong>{value}</strong>
                <small>{change}</small>
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

      <CommissionChart series={chartSeries} />

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
          {metrics.map(({ label, value, icon: Icon }) => (
            <div className="metric" key={label}>
              <div className="metric-icon">
                <Icon size={20} />
              </div>
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
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
                  'Thời gian đàm thoại',
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
              {tableRows.map((r, i) => (
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
