import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import chatService from '../services/chat.service'
import { ChatMessageItem } from '../types/api'
import { queryKeys } from '../constants/queryKeys'
import { notify } from '../utils/notify'

// Giữ lại alias query key để đảm bảo tương thích ngược 100%
export const CHAT_THREADS_QUERY_KEY = queryKeys.chat.threads()
export const CHAT_MESSAGES_QUERY_KEY = queryKeys.chat.all
export const CHAT_CONTACTS_QUERY_KEY = queryKeys.chat.contacts()
export const CHAT_SEARCH_MESSAGES_QUERY_KEY = queryKeys.chat.all
export const CHAT_THREAD_DETAIL_QUERY_KEY = queryKeys.chat.all

/**
 * Hook tải danh sách các cuộc hội thoại (API 35: GET /api/chats)
 */
export function useChatThreads(page = 1, perPage = 20) {
  return useQuery({
    queryKey: queryKeys.chat.threadList(page, perPage),
    queryFn: () => chatService.getThreads(page, perPage),
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 45, // Tự động kéo tin mới mỗi 45s
  })
}

/**
 * Hook phân trang vô tận / tải thêm cuộc hội thoại (API 35: GET /api/chats?page=X&per_page=20)
 * Quản lý mượt mà khi ERP trả về phân trang (ví dụ page 1 có 20/24, page 2 có 4/24)
 */
export function useInfiniteChatThreads(perPage = 20) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.threadInfinite(perPage),
    queryFn: ({ pageParam = 1 }) => chatService.getThreads(pageParam, perPage),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { current_page, last_page } = lastPage.pagination || {}
      if (current_page && last_page && current_page < last_page) {
        return current_page + 1
      }
      return undefined
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 45,
  })
}

/**
 * Kiểm tra xem ID có phải là Thread UUID hợp lệ từ ERP không (tránh gọi API với User ID gây 404)
 */
function isValidThreadUuid(threadId?: number | string): boolean {
  return Boolean(
    threadId &&
    typeof threadId === 'string' &&
    threadId.length > 20 &&
    threadId.includes('-') &&
    !threadId.startsWith('contact_'),
  )
}

/**
 * Hook tải tin nhắn của cuộc hội thoại đang chọn (API 37: GET /api/chats/{thread_id})
 */
export function useChatMessages(threadId?: number | string) {
  const isValid = isValidThreadUuid(threadId)
  return useQuery({
    queryKey: queryKeys.chat.messages(threadId),
    queryFn: () => (isValid ? chatService.getMessages(threadId!) : Promise.resolve([])),
    enabled: isValid,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 20, // Tự động cập nhật tin nhắn mỗi 20s
  })
}

/**
 * Hook tải chi tiết hội thoại bao gồm tin nhắn và danh sách thành viên (API 37)
 */
export function useChatThreadDetail(threadId?: number | string) {
  const isValid = isValidThreadUuid(threadId)
  return useQuery({
    queryKey: queryKeys.chat.thread(threadId),
    queryFn: () =>
      isValid
    ? chatService.getThreadDetail(threadId!)
        : Promise.resolve({ messages: [], participants: [], thread: null }),
    enabled: isValid,
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 20,
  })
}

/**
 * Hook tìm kiếm tin nhắn theo từ khóa trong hội thoại đang mở (API 38: GET /api/chats/{thread_id}/search?keyword=...)
 */
export function useSearchMessages(threadId?: number | string, keyword?: string) {
  const trimmed = keyword?.trim()
  return useQuery({
    queryKey: queryKeys.chat.search(threadId, trimmed),
    queryFn: () =>
      threadId && trimmed
        ? chatService.searchMessages(threadId, trimmed)
        : Promise.resolve([]),
    enabled: Boolean(threadId && trimmed && trimmed.length >= 1),
    staleTime: 1000 * 30,
  })
}

/**
 * Mutation đánh dấu đã đọc cuộc hội thoại (API 43: POST /api/chats/{thread_id}/mark-read)
 */
export function useMarkReadMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (threadId: number | string) => {
      if (!isValidThreadUuid(threadId)) {
        return Promise.resolve(false)
      }
      return chatService.markRead(threadId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads() })
    },
  })
}

/**
 * Hook tìm kiếm danh bạ đồng nghiệp (API 42: GET /api/chats/find/contacts)
 */
export function useChatContacts() {
  return useQuery({
    queryKey: queryKeys.chat.contacts(),
    queryFn: () => chatService.getContacts(),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Mutation gửi tin nhắn văn bản (API 39a)
 * Áp dụng Optimistic Update: Thêm ngay tin nhắn vào khung chat tức thì (0ms latency),
 * tự động cập nhật ID chuẩn từ server hoặc rollback nếu gặp lỗi mạng.
 */
export function useSendMessageMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      threadId,
      message,
      temporaryId,
    }: {
      threadId: number | string
      message: string
      temporaryId?: string
    }) => chatService.sendTextMessage(threadId, message, temporaryId),

    onMutate: async ({ threadId, message, temporaryId }) => {
      const messagesKey = queryKeys.chat.messages(threadId)
      await queryClient.cancelQueries({ queryKey: messagesKey })

      const previousMessages = queryClient.getQueryData<ChatMessageItem[]>(messagesKey)

      const tempId = temporaryId || `temp_${Date.now()}`
      const optimisticMessage: ChatMessageItem = {
        id: tempId,
        sender_name: 'Bạn',
        is_outgoing: true,
        type: 'text',
        content: message,
        created_at: new Date().toISOString(),
      }

      // Đưa tin nhắn lạc quan vào cache ngay lập tức (0ms)
      queryClient.setQueryData<ChatMessageItem[]>(messagesKey, (old = []) => [
        ...old,
        optimisticMessage,
      ])

      return { previousMessages, messagesKey, tempId }
    },

    onSuccess: (newMessage, _variables, context) => {
      // Thay thế tin nhắn tạm bằng tin nhắn chính thức từ máy chủ
      queryClient.setQueryData<ChatMessageItem[]>(context.messagesKey, (old = []) =>
        old.map((msg) => (msg.id === context.tempId ? newMessage : msg)),
      )
      // Làm mới danh sách hội thoại ngầm
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads() })
    },

    onError: (err: any, _variables, context) => {
      // Rollback về trạng thái trước đó nếu gửi thất bại
      if (context?.previousMessages) {
        queryClient.setQueryData(context.messagesKey, context.previousMessages)
      }
      notify(err.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.')
    },
  })
}

/**
 * Mutation tải lên tệp tin đính kèm (API 39b - 39e)
 */
export function useUploadAttachmentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      threadId,
      file,
      type,
    }: {
      threadId: number | string
      file: File
      type: 'image' | 'document' | 'audio' | 'video'
    }) => chatService.uploadAttachment(threadId, file, type),

    onSuccess: (newMessage, variables) => {
      queryClient.setQueryData<ChatMessageItem[]>(
        queryKeys.chat.messages(variables.threadId),
        (old = []) => [...old, newMessage],
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.threads() })
      notify(`Đã gửi tệp đính kèm: ${variables.file.name}`)
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi gửi tệp đính kèm.')
    },
  })
}
