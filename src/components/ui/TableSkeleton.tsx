import React from 'react'

export interface TableSkeletonProps {
  rows?: number
  cols?: number
  standalone?: boolean
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 4,
  standalone = false,
}) => {
  const content = (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} style={{ opacity: 0.7 }}>
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} style={{ padding: '14px 16px' }}>
              <div
                style={{
                  height: '16px',
                  width: cIdx === 0 ? '70%' : cIdx === cols - 1 ? '50%' : '85%',
                  borderRadius: '4px',
                  background: 'linear-gradient(90deg, #e5e9f0 25%, #f1f4f9 50%, #e5e9f0 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite linear',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )

  if (standalone) {
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>{content}</tbody>
      </table>
    )
  }

  return content
}

export default TableSkeleton
