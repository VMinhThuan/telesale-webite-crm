import React from 'react'
import clsx from 'clsx'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  onChange: (newPage: number) => void
  itemLabel?: string
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onChange,
  itemLabel = 'bản ghi',
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(total, page * pageSize)

  // Tạo mảng số trang hiển thị (tối đa 5 nút)
  const getPageNumbers = () => {
    const pages: number[] = []
    let start = Math.max(1, page - 2)
    let end = Math.min(totalPages, page + 2)

    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(totalPages, start + 4)
      } else if (end === totalPages) {
        start = Math.max(1, end - 4)
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  const pages = getPageNumbers()

  return (
    <div className="pagination">
      <span>
        Hiển thị {startItem} – {endItem} trong {total} {itemLabel}
      </span>
      <div>
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          style={{ opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          aria-label="Trang trước"
        >
          ‹
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={clsx({ active: p === page })}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          style={{
            opacity: page >= totalPages ? 0.4 : 1,
            cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          }}
          aria-label="Trang sau"
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default Pagination
