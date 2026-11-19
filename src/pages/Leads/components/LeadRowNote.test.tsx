import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { LeadRowNote } from './LeadRowNote'
import * as useCustomersHook from '../../../hooks/useCustomers'

vi.mock('../../../hooks/useCustomers', () => ({
  useCustomerHistory: vi.fn(),
}))

describe('LeadRowNote Component Unit Tests', () => {
  it('hiển thị ghi chú mới nhất từ lịch sử chăm sóc bên dưới', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: [
        {
          history_type: 'care',
          at: '2026-11-17T10:05:00.000Z',
          user_name: 'Đặng Thị Hoa',
          result: 'Hẹn gọi lại',
          note: 'Báo cáo',
        },
        {
          history_type: 'care',
          at: '2026-11-16T14:50:00.000Z',
          user_name: 'Đặng Thị Hoa',
          result: 'Hẹn gọi lại',
          note: 'dùng bên khác rồi',
        },
      ],
      isLoading: false,
    } as any)

    render(<LeadRowNote customerId={101} sourceErp="locnuoc365" />)

    expect(screen.getByText('Báo cáo')).toBeInTheDocument()
    const container = screen.getByTitle(/Báo cáo/)
    expect(container).toHaveAttribute('title', expect.stringContaining('Đặng Thị Hoa: Báo cáo'))
  })

  it('bỏ qua bản ghi không có note và lấy bản ghi gần nhất có note', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: [
        {
          history_type: 'call',
          at: '2026-11-17T11:00:00.000Z',
          user_name: 'Đặng Thị Hoa',
          result: 'Nghe máy (33 giây)',
          note: '', // Không có note
        },
        {
          history_type: 'care',
          at: '2026-11-16T14:50:00.000Z',
          user_name: 'Đặng Thị Hoa',
          result: 'Hẹn gọi lại',
          note: 'dùng bên khác rồi',
        },
      ],
      isLoading: false,
    } as any)

    render(<LeadRowNote customerId={102} sourceErp="locnuoc365" />)

    expect(screen.getByText('dùng bên khác rồi')).toBeInTheDocument()
  })

  it('fallback về result nếu lịch sử không có note viết tay', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: [
        {
          history_type: 'call',
          at: '2026-11-17T11:00:00.000Z',
          user_name: 'Đặng Thị Hoa',
          result: 'Không nghe máy',
          note: null,
        },
      ],
      isLoading: false,
    } as any)

    render(<LeadRowNote customerId={103} sourceErp="locnuoc365" />)

    expect(screen.getByText('Không nghe máy')).toBeInTheDocument()
  })

  it('fallback về fallbackNote nếu lịch sử rỗng nhưng có fallbackNote', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    render(
      <LeadRowNote
        customerId={104}
        sourceErp="locnuoc365"
        fallbackNote="Khách hẹn chiều gọi lại"
      />,
    )

    expect(screen.getByText('Khách hẹn chiều gọi lại')).toBeInTheDocument()
  })

  it('hiển thị gạch ngang — khi khách hàng chưa có bất kỳ ghi chú hay lịch sử nào', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    render(<LeadRowNote customerId={105} sourceErp="locnuoc365" />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('hiển thị ... khi đang tải dữ liệu', () => {
    vi.mocked(useCustomersHook.useCustomerHistory).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any)

    render(<LeadRowNote customerId={106} sourceErp="locnuoc365" />)

    expect(screen.getByText('...')).toBeInTheDocument()
  })
})
