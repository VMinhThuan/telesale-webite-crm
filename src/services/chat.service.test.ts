import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from './apiClient'
import chatService from './chat.service'

describe('Chat Service Unit Tests (API 39a - 39e)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    }
  })

  it('API 39a: sendTextMessage gửi đúng payload message và temporary_id', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {
        id: 1001,
        sender_name: 'Tôi',
        is_outgoing: true,
        type: 'text',
        content: 'Xin chào khách hàng',
        created_at: '2026-10-28T10:00:00Z',
      },
    } as any)

    const res = await chatService.sendTextMessage(123, 'Xin chào khách hàng', 'temp_999')

    expect(postSpy).toHaveBeenCalledWith('/api/chats/123/messages', {
      message: 'Xin chào khách hàng',
      temporary_id: 'temp_999',
    })
    expect(res.id).toBe(1001)
    expect(res.content).toBe('Xin chào khách hàng')
    expect(res.is_outgoing).toBe(true)
  })

  it('API 39b: uploadImage gửi FormData với headers multipart/form-data', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {
        id: 2001,
        sender_name: 'Tôi',
        is_outgoing: true,
        type: 'image',
        file_url: 'https://erp.locnuoc365.xyz/uploads/test.png',
        file_name: 'test.png',
        file_size: 1024,
        created_at: '2026-10-28T10:01:00Z',
      },
    } as any)

    const file = new File(['fake-image-content'], 'test.png', { type: 'image/png' })
    const res = await chatService.uploadImage(123, file)

    expect(postSpy).toHaveBeenCalledWith(
      '/api/chats/123/images',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )

    // Kiểm tra FormData đã append file
    const calledFormData = postSpy.mock.calls[0][1] as FormData
    expect(calledFormData.get('file')).toBeTruthy()
    expect(res.type).toBe('image')
    expect(res.file_name).toBe('test.png')
    expect(res.file_url).toBe('https://erp.locnuoc365.xyz/uploads/test.png')
  })

  it('API 39c: uploadDocument gửi FormData tới endpoint /documents', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      result: {
        id: 3001,
        sender_name: 'Tôi',
        is_outgoing: true,
        type: 'document',
        file_url: 'https://erp.locnuoc365.xyz/uploads/doc.pdf',
        file_name: 'doc.pdf',
        file_size: 2048,
        created_at: '2026-10-28T10:02:00Z',
      },
    } as any)

    const file = new File(['fake-pdf-content'], 'doc.pdf', { type: 'application/pdf' })
    const res = await chatService.uploadDocument(123, file)

    expect(postSpy).toHaveBeenCalledWith(
      '/api/chats/123/documents',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    expect(res.type).toBe('document')
    expect(res.file_name).toBe('doc.pdf')
  })

  it('API 39d & 39e: uploadAudio và uploadVideo gửi FormData đúng endpoint', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockImplementation((url: string) => {
      if (url.includes('/audio')) {
        return Promise.resolve({
          result: {
            id: 4001,
            type: 'audio',
            file_url: 'https://erp.locnuoc365.xyz/uploads/audio.mp3',
            file_name: 'audio.mp3',
          },
        } as any)
      }
      return Promise.resolve({
        result: {
          id: 5001,
          type: 'video',
          file_url: 'https://erp.locnuoc365.xyz/uploads/video.mp4',
          file_name: 'video.mp4',
        },
      } as any)
    })

    const audioFile = new File(['audio'], 'audio.mp3', { type: 'audio/mp3' })
    const audioRes = await chatService.uploadAudio(123, audioFile)
    expect(postSpy).toHaveBeenCalledWith(
      '/api/chats/123/audio',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    expect(audioRes.type).toBe('audio')

    const videoFile = new File(['video'], 'video.mp4', { type: 'video/mp4' })
    const videoRes = await chatService.uploadVideo(123, videoFile)
    expect(postSpy).toHaveBeenCalledWith(
      '/api/chats/123/videos',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    expect(videoRes.type).toBe('video')
  })

  it('uploadAttachment: điều hướng đúng hàm dựa trên loại tệp', async () => {
    const imgSpy = vi.spyOn(chatService, 'uploadImage').mockResolvedValueOnce({
      id: 1,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'image',
      created_at: '',
    })

    const docSpy = vi.spyOn(chatService, 'uploadDocument').mockResolvedValueOnce({
      id: 2,
      sender_name: 'Tôi',
      is_outgoing: true,
      type: 'document',
      created_at: '',
    })

    const dummyFile = new File([''], 'file.txt')
    await chatService.uploadAttachment(999, dummyFile, 'image')
    expect(imgSpy).toHaveBeenCalledWith(999, dummyFile)

    await chatService.uploadAttachment(999, dummyFile, 'document')
    expect(docSpy).toHaveBeenCalledWith(999, dummyFile)
  })
})

