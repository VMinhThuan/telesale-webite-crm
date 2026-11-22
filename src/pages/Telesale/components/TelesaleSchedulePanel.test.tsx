import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TelesaleSchedulePanel, TelesaleScheduleBranchItem } from './TelesaleSchedulePanel'

// Mock hook useBranchSlots
vi.mock('../../../hooks/useOrders', () => ({
  useBranchSlots: vi.fn(() => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  })),
}))

describe('TelesaleSchedulePanel Unit Tests', () => {
  const mockBranches: TelesaleScheduleBranchItem[] = [
    { key: 'locnuoc365_3', id: 3, name: 'Chi Nhánh Đại Kim', source_erp: 'locnuoc365' },
    { key: 'locnuoc365_6', id: 6, name: 'Chi Nhánh Bắc Giang', source_erp: 'locnuoc365' },
    { key: 'zomzem_104', id: 104, name: 'Chi nhánh Dĩ An', source_erp: 'zomzem' },
  ]

  const defaultProps = {
    branchName: 'Chi Nhánh Đại Kim',
    branchId: 3,
    availableBranches: mockBranches,
    currentBranchKey: 'locnuoc365_3',
    campaignBranchKey: 'locnuoc365_3',
    campaignBranchName: 'Chi Nhánh Đại Kim',
    branchAddress: 'Số 12 Đại Kim, Hoàng Mai, Hà Nội',
    isAdmin: false,
    onBranchChange: vi.fn(),
    onResetToCampaignBranch: vi.fn(),
    onUpdateAddress: vi.fn(),
    orderDate: '2026-11-23',
    onDateChange: vi.fn(),
    onSelectSlot: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hiển thị tên chi nhánh hiện tại và địa chỉ chi nhánh', () => {
    render(<TelesaleSchedulePanel {...defaultProps} />)
    expect(screen.getByText('Chi Nhánh Đại Kim')).toBeInTheDocument()
    expect(screen.getByText(/Số 12 Đại Kim, Hoàng Mai, Hà Nội/)).toBeInTheDocument()
  })

  it('không hiển thị nút reset khi đang ở chi nhánh gốc chiến dịch', () => {
    render(<TelesaleSchedulePanel {...defaultProps} />)
    expect(screen.queryByText(/Về Chi Nhánh Đại Kim/)).not.toBeInTheDocument()
  })

  it('hiển thị nút reset khi đang xem chi nhánh khác chiến dịch và gọi callback khi bấm', () => {
    const onReset = vi.fn()
    render(
      <TelesaleSchedulePanel
        {...defaultProps}
        branchName="Chi Nhánh Bắc Giang"
        branchId={6}
        currentBranchKey="locnuoc365_6"
        campaignBranchKey="locnuoc365_3"
        onResetToCampaignBranch={onReset}
      />,
    )

    const resetBtn = screen.getByText(/Về Chi Nhánh Đại Kim/)
    expect(resetBtn).toBeInTheDocument()
    fireEvent.click(resetBtn)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('mở dropdown và chọn chi nhánh khác (bao gồm cả cross-erp Zomzem)', () => {
    const onBranchChange = vi.fn()
    render(<TelesaleSchedulePanel {...defaultProps} onBranchChange={onBranchChange} />)

    // Bấm mở dropdown
    const dropdownBtn = screen.getByTitle('Nhấn để chọn hiển thị slot của chi nhánh khác')
    fireEvent.click(dropdownBtn)

    // Chọn chi nhánh Dĩ An (Zomzem)
    const diAnOption = screen.getByText('Chi nhánh Dĩ An')
    expect(diAnOption).toBeInTheDocument()
    fireEvent.click(diAnOption)

    expect(onBranchChange).toHaveBeenCalledWith(104, 'zomzem')
  })

  it('admin có thể click icon bút chì để sửa địa chỉ inline và lưu lại', async () => {
    const onUpdateAddress = vi.fn().mockResolvedValue(undefined)
    render(<TelesaleSchedulePanel {...defaultProps} isAdmin={true} onUpdateAddress={onUpdateAddress} />)

    const editBtn = screen.getByTitle('Chỉnh sửa địa chỉ chi nhánh này (Admin)')
    expect(editBtn).toBeInTheDocument()
    fireEvent.click(editBtn)

    const input = screen.getByPlaceholderText('Nhập địa chỉ chi nhánh...')
    expect(input).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'Số 15 Định Công Mới' } })

    const saveBtn = screen.getByText('Lưu')
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(onUpdateAddress).toHaveBeenCalledWith('Số 15 Định Công Mới')
  })
})
