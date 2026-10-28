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
import chatService from '../../services/chat.service'
import { ChatMessageItem, ChatMessageType } from '../../types/api'
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
}

const initialContacts: ContactItem[] = [
  { id: 'group_telesale', name: 'Nhóm Telesale', preview: 'Quản lý: Mọi người nhớ ghi chú…', time: '11:00', tone: 'group', unread: '3', isGroup: true },
  { id: 'group_tech', name: 'Điều phối kỹ thuật', preview: 'Lê Văn Hùng: Đã xử lý xong', time: '10:32', tone: 'green', unread: '2', isGroup: true },
  { id: 'group_hr', name: 'Thông báo nội bộ', preview: 'Phòng HCNS: Lịch nghỉ lễ 20/10…', time: '08:15', tone: 'amber', unread: '', isGroup: true },
  { id: 'user_1', name: 'Nguyễn Văn A', preview: 'Dạ, em sẽ liên hệ lại khách.', time: '10:47', tone: 'blue', unread: '', isGroup: false },
  { id: 'user_2', name: 'Trần Thị Lan', preview: 'Cảm ơn anh!', time: '10:38', tone: 'rose', unread: '', isGroup: false },
  { id: 'user_3', name: 'Lê Văn Hùng', preview: 'Đã gửi file anh xem nhé.', time: '09:55', tone: 'purple', unread: '', isGroup: false },
]

const initialMessages: ChatMessageItem[] = [
  {
    id: 'msg_1',
    sender_name: 'Nguyễn Văn A',
    is_outgoing: false,
    type: 'text',
    content: 'Em đã xác nhận 3 lịch hẹn sáng mai và cập nhật vào Đơn hàng.',
    created_at: '10:45',
  },
  {
    id: 'msg_2',
    sender_name: 'Trần Thị Lan',
    is_outgoing: false,
    type: 'text',
    content: 'Slot 14:30 ngày 05/10 còn chỗ không ạ?',
    created_at: '10:48',
  },
  {
    id: 'msg_3',
    sender_name: 'Quản lý',
    is_outgoing: true,
    type: 'text',
    content: 'Còn 2 slot. Em kiểm tra lại bảng Slot hẹn đơn trước khi xác nhận với khách nhé.',
    created_at: '10:50',
  },
  {
    id: 'msg_4',
    sender_name: 'Trần Thị Lan',
    is_outgoing: false,
    type: 'text',
    content: 'Dạ, em đã kiểm tra và xác nhận lịch với khách.',
    created_at: '10:51',
  },
  {
    id: 'msg_5',
    sender_name: 'Lê Văn Hùng',
    is_outgoing: false,
    type: 'document',
    file_name: 'Quy_trinh_hen_don.pdf',
    content: 'Tài liệu hướng dẫn',
    created_at: '10:55',
  },
  {
    id: 'msg_6',
    sender_name: 'Quản lý',
    is_outgoing: true,
    type: 'text',
    content: 'Mọi người nhớ ghi chú đầy đủ sau mỗi cuộc gọi.',
    created_at: '11:00',
  },
]

