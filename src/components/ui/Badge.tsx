import React from 'react'
import clsx from 'clsx'

export type BadgeTone = 'green' | 'blue' | 'amber' | 'purple' | 'rose' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  tone?: BadgeTone
  icon?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'blue',
  icon,
  className,
  style,
}) => {
  return (
    <span
      className={clsx('lead-status', tone, className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        ...style,
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  )
}

export default Badge
