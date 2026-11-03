import React from 'react'

export interface SalesFlowLogoProps {
  size?: number
  className?: string
  style?: React.CSSProperties
  rounded?: boolean
}

/**
 * Logo biểu tượng thương hiệu SalesFlow chuẩn CRM
 * Thiết kế dòng chảy bán hàng & kết nối (S-Flow) với sắc xanh chuyển màu công nghệ
 */
export const SalesFlowLogo: React.FC<SalesFlowLogoProps> = ({
  size = 28,
  className = '',
  style,
  rounded = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0, display: 'inline-block', ...style }}
      aria-label="SalesFlow Logo"
    >
      <defs>
        <linearGradient id="sf-logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="sf-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.9" />
        </linearGradient>
        <filter id="sf-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Nền Squircle gradient cao cấp */}
      <rect
        width="36"
        height="36"
        rx={rounded ? 10 : 0}
        fill="url(#sf-logo-grad)"
      />

      {/* Luồng sóng chữ S chuyển động đại diện cho Sales & Flow */}
      <path
        d="M12 13C12 9.686 14.686 7 18 7H19.5C22.538 7 25 9.462 25 12.5C25 15.2 23 17 19.5 17H16.5C13 17 11 18.8 11 21.5C11 24.538 13.462 27 16.5 27H18C21.314 27 24 24.314 24 21"
        stroke="url(#sf-glow-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#sf-shadow)"
      />

      {/* Điểm sáng hội tụ (nodes kết nối & tăng trưởng) */}
      <circle cx="24.5" cy="8.5" r="2.2" fill="#ffffff" />
      <circle cx="11.5" cy="25.5" r="2" fill="#7dd3fc" />
    </svg>
  )
}

export default SalesFlowLogo