export const Chat: React.FC = () => {
  const [activeContact, setActiveContact] = useState<ContactItem>(initialContacts[0])
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessageItem[]>(initialMessages)
  const [filterUnread, setFilterUnread] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Trạng thái đính kèm tệp tin (API 39b–39e)
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFileType, setPendingFileType] = useState<ChatMessageType>('document')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Đóng menu đính kèm khi click chuột ra ngoài
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

  // Kích hoạt input file theo loại tệp mong muốn
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

  // Khi người dùng chọn file từ máy
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Giới hạn dung lượng tệp: tối đa 25MB
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

    // Reset value input để có thể chọn lại cùng một file nếu cần
    e.target.value = ''
  }

  // Hủy tệp đang đính kèm
  const handleCancelPendingFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setPendingFile(null)
  }

  // Gửi tin nhắn (Văn bản hoặc Đính kèm tệp)
  const handleSend = async () => {
    const hasText = Boolean(message.trim())
    const hasFile = Boolean(pendingFile)

    if (!hasText && !hasFile) return

    setIsUploading(true)

    try {
      // 1. Nếu có tệp đính kèm (API 39b–39e)
      if (pendingFile) {
        const fileUploadType = pendingFileType === 'text' ? 'document' : pendingFileType
        const uploadedMsg = await chatService.uploadAttachment(
          activeContact.id,
          pendingFile,
          fileUploadType as 'image' | 'document' | 'audio' | 'video',
        )

        setMessages((curr) => [
          ...curr,
          {
            ...uploadedMsg,
            sender_name: 'Tôi',
            is_outgoing: true,
            created_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ])

        notify(`Đã tải lên tệp: ${pendingFile.name}`)
        handleCancelPendingFile()
      }

      // 2. Nếu có tin nhắn văn bản đi kèm (API 39a)
      if (hasText) {
        const textMsg = await chatService.sendTextMessage(activeContact.id, message.trim())
        setMessages((curr) => [
          ...curr,
          {
            ...textMsg,
            sender_name: 'Tôi',
            is_outgoing: true,
            created_at: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          },
        ])
        setMessage('')
      }
    } catch {
      notify('Không thể gửi tin nhắn hoặc tệp tin. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }

  const filteredContacts = useMemo(() => {
    return initialContacts.filter((c) => {
      const matchSearch = c.name.toLocaleLowerCase('vi').includes(searchQuery.toLocaleLowerCase('vi'))
      const matchUnread = filterUnread ? Boolean(c.unread) : true
      return matchSearch && matchUnread
    })
  }, [searchQuery, filterUnread])

  const groupContacts = filteredContacts.filter((c) => c.isGroup)
  const privateContacts = filteredContacts.filter((c) => !c.isGroup)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="chat-page">
      <div className="chat-title">
        <div>
          <p>
            Trao đổi công việc giữa nhân viên và quản lý <span>· Thời gian thực</span>
          </p>
          <h1>Chat nội bộ</h1>
        </div>
      </div>

      <div className="chat-layout">
        {/* Cột 1: Danh sách hội thoại */}
        <aside className="chat-list">
          <div className="chat-list-head">
            <h2>Hội thoại</h2>
            <button
              type="button"
              onClick={() => notify('Tạo cuộc trò chuyện mới')}
              title="Tạo hội thoại mới"
            >
              <Plus size={18} />
            </button>
          </div>

          <label className="chat-search">
            <Search size={17} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm người hoặc nhóm..."
            />
          </label>

          <div className="chat-filter">
            <button
              type="button"
              className={!filterUnread ? 'active' : ''}
              onClick={() => setFilterUnread(false)}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={filterUnread ? 'active' : ''}
              onClick={() => setFilterUnread(true)}
            >
              Chưa đọc
            </button>
          </div>

          {groupContacts.length > 0 && <p className="chat-section">NHÓM</p>}
          {
            groupContacts.map((contact) => (
              <button
                onClick={() => setActiveContact(contact)}
                className={`contact ${activeContact.id === contact.id ? 'active' : ''}`}
                key={contact.id}
                type="button"
              >
                <div className={`contact-avatar ${contact.tone}`}>
                  <Users size={22} />
                </div>
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.preview}</span>
                </div>
                <time>
                  {contact.time}
                  {contact.unread && <b>{contact.unread}</b>}
                </time>
              </button>
            ))
          }

          {privateContacts.length > 0 && <p className="chat-section private">TIN NHẮN RIÊNG</p>}
          {
            privateContacts.map((contact) => (
              <button
                onClick={() => setActiveContact(contact)}
                className={`contact ${activeContact.id === contact.id ? 'active' : ''}`}
                key={contact.id}
                type="button"
              >
                < div className={`contact-avatar ${contact.tone}`}>
                  {contact.name
                    .split(' ')
                    .map((x) => x[0])
                    .slice(-2)
                    .join('')}
                  <i />
                </div>
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.preview}</span>
                </div>
                <time>{contact.time}</time>
              </button>
            ))
          }
        </aside>

        {/* Cột 2: Khung chat trung tâm */}
        <main className="chat-room">
          <header className="chat-room-head">
            <div className={`contact-avatar ${activeContact.tone}`}>
              {activeContact.isGroup ? (
                <Users size={24} />
              ) : (
                activeContact.name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(-2)
                  .join('')
              )}
            </div>
            <div>
              <h2>{activeContact.name}</h2>
              <p>
                {activeContact.isGroup ? '8 thành viên · ' : 'Nhân viên · '}
                <i /> đang hoạt động
              </p>
            </div>
            <span />
            <button
              type="button"
              onClick={() => notify('Tìm kiếm trong hội thoại')}
              title="Tìm kiếm"
            >
              <Search size={19} />
            </button>
            <button
              type="button"
              onClick={() => notify('Tùy chọn phòng chat')}
              title="Tùy chọn"
            >
              <MoreHorizontal size={20} />
            </button>
          </header>

          <div className="pinned-message">
            <Pin size={16} />
            <b>Tin ghim:</b> Xác nhận slot trước khi hẹn khách.
            <ArrowRight size={16} />
          </div>

          {/* Vùng hiển thị tin nhắn */}
          <section className="messages">
            <div className="date-divider">
              <span>Hôm nay, 04/10/2026</span>
            </div>

            {messages.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`message ${item.is_outgoing ? 'outgoing' : 'incoming'}`}
              >
                {!item.is_outgoing && (
                  <div className="message-avatar blue">
                    {item.sender_name
                      .split(' ')
                      .map((x) => x[0])
                      .slice(-2)
                      .join('')}
                  </div>
                )}

                <div>
                  <p>
                    <b>{item.sender_name}</b>
                    <time>{item.created_at}</time>
                  </p>

                  {/* Tin nhắn ảnh (API 39b) */}
                  {item.type === 'image' && (
                    <div style={{ margin: '4px 0', maxWidth: '280px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img
                        src={item.file_url}
                        alt={item.file_name || 'Hình ảnh đính kèm'}
                        style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '240px', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  {/* Tin nhắn tài liệu PDF/Word (API 39c) */}
                  {item.type === 'document' && (
                    <div className="shared-file" style={{ cursor: 'pointer' }} onClick={() => notify(`Đang mở: ${item.file_name || 'Tài liệu'}`)}>
                      <FileText size={25} />
                      <span>
                        <b>{item.file_name || item.content || 'Tài liệu'}</b>
                        <small>
                          {item.file_size ? formatFileSize(item.file_size) : 'Tài liệu đính kèm'}
                        </small>
                      </span>
                      <Download size={20} />
                    </div>
                  )}

                  {/* Tin nhắn âm thanh / Ghi âm (API 39d) - Tự phục hồi Signed URL 403 */}
                  {item.type === 'audio' && (
                    <div style={{ margin: '4px 0' }}>
                      <SecureAudioPlayer
                        src={item.file_url}
                        title={item.file_name || 'Ghi âm đính kèm'}
                        compact
                      />
                    </div>
                  )}

                  {/* Tin nhắn video (API 39e) - Tự phục hồi Signed URL 403 */}
                  {item.type === 'video' && (
                    <div style={{ margin: '4px 0' }}>
                      <SecureVideoPlayer src={item.file_url} />
                    </div>
                  )}

                  {/* Tin nhắn văn bản (API 39a) */}
                  {item.content && item.type !== 'document' && (
                    <span>{item.content}</span>
                  )}

                  {item.is_outgoing && <small className="seen">✓✓ Đã xem</small>}
                </div>

                {item.is_outgoing && <div className="message-avatar manager">QL</div>}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </section>

          {/* Thanh xem trước tệp chuẩn bị gửi (Pending Attachment Preview) */}
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
                    style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#e2e8f0', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
                    {pendingFileType === 'image' && <ImageIcon size={20} />}
                    {pendingFileType === 'document' && <FileText size={20} />}
                    {pendingFileType === 'audio' && <Mic size={20} />}
                    {pendingFileType === 'video' && <Film size={20} />}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '320px' }}>
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
                <Paperclip size={20} />
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
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
              <Smile size={21} />
            </button>

            <button
              onClick={handleSend}
              className="send-button"
              type="button"
              disabled={isUploading || (!message.trim() && !pendingFile)}
              style={{
                opacity: isUploading || (!message.trim() && !pendingFile) ? 0.6 : 1,
                cursor: isUploading || (!message.trim() && !pendingFile) ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
        </main>

        {/* Cột 3: Thông tin nhóm & tệp đính kèm */}
        < aside className="chat-info" >
          <h2>Thông tin nhóm</h2>
          <div className="chat-group-info">
            <div className="contact-avatar group">
              <Users size={25} />
            </div>
            <div>
              <strong>{activeContact.name}</strong>
              <span>{activeContact.isGroup ? '8 thành viên' : 'Nhân viên Telesale'}</span>
            </div>
          </div>

          <section>
            <div className="info-heading">
              <h3>Thành viên</h3>
              <button
                type="button"
                onClick={() => notify('Xem tất cả thành viên')}
              >
                Xem tất cả <ArrowRight size={14} />
              </button>
            </div>
            {[
              ['QL', 'Quản lý', 'Quản trị viên', 'manager'],
              ['NA', 'Nguyễn Văn A', '', 'blue'],
              ['TL', 'Trần Thị Lan', '', 'rose'],
              ['LH', 'Lê Văn Hùng', '', 'purple'],
            ].map(([init, name, role, tone]) => (
              <div className="member" key={name}>
                <div className={`message-avatar ${tone}`}>
                  {init}
                  <i />
                </div>
                <span>{name}</span>
                {role && <b>{role}</b>}
              </div>
            ))}
          </section>

          <section className="pinned-info">
            <h3>Tin nhắn đã ghim</h3>
            <p>
              <Pin size={16} /> Xác nhận slot trước khi hẹn khách.
            </p>
          </section>

          <section className="shared-info">
            <div className="info-heading">
              <h3>Tệp đã chia sẻ</h3>
              <button
                type="button"
                onClick={() => notify('Xem tất cả tài liệu đã chia sẻ')}
              >
                Xem tất cả <ArrowRight size={14} />
              </button>
            </div>
            {[
              ['Quy_trinh_hen_don.pdf', 'Tài liệu hướng dẫn', '10:55 04/10/2026'],
              ['Kich_ban_tu_van.pdf', 'Kịch bản tư vấn khách hàng', '09:20 04/10/2026'],
            ].map(([file, desc, date]) => (
              <div className="info-file" key={file}>
                <FileText size={25} />
                <span>
                  <b>{file}</b>
                  <small>
                    {desc}
                    <br />
                    {date}
                  </small>
                </span>
                <Download size={18} />
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}

export default Chat
