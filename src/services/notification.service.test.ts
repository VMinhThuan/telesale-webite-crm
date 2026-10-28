import { describe, expect, it, vi } from 'vitest'
import apiClient from './apiClient'
import notificationService from './notification.service'

describe('Notification Service Unit Tests', () => {
  it('Data Normalizer: chuẩn hóa mảng dữ liệu thô legacy từ ERP', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce([
      {
        id: 101,
        title: 'Lịch hẹn mới',
        content: 'Khách hàng hẹn bảo dưỡng đơn #DH777',
        is_read: 0,
        created_at: '2026-10-28T10:00:00Z',
        order_id: 777,
      },
      {
        notify_id: 102,
        name: 'Nhắc cuộc gọi CSKH',
        message: 'Khách yêu cầu gọi lại telesale lúc 15:00',
        read: 1,
        time: '2026-10-28T09:30:00Z',
      },
    ] as any)

    const list = await notificationService.getNotifications()

    expect(list.length).toBe(2)

    // Item 1: Đơn hàng, chưa đọc
    expect(list[0].id).toBe(101)
    expect(list[0].title).toBe('Lịch hẹn mới')
    expect(list[0].is_read).toBe(false)
    expect(list[0].target_page).toBe('orders')
    expect(list[0].type).toBe('order')

    // Item 2: Cuộc gọi, đã đọc
    expect(list[1].id).toBe(102)
    expect(list[1].title).toBe('Nhắc cuộc gọi CSKH')
    expect(list[1].is_read).toBe(true)
    expect(list[1].target_page).toBe('telesale')
    expect(list[1].type).toBe('call')
  })

  it('Data Normalizer: xử lý cấu trúc bọc { result: { items: [...] } }', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {
        items: [
          {
            id: 201,
            title: 'Khách tiềm năng mới',
            detail: 'Có khách hàng lead mới từ chiến dịch',
            status: 'read',
          },
        ],
      },
    } as any)

    const list = await notificationService.getNotifications()
    expect(list.length).toBe(1)
    expect(list[0].id).toBe(201)
    expect(list[0].is_read).toBe(true)
    expect(list[0].target_page).toBe('leads')
    expect(list[0].type).toBe('customer')
  })

  it('markAsRead: gửi đúng payload khi đánh dấu 1 item hoặc tất cả', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true } as any)

    // Đánh dấu 1 thông báo
    await notificationService.markAsRead(101)
    expect(postSpy).toHaveBeenCalledWith('/api/mask-notify-as-read', { id: 101, notification_id: 101 })

    // Đánh dấu tất cả
    await notificationService.markAsRead()
    expect(postSpy).toHaveBeenCalledWith('/api/mask-notify-as-read', {})
  })
})

