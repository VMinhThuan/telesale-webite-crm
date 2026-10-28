import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../constants/queryKeys'
import notificationService from '../services/notification.service'
import { AppNotification } from '../types/api'

export function useNotifications() {
  const queryClient = useQueryClient()

  // 1. Tải danh sách thông báo và tự động thăm dò mỗi 60 giây (Auto-polling)
  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: () => notificationService.getNotifications(),
    staleTime: 30 * 1000, // Coi dữ liệu là mới trong 30 giây
    refetchInterval: 60 * 1000, // Tự động kéo dữ liệu mới mỗi 60 giây
    refetchOnWindowFocus: true, // Tự động làm mới khi người dùng quay lại tab trình duyệt
  })

  const notifications = notificationsQuery.data || []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  // 2. Mutation đánh dấu đã đọc (hỗ trợ Optimistic Update phản hồi tức thì)
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId?: number | string) => notificationService.markAsRead(notificationId),
    onMutate: async (targetId) => {
      // Hủy bỏ các query đang chạy dở để tránh ghi đè dữ liệu lạc quan
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.list() })

      // Lưu trạng thái trước đó để rollback nếu lỗi
      const previousNotifications = queryClient.getQueryData<AppNotification[]>(
        queryKeys.notifications.list(),
      )

      // Cập nhật lạc quan (Optimistic Update)
      queryClient.setQueryData<AppNotification[]>(queryKeys.notifications.list(), (old = []) => {
        if (!targetId) {
          // Đánh dấu tất cả là đã đọc
          return old.map((n) => ({ ...n, is_read: true }))
        }
        // Đánh dấu 1 thông báo cụ thể
        return old.map((n) => (n.id === targetId ? { ...n, is_read: true } : n))
      })

      return { previousNotifications }
    },
    onError: (_err, _targetId, context) => {
      // Rollback về trạng thái cũ nếu gặp lỗi mạng
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousNotifications)
      }
    },
    onSettled: () => {
      // Luôn đồng bộ lại với server sau khi kết thúc
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() })
    },
  })

  const markAsRead = (id: number | string) => {
    markAsReadMutation.mutate(id)
  }

  const markAllAsRead = () => {
    markAsReadMutation.mutate(undefined)
  }

  return {
    notifications,
    unreadCount,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    refetch: notificationsQuery.refetch,
    markAsRead,
    markAllAsRead,
    isMarkingRead: markAsReadMutation.isPending,
  }
}

export default useNotifications

