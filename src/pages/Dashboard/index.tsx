import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock3,
  MoreHorizontal,
  Phone,
  PhoneCall,
  ShieldCheck,
  ShoppingCart,
  Target,
  TrendingUp,
} from 'lucide-react'
import { PeriodType, SummaryCardItem } from '../../types'
import { notify } from '../../utils/notify'
import { useDailyResults } from '../../hooks/useTelesale'
import { useOrdersList } from '../../hooks/useOrders'
import { useCustomersList } from '../../hooks/useCustomers'
import { formatVND } from '../../utils/formatters'
import dayjs from '../../lib/dayjs'

interface DashboardProps {
  period: PeriodType
}

type DatePreset = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'custom'

interface DateRangeState {
  preset: DatePreset
  fromDate: string
  toDate: string
  label: string
}

/**
 * Helper tính toán khoảng ngày theo Preset chuẩn
 */
function getPresetRange(preset: DatePreset): { fromDate: string; toDate: string; label: string } {
  const today = dayjs()
  switch (preset) {
    case 'today':
      return {
        fromDate: today.format('YYYY-MM-DD'),
        toDate: today.format('YYYY-MM-DD'),
        label: `Hôm nay · ${today.format('DD/MM/YYYY')}`,
      }
    case 'yesterday': {
      const y = today.subtract(1, 'day')
      return {
        fromDate: y.format('YYYY-MM-DD'),
        toDate: y.format('YYYY-MM-DD'),
        label: `Hôm qua · ${y.format('DD/MM/YYYY')}`,
      }
    }
    case '7days':
      return {
        fromDate: today.subtract(6, 'day').format('YYYY-MM-DD'),
        toDate: today.format('YYYY-MM-DD'),
        label: `7 ngày qua (${today.subtract(6, 'day').format('DD/MM')} - ${today.format('DD/MM')})`,
      }
    case 'thisMonth':
      return {
        fromDate: today.startOf('month').format('YYYY-MM-DD'),
        toDate: today.format('YYYY-MM-DD'),
        label: `Tháng ${today.format('MM/YYYY')}`,
      }
    default:
      return {
        fromDate: today.format('YYYY-MM-DD'),
        toDate: today.format('YYYY-MM-DD'),
        label: 'Tùy chọn',
      }
  }
}

/**
 * Component Phễu chuyển đổi cuộc gọi (Call Conversion Funnel)
 */
