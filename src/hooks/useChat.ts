import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import chatService from '../services/chat.service'
import { ChatMessageItem } from '../types/api'
import { notify } from '../utils/notify'

export const CHAT_THREADS_QUERY_KEY = ['chat_threads']
export const CHAT_MESSAGES_QUERY_KEY = ['chat_messages']
export const CHAT_CONTACTS_QUERY_KEY = ['chat_contacts']

/**
 * Hook tải danh sách các cuộc hội thoại (API 35: GET /api/chats)
 */
export function useChatThreads(page = 1, perPage = 20) {
  return useQuery({
    queryKey: [...CHAT_THREADS_QUERY_KEY, page, perPage],
    queryFn: () => chatService.getThreads(page, perPage),
    staleTime: 1000 * 30, // 30s
    refetchInterval: 1000 * 45, // Tự động kéo tin mới mỗi 45s
  })
}

export const CHAT_THREAD_DETAIL_QUERY_KEY = ['chat_thread_detail']

/**
 * Hook tải tin nhắn của cuộc hội thoại đang chọn (API 37: GET /api/chats/{thread_id})
 */
export function useChatMessages(threadId?: number | string) {
  return useQuery({
    queryKey: [...CHAT_MESSAGES_QUERY_KEY, threadId],
    queryFn: () => (threadId ? chatService.getMessages(threadId) : Promise.resolve([])),
    enabled: Boolean(threadId),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 20, // Tự động cập nhật tin nhắn mỗi 20s
  })
}

/**
 * Hook tải chi tiết hội thoại bao gồm tin nhắn và danh sách thành viên (API 37)
 */
export function useChatThreadDetail(threadId?: number | string) {
  return useQuery({
    queryKey: [...CHAT_THREAD_DETAIL_QUERY_KEY, threadId],
    queryFn: () =>
      threadId
        ? chatService.getThreadDetail(threadId)
        : Promise.resolve({ messages: [], participants: [], thread: null }),
    enabled: Boolean(threadId),
    staleTime: 1000 * 10,
    refetchInterval: 1000 * 20,
  })
}

/**
 * Hook tìm kiếm danh bạ đồng nghiệp (API 42: GET /api/chats/find/contacts)
 */
export function useChatContacts() {
  return useQuery({
    queryKey: CHAT_CONTACTS_QUERY_KEY,
    queryFn: () => chatService.getContacts(),
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * Mutation gửi tin nhắn văn bản (API 39a)
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

    onSuccess: (newMessage, variables) => {
      // Cập nhật cache tin nhắn
      queryClient.setQueryData<ChatMessageItem[]>(
        [...CHAT_MESSAGES_QUERY_KEY, variables.threadId],
        (old = []) => [...old, newMessage],
      )
      // Làm mới danh sách hội thoại
      queryClient.invalidateQueries({ queryKey: CHAT_THREADS_QUERY_KEY })
    },

    onError: (err: any) => {
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
        [...CHAT_MESSAGES_QUERY_KEY, variables.threadId],
        (old = []) => [...old, newMessage],
      )
      queryClient.invalidateQueries({ queryKey: CHAT_THREADS_QUERY_KEY })
      notify(`Đã gửi tệp đính kèm: ${variables.file.name}`)
    },

    onError: (err: any) => {
      notify(err.message || 'Lỗi khi gửi tệp đính kèm.')
    },
  })
}

