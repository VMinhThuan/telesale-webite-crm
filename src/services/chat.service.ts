import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { ChatMessageItem, ChatMessageType } from '../types/api'
import apiClient from './apiClient'

export const chatService = {
  /**
   * Lấy danh sách cuộc trò chuyện (API 35: GET /api/chats?page=1&per_page=20)
   */
  async getThreads(page = 1, perPage = 20): Promise<{
    threads: any[]
    total: number
    pagination?: {
      total: number
      per_page: number | string
      current_page: number
      last_page: number
    }
  }> {
    const response: any = await apiClient.get(
      `${API_ENDPOINTS.CHATS}?page=${page}&per_page=${perPage}`,
    )
    const result = response?.result || response?.data || response || {}
    if (Array.isArray(result)) {
      return {
        threads: result,
        total: result.length,
        pagination: { total: result.length, per_page: perPage, current_page: page, last_page: 1 },
      }
    }

    const pagination = result.pagination || {}
    const total = Number(pagination.total ?? result.total ?? (result.threads?.length || 0))
    const currentPage = Number(pagination.current_page ?? page)
    const lastPage = Number(
      pagination.last_page ?? (Math.ceil(total / (Number(perPage) || 20)) || 1),
    )
    const parsedPerPage = pagination.per_page ?? perPage

    return {
      threads: result.threads || result.items || [],
      total,
      pagination: {
        total,
        per_page: parsedPerPage,
        current_page: currentPage,
        last_page: lastPage,
      },
    }
  },

  /**
   * Chuẩn hóa tin nhắn từ cấu trúc của ERP (RTippin Laravel Messenger)
   */
  normalizeMessage(m: any): ChatMessageItem {
    // RTippin Messenger type: 0 = MESSAGE (text), 1 = IMAGE, 2 = DOCUMENT, 3 = AUDIO, 4 = VIDEO
    let type: ChatMessageType = 'text'
    if (m.type === 1 || m.type === 'image') type = 'image'
    else if (m.type === 2 || m.type === 'document') type = 'document'
    else if (m.type === 3 || m.type === 'audio') type = 'audio'
    else if (m.type === 4 || m.type === 'video') type = 'video'

    const rawBody = m.body || m.content || m.message || ''
    let fileUrl = m.file_url || m.url
    if (!fileUrl && type !== 'text' && typeof rawBody === 'string') {
      if (rawBody.startsWith('http')) fileUrl = rawBody
      else if (rawBody.startsWith('/')) fileUrl = `https://locnuoc365.xyz${rawBody}`
    }

    const senderName =
      m.owner_name ||
      m.owner?.name ||
      m.sender_name ||
      m.user_name ||
      m.from ||
      'Đồng nghiệp'

    return {
      id: m.id || m.message_id || `msg_${Date.now()}_${Math.random()}`,
      sender_name: senderName,
      is_outgoing: Boolean(m.is_mine ?? m.is_outgoing ?? m.outgoing ?? false),
      type,
      content: rawBody,
      file_url: fileUrl,
      file_name: m.file_name || m.name || (type !== 'text' ? rawBody : undefined),
      file_size: m.file_size || m.size,
      created_at: m.created_at || m.time || new Date().toISOString(),
    }
  },

  /**
   * Lấy chi tiết hội thoại, danh sách tin nhắn và thành viên (API 37: GET /api/chats/{thread_id})
   * Tương thích hoàn toàn chuẩn RTippin Laravel Messenger của hệ thống ERP
   */
  async getThreadDetail(threadId: number | string): Promise<{
    messages: ChatMessageItem[]
    participants: any[]
    thread: any
  }> {
    const response: any = await apiClient.get(API_ENDPOINTS.CHAT_THREAD(threadId))
    const result = response?.result || response?.data || response || {}

    const rawList = Array.isArray(result)
      ? result
      : Array.isArray(result.messages)
        ? result.messages
        : Array.isArray(result.items)
          ? result.items
          : []

    const thread = result.thread || null

    const participants =
      (thread && Array.isArray(thread.participants) ? thread.participants : null) ||
      (Array.isArray(result.participants) ? result.participants : null) ||
      (thread && Array.isArray(thread.recent_participants) ? thread.recent_participants : null) ||
      (Array.isArray(result.recent_participants) ? result.recent_participants : null) ||
      []

    // ERP (RTippin Laravel Messenger) trả về danh sách tin nhắn mới nhất trước (DESC: index 0 là mới nhất).
    // Chuẩn luồng UI Chat (cũ ở trên đỉnh, mới nhất ở dưới đáy): sắp xếp theo thời gian tăng dần (ASC)
    const messages = rawList
      .map((m: any) => this.normalizeMessage(m))
      .sort((a: ChatMessageItem, b: ChatMessageItem) => {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeA - timeB
      })

    return {
      messages,
      participants,
      thread: result.thread || null,
    }
  },

  /**
   * Lấy danh sách tin nhắn của hội thoại (API 37)
   */
  async getMessages(threadId: number | string): Promise<ChatMessageItem[]> {
    const detail = await this.getThreadDetail(threadId)
    return detail.messages
  },

  /**
   * Tìm kiếm danh bạ / liên hệ nội bộ (API 42: GET /api/chats/find/contacts)
   */
  async getContacts(): Promise<any[]> {
    const response: any = await apiClient.get(API_ENDPOINTS.CHAT_CONTACTS)
    const result = response?.result || response?.data || response || []
    return Array.isArray(result) ? result : result.contacts || result.items || []
  },

  /**
   * Tìm kiếm tin nhắn trong hội thoại (API 38: GET /api/chats/{thread_id}/search?keyword=...)
   */
  async searchMessages(threadId: number | string, keyword: string): Promise<ChatMessageItem[]> {
    if (!keyword || !keyword.trim()) return []
    const response: any = await apiClient.get(
      `${API_ENDPOINTS.CHAT_SEARCH(threadId)}?keyword=${encodeURIComponent(keyword.trim())}`,
    )
    const result = response?.result || response?.data || response || {}
    const rawList = Array.isArray(result)
      ? result
      : Array.isArray(result.messages)
        ? result.messages
        : Array.isArray(result.items)
          ? result.items
          : []

    return rawList.map((m: any) => this.normalizeMessage(m))
  },

  /**
   * Đánh dấu đã đọc hội thoại (API 43: POST /api/chats/{thread_id}/mark-read)
   */
  async markRead(threadId: number | string): Promise<boolean> {
    try {
      await apiClient.post(API_ENDPOINTS.CHAT_MARK_READ(threadId), {})
      return true
    } catch {
      return false
    }
  },

  /**
   * Gửi tin nhắn văn bản thông thường (API 39a: POST /api/chats/{thread_id}/messages)
   */
  async sendTextMessage(
    threadId: number | string,
    message: string,
    temporaryId?: string,
  ): Promise<ChatMessageItem> {
    const payload = {
      message,
      temporary_id: temporaryId || `temp_${Date.now()}`,
    }
    const response: any = await apiClient.post(API_ENDPOINTS.CHAT_MESSAGES(threadId), payload)
    return response.result || response.data || response || {
      id: payload.temporary_id,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'text' as ChatMessageType,
      content: message,
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Tải lên hình ảnh (API 39b: POST /api/chats/{thread_id}/images)
   */
  async uploadImage(threadId: number | string, file: File): Promise<ChatMessageItem> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('image', file)

    const response: any = await apiClient.post(API_ENDPOINTS.CHAT_IMAGES(threadId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.result || response.data || response || {
      id: `img_${Date.now()}`,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'image' as ChatMessageType,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Tải lên tài liệu văn bản (API 39c: POST /api/chats/{thread_id}/documents)
   */
  async uploadDocument(threadId: number | string, file: File): Promise<ChatMessageItem> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('document', file)

    const response: any = await apiClient.post(API_ENDPOINTS.CHAT_DOCUMENTS(threadId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.result || response.data || response || {
      id: `doc_${Date.now()}`,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'document' as ChatMessageType,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Tải lên tệp âm thanh / ghi âm (API 39d: POST /api/chats/{thread_id}/audio)
   */
  async uploadAudio(threadId: number | string, file: File): Promise<ChatMessageItem> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('audio', file)

    const response: any = await apiClient.post(API_ENDPOINTS.CHAT_AUDIO(threadId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.result || response.data || response || {
      id: `aud_${Date.now()}`,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'audio' as ChatMessageType,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Tải lên video (API 39e: POST /api/chats/{thread_id}/videos)
   */
  async uploadVideo(threadId: number | string, file: File): Promise<ChatMessageItem> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('video', file)

    const response: any = await apiClient.post(API_ENDPOINTS.CHAT_VIDEOS(threadId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.result || response.data || response || {
      id: `vid_${Date.now()}`,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'video' as ChatMessageType,
      file_url: URL.createObjectURL(file),
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Hàm điều hướng tự động theo loại tệp tin (39b–39e)
   */
  async uploadAttachment(
    threadId: number | string,
    file: File,
    type: 'image' | 'document' | 'audio' | 'video',
  ): Promise<ChatMessageItem> {
    switch (type) {
      case 'image':
        return this.uploadImage(threadId, file)
      case 'document':
        return this.uploadDocument(threadId, file)
      case 'audio':
        return this.uploadAudio(threadId, file)
      case 'video':
        return this.uploadVideo(threadId, file)
    }
  },
}

export default chatService