function CallConversionFunnel({
  totalCalls,
  connectedCalls,
  leadsCount,
  closedOrders,
  confirmedOrders,
  returnedOrders,
  talkTimeMins,
  periodLabel,
}: {
  totalCalls: number
  connectedCalls: number
  leadsCount: number
  closedOrders: number
  confirmedOrders: number
  returnedOrders: number
  talkTimeMins: number
  periodLabel: string
}) {
  // Tính toán các tỷ lệ chuyển đổi
  const answerRate = totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0'
  const closeRate = connectedCalls > 0 ? ((closedOrders / connectedCalls) * 100).toFixed(1) : '0'
  const returnRate = closedOrders > 0 ? ((returnedOrders / closedOrders) * 100).toFixed(1) : '0'
  const avgTalkSec = connectedCalls > 0 ? Math.round((talkTimeMins * 60) / connectedCalls) : 0

  // 5 Tầng của phễu chuyển đổi
  const funnelSteps = [
    {
      id: 'step-total',
      title: '1. Tổng cuộc gọi phát sinh',
      value: totalCalls,
      unit: 'cuộc',
      percentOfTotal: 100,
      color: '#2575df',
      bgColor: '#e8f2ff',
      barColor: 'linear-gradient(90deg, #2575df 0%, #4f96f6 100%)',
      icon: Phone,
    },
    {
      id: 'step-connected',
      title: '2. Kết nối thành công (Nghe máy)',
      value: connectedCalls,
      unit: 'cuộc',
      percentOfTotal: totalCalls > 0 ? Math.max((connectedCalls / totalCalls) * 100, 3) : 0,
      color: '#0bad79',
      bgColor: '#e4faf4',
      barColor: 'linear-gradient(90deg, #0bad79 0%, #34d399 100%)',
      icon: PhoneCall,
    },
    {
      id: 'step-leads',
      title: '3. Khách hàng tiềm năng & Hẹn gọi lại',
      value: leadsCount,
      unit: 'khách',
      percentOfTotal: totalCalls > 0 ? Math.max((leadsCount / totalCalls) * 100, 2) : 0,
      color: '#d97706',
      bgColor: '#fef3c7',
      barColor: 'linear-gradient(90deg, #d97706 0%, #fbbf24 100%)',
      icon: Target,
    },
    {
      id: 'step-closed',
      title: '4. Đơn hàng chốt thành công',
      value: closedOrders,
      unit: 'đơn',
      percentOfTotal: totalCalls > 0 ? Math.max((closedOrders / totalCalls) * 100, 1.5) : 0,
      color: '#6366f1',
      bgColor: '#e0e7ff',
      barColor: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
      icon: ShoppingCart,
    },
    {
      id: 'step-confirmed',
      title: '5. Đơn hàng đã xác nhận thành công',
      value: confirmedOrders,
      unit: 'đơn',
      percentOfTotal: totalCalls > 0 ? Math.max((confirmedOrders / totalCalls) * 100, 1) : 0,
      color: '#10b981',
      bgColor: '#d1fae5',
      barColor: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
      icon: ShieldCheck,
    },
  ]

  return (
    <section className="panel" style={{ marginTop: '20px' }}>
      <div className="panel-heading" style={{ marginBottom: '14px' }}>
        <div>
          <p className="eyebrow">HIỆU QUẢ CHUYỂN ĐỔI</p>
          <h2>Phễu chuyển đổi đàm thoại Telesale</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#687f9d', background: '#f0f4fa', padding: '5px 10px', borderRadius: '6px', fontWeight: 600 }}>
            Khoảng thời gian: {periodLabel}
          </span>
        </div>
      </div>

      {/* Bố cục 2 cột (Phương án A): Cột trái (Phễu 5 tầng Compact) + Cột phải (4 KPI Tỷ lệ Vàng 2x2) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {/* Cột trái: Phễu chuyển đổi 5 tầng dạng Compact Streamlined List */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e8eff8',
            borderRadius: '10px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 2px 6px rgba(23, 59, 116, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4d658d', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Dòng chuyển đổi qua các tầng
            </span>
            <span style={{ fontSize: '11px', color: '#8898b0' }}>
              Tỷ lệ so với tổng Data
            </span>
          </div>

          {funnelSteps.map((step) => {
            const StepIcon = step.icon
            const visualWidth = Math.max(step.percentOfTotal, totalCalls > 0 ? 5 : 100)

            return (
              <div key={step.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: step.bgColor,
                        color: step.color,
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <StepIcon size={13} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#1e3562', fontWeight: 600 }}>
                      {step.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#1c345e' }}>{step.value}</strong>{' '}
                      <span style={{ fontSize: '11px', color: '#7588a3' }}>{step.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Thanh tiến độ mỏng thanh thoát */}
                <div
                  style={{
                    height: '5px',
                    borderRadius: '3px',
                    background: '#f1f5f9',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${visualWidth}%`,
                      background: step.barColor,
                      borderRadius: '3px',
                      transition: 'width 0.4s ease-out',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Cột phải: 4 Chỉ số KPI Tỷ lệ vàng dạng lưới 2x2 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e4ecf7',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <PhoneCall size={14} color="#0bad79" />
                <span style={{ fontSize: '11px', color: '#6e809c', fontWeight: 600 }}>Tỷ lệ nghe máy</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#0bad79', display: 'block' }}>{answerRate}%</strong>
            </div>
            <small style={{ fontSize: '11px', color: '#8898b0', marginTop: '4px' }}>
              {connectedCalls} / {totalCalls} cuộc gọi
            </small>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e4ecf7',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Clock3 size={14} color="#2575df" />
                <span style={{ fontSize: '11px', color: '#6e809c', fontWeight: 600 }}>Đàm thoại TB</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#2575df', display: 'block' }}>{avgTalkSec}s / cuộc</strong>
            </div>
            <small style={{ fontSize: '11px', color: '#8898b0', marginTop: '4px' }}>
              Tổng thời gian: {talkTimeMins} phút
            </small>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e4ecf7',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <ShoppingCart size={14} color="#6366f1" />
                <span style={{ fontSize: '11px', color: '#6e809c', fontWeight: 600 }}>Tỷ lệ chốt đơn</span>
              </div>
              <strong style={{ fontSize: '20px', color: '#6366f1', display: 'block' }}>{closeRate}%</strong>
            </div>
            <small style={{ fontSize: '11px', color: '#8898b0', marginTop: '4px' }}>
              {closedOrders} đơn / {connectedCalls} kết nối
            </small>
          </div>

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e4ecf7',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={14} color={returnedOrders > 0 ? '#e11d48' : '#059669'} />
                <span style={{ fontSize: '11px', color: '#6e809c', fontWeight: 600 }}>Đơn trả về (Rủi ro)</span>
              </div>
              <strong style={{ fontSize: '20px', color: returnedOrders > 0 ? '#e11d48' : '#059669', display: 'block' }}>
                {returnedOrders} đơn
              </strong>
            </div>
            <small style={{ fontSize: '11px', color: '#8898b0', marginTop: '4px' }}>
              Tỷ lệ trả về: {returnRate}%
            </small>
          </div>
        </div>
      </div>
    </section>
  )
}

export const Dashboard: React.FC<DashboardProps> = ({ period: _period }) => {
  const navigate = useNavigate()

  // 1. Quản lý trạng thái Bộ lọc thời gian (Date Range Filter)
  const [dateRange, setDateRange] = useState<DateRangeState>(() => {
    const init = getPresetRange('today')
    return {
      preset: 'today',
      fromDate: init.fromDate,
      toDate: init.toDate,
      label: init.label,
    }
  })

  // State hỗ trợ ô nhập tùy chọn ngày
  const [customFrom, setCustomFrom] = useState(() => dayjs().subtract(6, 'day').format('YYYY-MM-DD'))
  const [customTo, setCustomTo] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [showCustomInputs, setShowCustomInputs] = useState(false)

  // Xử lý đổi Preset thời gian
  const handleSelectPreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustomInputs(true)
      return
    }
    setShowCustomInputs(false)
    const range = getPresetRange(preset)
    setDateRange({
      preset,
      fromDate: range.fromDate,
      toDate: range.toDate,
      label: range.label,
    })
  }

  // Xử lý áp dụng khoảng ngày tùy chọn
  const handleApplyCustomRange = () => {
    if (!customFrom || !customTo) {
      notify('Vui lòng chọn đầy đủ từ ngày và đến ngày')
      return
    }
    const diffDays = dayjs(customTo).diff(dayjs(customFrom), 'day')
    if (diffDays < 0) {
      notify('Ngày bắt đầu không được lớn hơn ngày kết thúc')
      return
    }
    if (diffDays > 31) {
      notify('ERP chỉ hỗ trợ tra cứu tối đa khoảng cách 31 ngày')
      return
    }

    setDateRange({
      preset: 'custom',
      fromDate: customFrom,
      toDate: customTo,
      label: `${dayjs(customFrom).format('DD/MM')} - ${dayjs(customTo).format('DD/MM/YYYY')}`,
    })
    setShowCustomInputs(false)
  }

  // 2. Dữ liệu hiệu suất telesale theo khoảng ngày chọn (API 10b: POST /api/telesale/daily-results)
  const { data: dailyResults } = useDailyResults({
    from_date: dateRange.fromDate,
    to_date: dateRange.toDate,
  })

  // 3. Dữ liệu đơn hàng theo khoảng ngày chọn (API 11b & 12: POST /api/telesale/orders)
  const { data: ordersData } = useOrdersList({
    from_date: dateRange.fromDate,
    to_date: dateRange.toDate,
    page_size: 100,
  })

  // 4. Lấy danh sách việc cần làm của NGÀY HÔM NAY (cố định để tác nghiệp trong ca)
  const todayStr = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const { data: todayOrdersData } = useOrdersList({
    from_date: todayStr,
    to_date: todayStr,
    page_size: 50,
  })

  const { data: callbackCustomersData } = useCustomersList({
    customer_status: 'potential',
    care_status: 'callback',
    next_care_date: todayStr,
    page_size: 5,
  })

  // Danh sách đơn hàng trong khoảng ngày đã chọn
  const ordersList = useMemo(() => ordersData?.items || [], [ordersData])

  // Tính tổng doanh số theo khoảng thời gian đã chọn (loại trừ đơn hủy/trả về/lùi)
  const actualRevenue = useMemo(() => {
    return ordersList
      .filter((o) => !['huy', 'tra_ve', 'lui', 'sai_may'].includes(o.status))
      .reduce((sum, o) => sum + (Number(o.doanh_so) || 0), 0)
  }, [ordersList])

  // Đơn hàng cần gọi xác nhận của HÔM NAY
  const pendingConfirmOrders = useMemo(() => {
    const list = todayOrdersData?.items || []
    return list.filter((o) => !o.sale_checked && o.trang_thai !== 'Đã xác nhận')
  }, [todayOrdersData])

  // Khách hàng hẹn gọi lại của HÔM NAY
  const callbackCustomers = useMemo(
    () => callbackCustomersData?.items || [],
    [callbackCustomersData],
  )

  // Trích xuất các chỉ số đàm thoại từ API 10b
  const totalCalls = dailyResults?.tong_total_call ?? 0
  const connectedCalls = dailyResults?.tong_call_answer ?? 0
  const closedOrders = dailyResults?.tong_da_chot ?? 0
  const confirmedOrders = dailyResults?.tong_don_da_xac_nhan ?? 0
  const returnedOrders = dailyResults?.tong_don_tra_ve ?? 0
  const leadsCount =
    (dailyResults?.tong_giu_lai_cs || 0) + (dailyResults?.tong_hen_goi_lai || 0)
  const talkTimeMins = dailyResults?.tong_tg_dam_thoai ?? 0
  const closeRate =
    connectedCalls > 0 ? `${((closedOrders / connectedCalls) * 100).toFixed(1)}%` : '0%'

  // 4 Thẻ KPI chính
  const cards: SummaryCardItem[] = [
    {
      label: 'Tổng doanh số',
      value: formatVND(actualRevenue),
      change: `${ordersList.length} đơn (${dateRange.preset === 'today' ? 'Hôm nay' : 'Lũy kế'})`,
      icon: TrendingUp,
      tone: 'blue',
    },
    {
      label: 'Tổng cuộc gọi',
      value: `${totalCalls} cuộc`,
      change: `${connectedCalls} kết nối (${closeRate})`,
      icon: Phone,
      tone: 'teal',
    },
    {
      label: 'Đơn đã chốt',
      value: `${closedOrders} đơn`,
      change: `${confirmedOrders} đơn đã xác nhận`,
      icon: ShoppingCart,
      tone: 'blue',
    },
    {
      label: 'Khách tiềm năng',
      value: `${leadsCount} khách`,
      change: `${dailyResults?.tong_giu_lai_cs || 0} giữ lại · ${dailyResults?.tong_hen_goi_lai || 0} hẹn lại`,
      icon: Target,
      tone: 'rose',
    },
  ]

  return (
    <div className="content">
      {/* Tiêu đề & Bộ chọn ngày tác nghiệp */}
      <section className="summary-section">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', color: '#1a335f', margin: '0 0 4px', fontWeight: 700 }}>
              Tổng quan hiệu suất Telesale
            </h2>
            <span style={{ fontSize: '11px', color: '#7a8ba3' }}>
              Đang xem: <b>{dateRange.label}</b> · Dữ liệu thời gian thực từ ERP
            </span>
          </div>

          {/* Thanh công cụ Preset bộ chọn ngày */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleSelectPreset('today')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: dateRange.preset === 'today' ? 700 : 500,
                background: dateRange.preset === 'today' ? '#2575df' : '#fff',
                color: dateRange.preset === 'today' ? '#fff' : '#4b6182',
                border: '1px solid #d9e3f0',
                cursor: 'pointer',
              }}
            >
              Hôm nay
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('yesterday')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: dateRange.preset === 'yesterday' ? 700 : 500,
                background: dateRange.preset === 'yesterday' ? '#2575df' : '#fff',
                color: dateRange.preset === 'yesterday' ? '#fff' : '#4b6182',
                border: '1px solid #d9e3f0',
                cursor: 'pointer',
              }}
            >
              Hôm qua
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('7days')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: dateRange.preset === '7days' ? 700 : 500,
                background: dateRange.preset === '7days' ? '#2575df' : '#fff',
                color: dateRange.preset === '7days' ? '#fff' : '#4b6182',
                border: '1px solid #d9e3f0',
                cursor: 'pointer',
              }}
            >
              7 ngày qua
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('thisMonth')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: dateRange.preset === 'thisMonth' ? 700 : 500,
                background: dateRange.preset === 'thisMonth' ? '#2575df' : '#fff',
                color: dateRange.preset === 'thisMonth' ? '#fff' : '#4b6182',
                border: '1px solid #d9e3f0',
                cursor: 'pointer',
              }}
            >
              Tháng này
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset('custom')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: dateRange.preset === 'custom' ? 700 : 500,
                background: dateRange.preset === 'custom' ? '#2575df' : '#fff',
                color: dateRange.preset === 'custom' ? '#fff' : '#4b6182',
                border: '1px solid #d9e3f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Calendar size={13} /> Tùy chọn ngày
            </button>
          </div>
        </div>

        {/* Khối nhập tùy chọn ngày nếu bấm Tùy chọn */}
        {showCustomInputs && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#f8fafd',
              border: '1px solid #dce5f2',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              marginBottom: '16px',
            }}
          >
            <span style={{ fontSize: '11px', color: '#556c8d', fontWeight: 600 }}>Từ ngày:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd8e8', fontSize: '11px' }}
            />
            <span style={{ fontSize: '11px', color: '#556c8d', fontWeight: 600 }}>Đến ngày:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ padding: '5px 8px', borderRadius: '5px', border: '1px solid #cbd8e8', fontSize: '11px' }}
            />
            <button
              type="button"
              onClick={handleApplyCustomRange}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#2575df',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                border: 0,
                cursor: 'pointer',
              }}
            >
              Áp dụng lọc
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInputs(false)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#e9eff7',
                color: '#657b9c',
                fontSize: '11px',
                border: 0,
                cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        )}

        {/* 4 Thẻ KPI đầu trang */}
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

      {/* Phương án 1: Phễu chuyển đổi cuộc gọi (Call Conversion Funnel) */}
      <CallConversionFunnel
        totalCalls={totalCalls}
        connectedCalls={connectedCalls}
        leadsCount={leadsCount}
        closedOrders={closedOrders}
        confirmedOrders={confirmedOrders}
        returnedOrders={returnedOrders}
        talkTimeMins={talkTimeMins}
        periodLabel={dateRange.label}
      />

      {/* Khối Việc ưu tiên trong ca làm HÔM NAY (Action Center) */}
      <section className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">TÁC NGHIỆP TRONG CA HÔM NAY</p>
            <h2>Việc ưu tiên cần xử lý ngay</h2>
          </div>
          <span style={{ fontSize: '11px', color: '#687f9d' }}>
            Hôm nay: <b>{dayjs().format('DD/MM/YYYY')}</b>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Cột 1: Đơn hàng cần gọi xác nhận hôm nay */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2eaf5',
              background: '#fcfdfe',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff4df', color: '#e08a18', display: 'grid', placeItems: 'center' }}>
                  <ShoppingCart size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13px', color: '#1e3765' }}>Đơn hẹn cần gọi xác nhận</h3>
                  <small style={{ color: '#7487a3' }}>{pendingConfirmOrders.length} đơn đang chờ xác nhận</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/orders')}
                style={{
                  background: 'transparent',
                  color: '#2575df',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  border: 0,
                }}
              >
                Mở Đơn hàng <ArrowRight size={13} />
              </button>
            </div>

            {pendingConfirmOrders.length === 0 ? (
              <p style={{ margin: 0, fontSize: '11px', color: '#27ae60', padding: '12px 0' }}>
                ✓ Đã hoàn tất gọi xác nhận toàn bộ đơn hàng trong ngày!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {pendingConfirmOrders.slice(0, 3).map((ord) => (
                  <div
                    key={ord.order_id}
                    style={{
                      padding: '10px 12px',
                      background: '#fff',
                      border: '1px solid #e8eff7',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px', color: '#22385e' }}>{ord.ten_khach_hang}</strong>{' '}
                      <span style={{ fontSize: '11px', color: '#8898b0' }}>({ord.sdt_masked})</span>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#607593' }}>
                        {ord.goi_dich_vu || 'Dịch vụ'} · Hẹn: <b>{ord.gio_hen_khach || 'Trong ngày'}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/orders')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#2575df',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 0,
                        cursor: 'pointer',
                      }}
                    >
                      Gọi xác nhận
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cột 2: Khách hàng hẹn gọi lại hôm nay */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #e2eaf5',
              background: '#fcfdfe',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e8f2ff', color: '#2575df', display: 'grid', placeItems: 'center' }}>
                  <Clock3 size={17} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '13px', color: '#1e3765' }}>Khách hẹn gọi lại</h3>
                  <small style={{ color: '#7487a3' }}>{callbackCustomers.length} khách cần chăm sóc</small>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/leads')}
                style={{
                  background: 'transparent',
                  color: '#2575df',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  border: 0,
                }}
              >
                Mở Tiềm năng <ArrowRight size={13} />
              </button>
            </div>

            {callbackCustomers.length === 0 ? (
              <p style={{ margin: 0, fontSize: '11px', color: '#27ae60', padding: '12px 0' }}>
                ✓ Chưa có lịch hẹn gọi lại nào quá hạn trong ngày!
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {callbackCustomers.slice(0, 3).map((cust) => (
                  <div
                    key={cust.customer_id}
                    style={{
                      padding: '10px 12px',
                      background: '#fff',
                      border: '1px solid #e8eff7',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '12px', color: '#22385e' }}>{cust.customer_name}</strong>{' '}
                      <span style={{ fontSize: '11px', color: '#8898b0' }}>({cust.phone_masked})</span>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#607593' }}>
                        Hẹn: <b>{cust.next_care_at ? dayjs(cust.next_care_at).format('HH:mm DD/MM') : 'Hôm nay'}</b>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/telesale')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: '#0bad79',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: 0,
                        cursor: 'pointer',
                      }}
                    >
                      Gọi ngay
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bảng Chi tiết Hiệu suất Làm việc theo khoảng thời gian */}
      <section className="panel performance-panel" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">BÁO CÁO TỔNG HỢP</p>
            <h2>Bảng thống kê chi tiết các chỉ số</h2>
          </div>
          <span style={{ fontSize: '11px', color: '#687f9d' }}>
            {dateRange.label}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  'Khoảng thời gian',
                  'Đàm thoại',
                  'Tổng cuộc gọi',
                  'Kết nối',
                  'Giữ lại CS',
                  'Hẹn gọi lại',
                  'Đã chốt',
                  'Đã xác nhận',
                  'Trả về (Rủi ro)',
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>{dateRange.label}</td>
                <td>{talkTimeMins} phút</td>
                <td><b>{totalCalls}</b></td>
                <td><b>{connectedCalls}</b> ({totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : 0}%)</td>
                <td>{dailyResults?.tong_giu_lai_cs || 0}</td>
                <td>{dailyResults?.tong_hen_goi_lai || 0}</td>
                <td><span className="closed">{closedOrders}</span></td>
                <td style={{ color: '#0bad79', fontWeight: 700 }}>{confirmedOrders}</td>
                <td style={{ color: returnedOrders > 0 ? '#e11d48' : '#6b7280', fontWeight: 600 }}>
                  {returnedOrders}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
