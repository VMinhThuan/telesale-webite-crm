import React from 'react'
import { BarChart3 } from 'lucide-react'
import clsx from 'clsx'

export type StatTone = 'blue' | 'green' | 'amber' | 'rose' | 'teal'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ComponentType<{ size?: number }>
  tone?: StatTone
  change?: string
  isDown?: boolean
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  change,
  isDown,
  onClick,
}) => {
  return (
    <article
      className={clsx('call-stat', tone)}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-icon">
        <Icon size={21} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {change && (
          <small className={clsx({ down: isDown })} style={{ fontSize: '9px', marginTop: '4px', display: 'block' }}>
            {change}
          </small>
        )}
      </div>
      <BarChart3 size={19} />
    </article>
  )
}

export default StatCard
