import React, { useState } from 'react'
import {
  Coins,
  Info,
  RotateCw,
  TrendingUp,
} from 'lucide-react'
import { formatVND } from '../../../utils/formatters'
import {
  DailyCommissionItem,
  useLast7DaysDailyResults,
} from '../../../hooks/useTelesale'

export const Commission7DaysChart: React.FC = () => {
  const { data: chartData = [], isLoading, isFetching, refetch } = useLast7DaysDailyResults()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Tính tổng hoa hồng và đơn phát sinh 7 ngày qua
  const totalCommission7Days = chartData.reduce((sum, item) => sum + item.commission, 0)
  const totalDon7Days = chartData.reduce((sum, item) => sum + item.donPhatSinh, 0)

  // Tìm mức hoa hồng cao nhất để chia tỷ lệ cột
  const maxCommission = Math.max(...chartData.map((d) => d.commission), 500000)

  return (
    <section
      className="panel"
      style={{
        marginTop: '20px',
        padding: '20px',
        background: '#ffffff',
        border: '1px solid #e6edf5',
        borderRadius: '12px',
        boxShadow: '0 3px 11px rgba(30, 71, 129, 0.04)',
      }}
    >
      {/* Tiêu đề & Tóm tắt tổng hoa hồng */}
      <div
        className="panel-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Coins size={12} /> BIỂU ĐỒ HOA HỒNG THEO NGÀY
          </p>
          <h2 style={{ fontSize: '17px', color: '#1d3561', margin: 0, fontWeight: 700 }}>
            Hoa hồng 7 ngày gần nhất
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <TrendingUp size={15} color="#16a34a" />
            <div style={{ fontSize: '11px', color: '#166534' }}>
              <span>Tổng 7 ngày: </span>
              <strong style={{ fontSize: '13px', color: '#15803d' }}>
                {formatVND(totalCommission7Days)}
              </strong>
              <span style={{ color: '#4ade80', margin: '0 4px' }}>|</span>
              <span style={{ fontWeight: 600 }}>{totalDon7Days} đơn</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Làm mới dữ liệu hoa hồng"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '6px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isFetching ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <RotateCw size={13} className={isFetching ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Vùng biểu đồ cột */}
      {isLoading ? (
        <div
          style={{
            height: '220px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '20px 10px 10px',
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '56px',
                  height: `${20 + (i % 4) * 20}%`,
                  background: '#f1f5f9',
                  borderRadius: '6px 6px 0 0',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <div
                style={{
                  width: '32px',
                  height: '10px',
                  background: '#e2e8f0',
                  borderRadius: '4px',
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Lưới đường mốc ngang mờ */}
          <div
            style={{
              position: 'absolute',
              inset: '20px 0 60px 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%' }} />
            <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%' }} />
            <div style={{ borderTop: '1px dashed #e2e8f0', width: '100%' }} />
          </div>

          {/* Hàng 7 cột biểu đồ */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              height: '240px',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '8px',
              alignItems: 'flex-end',
              padding: '10px 0',
            }}
          >
            {chartData.map((item: DailyCommissionItem, index: number) => {
              const isHovered = hoveredIndex === index
              const hasData = item.commission > 0
              const barHeightPercent = hasData
                ? Math.max((item.commission / maxCommission) * 100, 8)
                : 0

              const barBg = item.isToday
                ? 'linear-gradient(180deg, #10b981 0%, #34d399 100%)'
                : 'linear-gradient(180deg, #2575df 0%, #60a5fa 100%)'

              return (
                <div
                  key={item.date}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '0 4px',
                  }}
                >
                  {/* Tooltip hiển thị chi tiết khi hover */}
                  {isHovered && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% - 10px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1e293b',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                        zIndex: 30,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        lineHeight: 1.5,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#38bdf8',
                          marginBottom: '4px',
                          borderBottom: '1px solid #334155',
                          paddingBottom: '3px',
                        }}
                      >
                        {item.dayLabel}
                      </div>
                      <div>
                        Đơn phát sinh: <b>{item.donPhatSinh} đơn</b>
                      </div>
                      <div>
                        Đơn giá:{' '}
                        <span style={{ color: '#93c5fd' }}>
                          {item.unitPrice.toLocaleString('vi-VN')}đ / đơn
                        </span>
                        {item.donPhatSinh > 100 && (
                          <span style={{ color: '#4ade80', marginLeft: '4px' }}>(Mức &gt;100)</span>
                        )}
                      </div>
                      <div style={{ marginTop: '2px' }}>
                        Hoa hồng:{' '}
                        <strong style={{ color: '#4ade80', fontSize: '12px' }}>
                          {formatVND(item.commission)}
                        </strong>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '3px' }}>
                        Cuộc gọi: {item.totalCalls} cuộc ({item.connectedCalls} nghe máy)
                      </div>
                    </div>
                  )}

                  {/* Giá trị hoa hồng trên đỉnh cột */}
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: item.isToday ? '#10b981' : hasData ? '#2575df' : '#94a3b8',
                      marginBottom: '6px',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {hasData
                      ? item.commission >= 1000000
                        ? `${(item.commission / 1000000).toFixed(1)}tr`
                        : `${Math.round(item.commission / 1000)}k`
                      : '0đ'}
                  </div>

                  {/* Cột trụ chứa tiến độ */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '52px',
                      height: '140px',
                      background: isHovered ? '#e2e8f0' : '#f1f5f9',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      alignItems: 'flex-end',
                      overflow: 'hidden',
                      transition: 'background 0.2s',
                      border: item.isToday ? '1px dashed #10b981' : '1px solid transparent',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${barHeightPercent}%`,
                        background: barBg,
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 0.4s ease-out, filter 0.2s',
                        filter: isHovered ? 'brightness(1.1)' : 'none',
                      }}
                    />
                  </div>

                  {/* Nhãn ngày bên dưới */}
                  <div
                    style={{
                      marginTop: '8px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: item.isToday ? 700 : 600,
                        color: item.isToday ? '#10b981' : '#334155',
                      }}
                    >
                      {item.isToday ? 'Hôm nay' : item.dayOfWeek}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                      {item.shortDate}
                    </span>
                    <span
                      style={{
                        marginTop: '2px',
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: item.donPhatSinh > 0 ? '#e0f2fe' : '#f8fafc',
                        color: item.donPhatSinh > 0 ? '#0284c7' : '#94a3b8',
                      }}
                    >
                      {item.donPhatSinh} đơn
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ghi chú chân biểu đồ giải thích công thức */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: '#64748b',
        }}
      >
        <Info size={13} color="#94a3b8" />
        <span>
          <b>Quy tắc tính hoa hồng:</b> 75.000đ / đơn phát sinh (Nếu đạt trên 100 đơn trong ngày:
          tính 100.000đ / đơn).
        </span>
      </div>
    </section>
  )
}

export default Commission7DaysChart

