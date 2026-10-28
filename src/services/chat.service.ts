import { API_ENDPOINTS } from '../constants/apiEndpoints'
import { ChatMessageItem, ChatMessageType } from '../types/api'
import apiClient from './apiClient'

export const chatService = {
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

