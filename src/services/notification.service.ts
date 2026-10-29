import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { AppNotification } from '../types/api'
import apiClient from './apiClient'

export const notificationService = {
  /**
   * Tải danh sách thông báo người dùng từ máy chủ ERP (API 06: POST /api/load-notifications)
   * Sử dụng Data Normalizer để chuẩn hóa linh hoạt dữ liệu legacy từ ERP
   */
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const response: any = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS, {})

      // Xử lý linh hoạt (hỗ trợ notifications_data, items, mảng trực tiếp,...)
      const rawList: any[] = Array.isArray(response)
        ? response
        : Array.isArray(response?.result?.notifications_data)
          ? response.result.notifications_data
          : Array.isArray(response?.result?.items)
            ? response.result.items
            : Array.isArray(response?.result)
              ? response.result
              : Array.isArray(response?.data?.notifications_data)
                ? response.data.notifications_data
                : Array.isArray(response?.data)
                  ? response.data
                  : []

      return rawList.map((item: any, idx: number): AppNotification => {
        const id = item.id || item.notify_id || item.notification_id || idx + 1

        // Tách tiêu đề và nội dung thông minh từ trường `msg` của ERP hoặc title/content
        let title = item.title || item.name || item.subject || ''
        let content = item.content || item.detail || item.message || item.body || ''

        if (item.msg) {
          if (!title && !content) {
            if (item.msg.includes(':')) {
              const colonIndex = item.msg.indexOf(':')
              title = item.msg.substring(0, colonIndex).trim()
              content = item.msg.substring(colonIndex + 1).trim()
            } else {
              title = item.post_id ? 'Tin tức & Đào tạo' : 'Thông báo hệ thống'
              content = item.msg
            }
          } else if (!content) {
            content = item.msg
          } else if (!title) {
            title = item.msg
          }
        }

        if (!title) {
          title = item.post_id ? 'Tin tức & Đào tạo' : item.order_id ? 'Thông báo đơn hàng' : 'Thông báo hệ thống'
        }

        const isRead = Boolean(
          item.is_read || item.read_at || item.status === 'read' || item.status === 1 || item.read === 1,
        )
        const createdAt = item.created_at || item.date || item.time || new Date().toISOString()

        // Suy đoán trang đích phù hợp với nội dung thông báo
        let targetPage: AppNotification['target_page'] = 'dashboard'
        let type: AppNotification['type'] = 'system'

        const lowerContent = `${title} ${content} ${item.msg || ''}`.toLowerCase()
        if (item.order_id || lowerContent.includes('đơn') || lowerContent.includes('lịch hẹn')) {
          targetPage = 'orders'
          type = 'order'
        } else if (item.post_id || lowerContent.includes('tin mới') || lowerContent.includes('quy trình') || lowerContent.includes('thông báo')) {
          targetPage = 'training'
          type = 'system'
        } else if (lowerContent.includes('cuộc gọi') || lowerContent.includes('gọi lại') || lowerContent.includes('telesale')) {
          targetPage = 'telesale'
          type = 'call'
        } else if (lowerContent.includes('khách') || lowerContent.includes('chăm sóc') || lowerContent.includes('lead')) {
          targetPage = 'leads'
          type = 'customer'
        } else if (lowerContent.includes('báo cáo') || lowerContent.includes('chấm công')) {
          targetPage = 'reports'
          type = 'system'
        }

        return {
          id,
          title,
          content,
          is_read: isRead,
          created_at: createdAt,
          type,
          target_page: targetPage,
          target_id: item.order_id || item.post_id || item.customer_id,
        }
      })
    } catch (err) {
      console.warn('Lỗi khi tải thông báo từ ERP:', err)
      return []
    }
  },

  /**
   * Đánh dấu thông báo đã đọc lên máy chủ ERP (API 07: POST /api/mask-notify-as-read)
   * @param notificationId ID thông báo cần đánh dấu (bỏ trống nếu đánh dấu tất cả)
   */
  async markAsRead(notificationId?: number | string): Promise<boolean> {
    try {
      const payload: Record<string, any> = {}
      if (notificationId) {
        payload.id = notificationId
        payload.notification_id = notificationId
      }
      await apiClient.post(API_ENDPOINTS.MASK_NOTIFY_READ, payload)
      return true
    } catch (err) {
      console.warn('Lỗi khi đánh dấu thông báo đã đọc:', err)
      return false
    }
  },
}

export default notificationService

