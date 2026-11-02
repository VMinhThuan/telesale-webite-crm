import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImageLightboxModal } from './ImageLightboxModal'

describe('ImageLightboxModal Component Tests', () => {
  const mockImage = {
    url: 'https://example.com/test-photo.jpg',
    title: 'Ảnh khảo sát máy lọc nước',
    date: '29/10/2026 09:07',
  }

  it('không render khi isOpen = false', () => {
    const { container } = render(
      <ImageLightboxModal isOpen={false} image={mockImage} onClose={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('render đầy đủ thông tin ảnh và các nút điều khiển khi isOpen = true', () => {
    render(
      <ImageLightboxModal isOpen={true} image={mockImage} onClose={vi.fn()} />,
    )

    expect(screen.getByText('Ảnh khảo sát máy lọc nước')).toBeInTheDocument()
    expect(screen.getByText('29/10/2026 09:07')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByTitle(/Phóng to/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Thu nhỏ/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Đặt lại vừa màn hình/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Xoay 90 độ/i)).toBeInTheDocument()
    expect(screen.getByTitle(/Đóng/i)).toBeInTheDocument()
  })

  it('phóng to và thu nhỏ khi nhấn nút + và -', () => {
    render(
      <ImageLightboxModal isOpen={true} image={mockImage} onClose={vi.fn()} />,
    )

    const zoomInBtn = screen.getByTitle(/Phóng to/i)
    const zoomOutBtn = screen.getByTitle(/Thu nhỏ/i)

    // Nhấn phóng to: từ 100% -> 125%
    fireEvent.click(zoomInBtn)
    expect(screen.getByText('125%')).toBeInTheDocument()

    // Nhấn phóng to tiếp: 125% -> 150%
    fireEvent.click(zoomInBtn)
    expect(screen.getByText('150%')).toBeInTheDocument()

    // Nhấn thu nhỏ: 150% -> 125%
    fireEvent.click(zoomOutBtn)
    expect(screen.getByText('125%')).toBeInTheDocument()
  })

  it('đặt lại vừa màn hình khi bấm nút reset hoặc phím 0', () => {
    render(
      <ImageLightboxModal isOpen={true} image={mockImage} onClose={vi.fn()} />,
    )

    const zoomInBtn = screen.getByTitle(/Phóng to/i)
    const resetBtn = screen.getByTitle(/Đặt lại vừa màn hình/i)

    fireEvent.click(zoomInBtn)
    fireEvent.click(zoomInBtn)
    expect(screen.getByText('150%')).toBeInTheDocument()

    // Bấm reset
    fireEvent.click(resetBtn)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('gọi onClose khi nhấn nút đóng hoặc bấm Escape', () => {
    const handleClose = vi.fn()
    render(
      <ImageLightboxModal isOpen={true} image={mockImage} onClose={handleClose} />,
    )

    const closeBtn = screen.getByTitle(/Đóng/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    // Thử phím Escape
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('double click vào ảnh để phóng to 200% và double click lần nữa để về 100%', () => {
    render(
      <ImageLightboxModal isOpen={true} image={mockImage} onClose={vi.fn()} />,
    )

    const img = screen.getByAltText('Ảnh khảo sát máy lọc nước')

    // Double click lần 1: lên 200%
    fireEvent.doubleClick(img)
    expect(screen.getByText('200%')).toBeInTheDocument()

    // Double click lần 2: về 100%
    fireEvent.doubleClick(img)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })
})

