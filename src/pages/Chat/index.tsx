import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Search,
  Smile,
  Users,
  X,
} from 'lucide-react'
import {
  useChatContacts,
  useChatThreadDetail,
  useChatThreads,
  useSendMessageMutation,
  useUploadAttachmentMutation,
} from '../../hooks/useChat'
import { useAuth, useUserLists } from '../../hooks/useAuth'
import { ChatMessageType } from '../../types/api'
import { notify } from '../../utils/notify'
import { SecureAudioPlayer } from '../../components/common/SecureAudioPlayer'
import { SecureVideoPlayer } from '../../components/common/SecureVideoPlayer'

interface ContactItem {
  id: number | string
  name: string
  preview: string
  time: string
  tone: string
  unread: string
  isGroup: boolean
  avatarUrl?: string | null
}

function getInitials(name: string): string {
  if (!name) return 'U'
  const clean = name.trim().replace(/^Hội thoại\s*#/i, '')
  const words = clean.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'U'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

export const Chat: React.FC = () => {
  const { user } = useAuth()

  // 1. Tải danh sách hội thoại từ (API 35: GET /api/chats?page=1&per_page=20)
  const { data: threadsData, isLoading: isLoadingThreads } = useChatThreads()
  const { data: contactsData } = useChatContacts()
  const { data: staffData } = useUserLists({ phong_ban: 19 })

  const staffList = useMemo(() => {
    if (!staffData) return []
    if (Array.isArray(staffData)) return staffData
    return staffData.items || []
  }, [staffData])

  // Chuẩn hóa danh sách hội thoại từ (đọc đúng trường subject, type, avatar, latest_message từ API)
  const contactList: ContactItem[] = useMemo(() => {
    const rawThreads = threadsData?.threads || []
    if (rawThreads.length > 0) {
      return rawThreads.map((t: any, index: number) => {
        // ERP quy định: type === 2 là nhóm chat, type === 1 là chat cá nhân 1-1
        const isGroup = t.type === 2 || Boolean(t.is_group)
        const name =
          t.subject ||
          t.name ||
          t.title ||
          (isGroup ? `Nhóm trao đổi #${index + 1}` : `Đồng nghiệp #${index + 1}`)

        // Đọc trường latest_message của ERP (chứa body, created_at, owner_name)
        const latestMsg = t.latest_message || t.last_message
        const rawMsg =
          latestMsg?.body ||
          latestMsg?.content ||
          (typeof latestMsg === 'string' ? latestMsg : '') ||
          t.preview ||
          ''
        const preview = rawMsg ? String(rawMsg) : 'Chưa có tin nhắn gần đây'

        const timeStr = latestMsg?.created_at || t.updated_at || t.created_at || ''
        const time = timeStr.length >= 16 ? timeStr.slice(11, 16) : ''

        // Chuẩn hóa đường dẫn avatar từ ERP (/messenger/assets/...)
        const avatarUrl = t.avatar
          ? t.avatar.startsWith('http')
            ? t.avatar
            : `https://locnuoc365.xyz${t.avatar}`
          : null

        const unread = t.unread_count && t.unread_count > 0 ? String(t.unread_count) : ''
        const tones = ['blue', 'green', 'amber', 'purple', 'rose']
        const tone = isGroup ? 'group' : tones[index % tones.length]

        return {
          id: t.thread_id || t.id || index + 1,
          name,
          preview,
          time,
          tone,
          unread,
          isGroup,
          avatarUrl,
        }
      })
    }

    // Nếu ERP chưa có hội thoại nào, hiển thị danh bạ đồng nghiệp (API 05 / 42)
    const rawContacts = Array.isArray(contactsData) && contactsData.length > 0 ? contactsData : staffList
    return rawContacts.map((c: any, index: number) => {
      const name = c.name || c.user_name || c.username || `Nhân sự #${c.id || index + 1}`
      const tones = ['blue', 'green', 'amber', 'purple', 'rose']
      return {
        id: c.id || c.user_id || index + 1,
        name,
        preview: 'Bắt đầu cuộc trò chuyện',
        time: '',
        tone: tones[index % tones.length],
        unread: '',
        isGroup: false,
      }
    })
  }, [threadsData?.threads, contactsData, staffList])

  const [activeContact, setActiveContact] = useState<ContactItem | null>(null)

  // Tự động chọn cuộc hội thoại đầu tiên khi có dữ liệu
  useEffect(() => {
    if (contactList.length > 0 && !activeContact) {
      setActiveContact(contactList[0])
    }
  }, [contactList, activeContact])

  const [message, setMessage] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 2. Tải tin nhắn & danh sách thành viên của hội thoại đang chọn (API 37: GET /api/chats/{thread_id})
  const {
    data: threadDetail,
    isLoading: isLoadingMessages,
  } = useChatThreadDetail(activeContact?.id)

  const fetchedMessages = useMemo(() => threadDetail?.messages || [], [threadDetail?.messages])
  const participants = useMemo(() => threadDetail?.participants || [], [threadDetail?.participants])

  const sendMessageMutation = useSendMessageMutation()
  const uploadAttachmentMutation = useUploadAttachmentMutation()

  // Trạng thái đính kèm tệp tin (API 39b–39e)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFileType, setPendingFileType] = useState<ChatMessageType>('document')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [fetchedMessages])

  // Đóng menu đính kèm khi click ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setAttachMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Dọn dẹp object url khi component unmount hoặc hủy tệp
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleTriggerFileInput = (type: ChatMessageType) => {
    setPendingFileType(type)
    setAttachMenuOpen(false)

    if (fileInputRef.current) {
      if (type === 'image') {
        fileInputRef.current.accept = 'image/*'
      } else if (type === 'document') {
        fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv'
      } else if (type === 'audio') {
        fileInputRef.current.accept = 'audio/*'
      } else if (type === 'video') {
        fileInputRef.current.accept = 'video/*'
      }
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      notify('Dung lượng tệp vượt quá giới hạn 25MB.')
      return
    }

    setPendingFile(file)
    if (pendingFileType === 'image' || file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }

    e.target.value = ''
  }

  const handleCancelPendingFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setPendingFile(null)
  }

  const handleSend = async () => {
    if (!activeContact) {
      notify('Vui lòng chọn cuộc hội thoại để gửi tin nhắn.')
      return
    }

    const hasText = Boolean(message.trim())
    const hasFile = Boolean(pendingFile)

    if (!hasText && !hasFile) return

    try {
      if (pendingFile) {
        const fileUploadType = pendingFileType === 'text' ? 'document' : pendingFileType
        await uploadAttachmentMutation.mutateAsync({
          threadId: activeContact.id,
          file: pendingFile,
          type: fileUploadType as 'image' | 'document' | 'audio' | 'video',
        })
        handleCancelPendingFile()
      }

      if (hasText) {
        await sendMessageMutation.mutateAsync({
          threadId: activeContact.id,
          message: message.trim(),
        })
        setMessage('')
      }
    } catch {
      // Đã xử lý thông báo trong hook
    }
  }

  const filteredContacts = useMemo(() => {
    return contactList.filter((c) => {
      const matchSearch = c.name.toLocaleLowerCase('vi').includes(searchQuery.toLocaleLowerCase('vi'))
      const matchUnread = filterUnread ? Boolean(c.unread) : true
      return matchSearch && matchUnread
    })
  }, [contactList, searchQuery, filterUnread])

  const groupContacts = filteredContacts.filter((c) => c.isGroup)
  const privateContacts = filteredContacts.filter((c) => !c.isGroup)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const isUploading = sendMessageMutation.isPending || uploadAttachmentMutation.isPending

  const sharedFiles = useMemo(() => {
    return fetchedMessages.filter((m) => m.file_url || m.type === 'document' || m.type === 'image')
  }, [fetchedMessages])

  return (
    <div className="chat-page">

      <div className="chat-layout">
        {/* Cột 1: Danh sách hội thoại (Chuẩn Design System .chat-list) */}
        <aside className="chat-list">
          <div className="chat-list-head">
            <h2>Đoạn chat</h2>
            <button
              type="button"
              onClick={() => notify('Tạo cuộc trò chuyện hoặc nhóm mới')}
              title="Tạo nhóm trao đổi mới"
            >
              <Plus size={16} />
            </button>
          </div>

          <label className="chat-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tin nhắn, đồng nghiệp..."
            />
          </label>

          <div className="chat-filter">
            <button
              className={!filterUnread ? 'active' : ''}
              onClick={() => setFilterUnread(false)}
              type="button"
            >
              Tất cả ({contactList.length})
            </button>
            <button
              className={filterUnread ? 'active' : ''}
              onClick={() => setFilterUnread(true)}
              type="button"
            >
              Chưa đọc
            </button>
          </div>

          {isLoadingThreads ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
              Đang tải danh sách hội thoại...
            </div>
          ) : filteredContacts.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
              Không tìm thấy hội thoại nào.
            </div>
          ) : (
            <>
              {groupContacts.length > 0 && (
                <>
                  <p className="chat-section">NHÓM TRAO ĐỔI ({groupContacts.length})</p>
                  {groupContacts.map((c) => (
                    <button
                      key={c.id}
                      className={`contact ${activeContact?.id === c.id ? 'active' : ''}`}
                      onClick={() => setActiveContact(c)}
                      type="button"
                    >
                      <div className="contact-avatar group">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            style={{ width: '100%', height: '100%', borderRadius: '9px', objectFit: 'cover' }}
                          />
                        ) : (
                          <Users size={18} />
                        )}
                        <i />
                      </div>
                      <div>
                        <strong>{c.name}</strong>
                        <span>{c.preview}</span>
                      </div>
                      <time>
                        {c.time}
                        {c.unread && <b>{c.unread}</b>}
                      </time>
                    </button>
                  ))}
                </>
              )}

              <p className={`chat-section ${groupContacts.length > 0 ? 'private' : ''}`}>
                ĐỒNG NGHIỆP & CÁ NHÂN ({privateContacts.length})
              </p>
              {privateContacts.map((c) => (
                <button
                  key={c.id}
                  className={`contact ${activeContact?.id === c.id ? 'active' : ''}`}
                  onClick={() => setActiveContact(c)}
                  type="button"
                >
                  <div className={`contact-avatar ${c.tone}`}>
                    {c.avatarUrl ? (
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      getInitials(c.name)
                    )}
                    <i />
                  </div>
                  <div>
                    <strong>{c.name}</strong>
                    <span>{c.preview}</span>
                  </div>
                  <time>
                    {c.time}
                    {c.unread && <b>{c.unread}</b>}
                  </time>
                </button>
              ))}
            </>
          )}
        </aside>

        {/* Cột 2: Khung trò chuyện chính (Chuẩn Design System .chat-room) */}
        <main className="chat-room">
          {activeContact ? (
            <>
              <div className="chat-room-head">
                <div className={`contact-avatar ${activeContact.tone}`}>
                  {activeContact.avatarUrl ? (
                    <img
                      src={activeContact.avatarUrl}
                      alt={activeContact.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: activeContact.isGroup ? '9px' : '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : activeContact.isGroup ? (
                    <Users size={18} />
                  ) : (
                    getInitials(activeContact.name)
                  )}
                  <i />
                </div>
                <div>
                  <h2>{activeContact.name}</h2>
                  <p>
                    <i /> {activeContact.isGroup ? 'Nhóm trao đổi nội bộ' : 'Đang trực tuyến'}
                  </p>
                </div>
                <span />
                <button
                  type="button"
                  onClick={() => notify(`Tìm kiếm tin nhắn trong ${activeContact.name}`)}
                  title="Tìm kiếm tin nhắn"
                >
                  <Search size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => notify(`Tùy chọn hội thoại: ${activeContact.name}`)}
                  title="Tùy chọn"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="pinned-message">
                <Pin size={13} />
                <b>Ghi chú:</b> Trao đổi trực tiếp công việc và cập nhật lịch hẹn khách hàng.
              </div>

              {/* Vùng tin nhắn */}
              <section className="messages">
                <div className="date-divider">
                  <span>Hôm nay</span>
                </div>

                {isLoadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '12px' }}>
                    Đang nạp tin nhắn...
                  </div>
                ) : fetchedMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '12px' }}>
                    Chưa có tin nhắn trong cuộc trò chuyện này. Hãy gửi lời chào đầu tiên!
                  </div>
                ) : (
                  fetchedMessages.map((item, idx) => {
                    const isOutgoing =
                      item.is_outgoing ||
                      (user?.name && item.sender_name === user.name) ||
                      (!activeContact.isGroup &&
                        activeContact.name &&
                        item.sender_name !== activeContact.name)

                    return (
                      <div
                        key={item.id || idx}
                        className={`message ${isOutgoing ? 'outgoing' : ''}`}
                      >
                        {!isOutgoing && (
                          <div className="message-avatar blue">
                            {getInitials(item.sender_name)}
                          </div>
                        )}

                        <div>
                          <p>
                            <b>{isOutgoing ? 'Tôi' : item.sender_name}</b>
                            <time>{item.created_at ? item.created_at.slice(11, 16) : ''}</time>
                          </p>

                          {/* Tin nhắn ảnh (API 39b) */}
                          {item.type === 'image' && (
                            <div
                              style={{
                                margin: '4px 0',
                                maxWidth: '280px',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <img
                                src={item.file_url}
                                alt={item.file_name || 'Hình ảnh đính kèm'}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  display: 'block',
                                  maxHeight: '240px',
                                  objectFit: 'cover',
                                }}
                              />
                            </div>
                          )}

                          {/* Tin nhắn tài liệu PDF/Word (API 39c) */}
                          {item.type === 'document' && (
                            <div
                              className="shared-file"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (item.file_url) window.open(item.file_url, '_blank')
                                else notify(`Tài liệu: ${item.file_name || item.content}`)
                              }}
                            >
                              <FileText size={25} />
                              <span>
                                <b>{item.file_name || item.content || 'Tài liệu'}</b>
                                <small>
                                  {item.file_size ? formatFileSize(item.file_size) : 'Tài liệu đính kèm'}
                                </small>
                              </span>
                              <Download size={18} />
                            </div>
                          )}

                          {/* Tin nhắn âm thanh / Ghi âm (API 39d) */}
                          {item.type === 'audio' && (
                            <div style={{ margin: '4px 0' }}>
                              <SecureAudioPlayer
                                src={item.file_url}
                                title={item.file_name || 'Ghi âm đính kèm'}
                                compact
                              />
                            </div>
                          )}

                          {/* Tin nhắn video (API 39e) */}
                          {item.type === 'video' && (
                            <div style={{ margin: '4px 0' }}>
                              <SecureVideoPlayer src={item.file_url} />
                            </div>
                          )}

                          {/* Tin nhắn văn bản thông thường (API 39a / RTippin Messenger type 0) */}
                          {item.content && item.type === 'text' && <span>{item.content}</span>}

                          {isOutgoing && <small className="seen">✓✓ Đã gửi</small>}
                        </div>

                        {isOutgoing && <div className="message-avatar manager">Tôi</div>}
                      </div>
                    )
                  })
                )}

                <div ref={messagesEndRef} />
              </section>

              {/* Thanh xem trước tệp chuẩn bị gửi */}
              {pendingFile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    borderTop: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '12px',
                    color: '#334155',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          backgroundColor: '#e2e8f0',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#2563eb',
                        }}
                      >
                        {pendingFileType === 'image' && <ImageIcon size={20} />}
                        {pendingFileType === 'document' && <FileText size={20} />}
                        {pendingFileType === 'audio' && <Mic size={20} />}
                        {pendingFileType === 'video' && <Film size={20} />}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: 'block',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: '320px',
                        }}
                      >
                        {pendingFile.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatFileSize(pendingFile.size)} · Đính kèm sẵn sàng
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelPendingFile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Hủy tệp"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              {/* Input file ẩn cho các loại tệp (39b–39e) */}
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Thanh nhập tin nhắn và đính kèm tệp */}
              <div className="message-input" style={{ position: 'relative' }}>
                <div ref={attachMenuRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                    title="Đính kèm tệp tin / hình ảnh (API 39b–39e)"
                    style={{ color: pendingFile ? '#2563eb' : undefined }}
                  >
                    <Paperclip size={18} />
                  </button>

                  {/* Menu chọn loại tệp đính kèm */}
                  {attachMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 10px)',
                        left: 0,
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
                        border: '1px solid #e2e8f0',
                        padding: '6px',
                        width: '180px',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleTriggerFileInput('image')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#1e293b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <ImageIcon size={16} color="#2563eb" /> Hình ảnh (39b)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerFileInput('document')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#1e293b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <FileText size={16} color="#059669" /> Tài liệu (39c)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerFileInput('audio')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#1e293b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Mic size={16} color="#7c3aed" /> Âm thanh (39d)
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerFileInput('video')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'none',
                          color: '#1e293b',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Film size={16} color="#dc2626" /> Video (39e)
                      </button>
                    </div>
                  )}
                </div>

                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isUploading && handleSend()}
                  placeholder={pendingFile ? 'Thêm ghi chú kèm tệp tin...' : 'Nhập tin nhắn nội bộ...'}
                  disabled={isUploading}
                />

                <button
                  type="button"
                  onClick={() => notify('Chọn biểu tượng cảm xúc')}
                  title="Biểu cảm"
                >
                  <Smile size={18} />
                </button>

                <button
                  onClick={handleSend}
                  className="send-button"
                  type="button"
                  disabled={isUploading || (!message.trim() && !pendingFile)}
                  style={{
                    opacity: isUploading || (!message.trim() && !pendingFile) ? 0.6 : 1,
                    cursor:
                      isUploading || (!message.trim() && !pendingFile) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUploading ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'grid',
                placeItems: 'center',
                height: '100%',
                color: '#94a3b8',
                textAlign: 'center',
                padding: '40px',
              }}
            >
              <div>
                <Users size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                <h3>Chưa chọn cuộc trò chuyện</h3>
                <p>Chọn một đồng nghiệp hoặc nhóm trao đổi từ danh sách bên trái để bắt đầu chat.</p>
              </div>
            </div>
          )}
        </main>

        {/* Cột 3: Thông tin hội thoại & thành viên (Chuẩn Design System .chat-info) */}
        <aside className="chat-info">
          <h2>Thông tin hội thoại</h2>
          {activeContact ? (
            <>
              <div className="chat-group-info">
                <div className={`contact-avatar ${activeContact.tone}`}>
                  {activeContact.avatarUrl ? (
                    <img
                      src={activeContact.avatarUrl}
                      alt={activeContact.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: activeContact.isGroup ? '9px' : '50%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : activeContact.isGroup ? (
                    <Users size={22} />
                  ) : (
                    getInitials(activeContact.name)
                  )}
                </div>
                <div>
                  <strong>{activeContact.name}</strong>
                  <span>{activeContact.isGroup ? 'Nhóm trao đổi' : 'Đồng nghiệp Telesale'}</span>
                </div>
              </div>

              <section>
                <div className="info-heading">
                  <h3>
                    Thành viên tham gia ({participants.length > 0 ? participants.length : staffList.length})
                  </h3>
                  <button type="button" onClick={() => notify('Xem toàn bộ danh sách thành viên')}>
                    Tất cả <ArrowRight size={13} />
                  </button>
                </div>
                {(participants.length > 0 ? participants : staffList.slice(0, 6)).map(
                  (p: any, idx: number) => {
                    const pName =
                      p.owner_name ||
                      p.name ||
                      p.user_name ||
                      p.username ||
                      `Thành viên #${idx + 1}`

                    const pAvatar = p.owner?.avatar || p.avatar
                    const avatarSrc = pAvatar
                      ? pAvatar.startsWith('http')
                        ? pAvatar
                        : `https://locnuoc365.xyz${pAvatar}`
                      : null

                    const initials = getInitials(pName)
                    const isMe = user?.name && pName === user.name
                    const tones = ['blue', 'green', 'amber', 'purple', 'rose']
                    const tone = isMe ? 'manager' : tones[idx % tones.length]

                    return (
                      <div className="member" key={p.id || p.owner_id || idx}>
                        <div className={`message-avatar ${tone}`}>
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={pName}
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : isMe ? (
                            'Tôi'
                          ) : (
                            initials
                          )}
                          <i />
                        </div>
                        <span>
                          {pName} {isMe && ' (Tôi)'}
                        </span>
                        <b>{p.admin ? 'Quản trị' : p.role || 'Thành viên'}</b>
                      </div>
                    )
                  },
                )}
              </section>

              <section className="shared-info">
                <div className="info-heading">
                  <h3>Tệp đã chia sẻ ({sharedFiles.length})</h3>
                  <button
                    type="button"
                    onClick={() => notify(`Tổng số tệp đính kèm: ${sharedFiles.length}`)}
                  >
                    Xem <ArrowRight size={13} />
                  </button>
                </div>
                {sharedFiles.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '10px', margin: '8px 0' }}>
                    Chưa có tệp đính kèm nào được gửi trong hội thoại này.
                  </p>
                ) : (
                  sharedFiles.slice(0, 5).map((m, idx) => (
                    <div
                      className="info-file"
                      key={m.id || idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (m.file_url) window.open(m.file_url, '_blank')
                      }}
                    >
                      <FileText size={22} />
                      <span>
                        <b>{m.file_name || m.content || 'Tệp đính kèm'}</b>
                        <small>{m.created_at ? m.created_at.slice(0, 10) : 'Gần đây'}</small>
                      </span>
                      <Download size={16} />
                    </div>
                  ))
                )}
              </section>
            </>
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
              Chọn hội thoại để xem thông tin.
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Chat
