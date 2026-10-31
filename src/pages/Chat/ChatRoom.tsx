import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Search,
  Smile,
  Users,
  X,
} from 'lucide-react'
import { ContactItem, LightboxImage } from './types'
import {
  formatDateDivider,
  formatFileSize,
  formatMessageTime,
  getInitials,
  renderHighlightedContent,
} from './chatUtils'
import { useSendMessageMutation, useUploadAttachmentMutation } from '../../hooks/useChat'
import chatService from '../../services/chat.service'
import { ChatMessageItem, ChatMessageType } from '../../types/api'
import { notify } from '../../utils/notify'
import { SecureAudioPlayer } from '../../components/common/SecureAudioPlayer'
import { SecureVideoPlayer } from '../../components/common/SecureVideoPlayer'

interface ChatRoomProps {
  activeContact: ContactItem | null
  threadDetail: any
  isLoadingMessages: boolean
  user: any
  onPreviewImage?: (image: LightboxImage) => void
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  activeContact,
  threadDetail,
  isLoadingMessages,
  user,
  onPreviewImage,
}) => {
  const sendMessageMutation = useSendMessageMutation()
  const uploadAttachmentMutation = useUploadAttachmentMutation()

  // 1. Trạng thái tìm kiếm tin nhắn trong hội thoại đang mở (API 38)
  const [isSearchInChatOpen, setIsSearchInChatOpen] = useState(false)
  const [inChatSearchKeyword, setInChatSearchKeyword] = useState('')
  const [searchedKeyword, setSearchedKeyword] = useState('')
  const [isSearchingInChat, setIsSearchingInChat] = useState(false)
  const [searchResults, setSearchResults] = useState<ChatMessageItem[] | null>(null)
  const [currentResultIndex, setCurrentResultIndex] = useState(0)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | number | null>(null)

  // 2. Trạng thái nhập tin nhắn và đính kèm tệp tin (API 39a - 39e)
  const [message, setMessage] = useState('')
  const [attachMenuOpen, setAttachMenuOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingFileType, setPendingFileType] = useState<ChatMessageType>('document')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchedMessages: ChatMessageItem[] = useMemo(
    () => threadDetail?.messages || [],
    [threadDetail?.messages],
  )

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [fetchedMessages])

  const handleCloseInChatSearch = useCallback(() => {
    setIsSearchInChatOpen(false)
    setSearchResults(null)
    setInChatSearchKeyword('')
    setSearchedKeyword('')
    setCurrentResultIndex(0)
    setHighlightedMessageId(null)
  }, [])

  const handleCancelPendingFile = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return null
    })
    setPendingFile(null)
  }, [])

  // Reset tìm kiếm khi chuyển hội thoại
  useEffect(() => {
    handleCloseInChatSearch()
    handleCancelPendingFile()
    setMessage('')
  }, [activeContact?.id, handleCloseInChatSearch, handleCancelPendingFile])

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

  // Cuộn mượt tới tin nhắn chỉ định và làm nổi bật
  const scrollToMessage = (messageId: string | number) => {
    setHighlightedMessageId(messageId)
    setTimeout(() => {
      const el = document.getElementById(`msg-${messageId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    setTimeout(() => {
      setHighlightedMessageId((prev) => (prev === messageId ? null : prev))
    }, 3500)
  }

  // Điều hướng qua lại giữa các kết quả tìm kiếm (Next / Prev)
  const handleNavigateResult = (direction: 'prev' | 'next') => {
    if (!searchResults || searchResults.length === 0) return
    let nextIndex = direction === 'next' ? currentResultIndex + 1 : currentResultIndex - 1
    if (nextIndex < 0) nextIndex = searchResults.length - 1
    if (nextIndex >= searchResults.length) nextIndex = 0
    setCurrentResultIndex(nextIndex)
    const target = searchResults[nextIndex]
    if (target) {
      scrollToMessage(target.id)
    }
  }

  const handleSearchInChat = async () => {
    if (!activeContact) return
    const keyword = inChatSearchKeyword.trim()
    if (!keyword) {
      notify('Vui lòng nhập từ khóa tìm kiếm tin nhắn.')
      return
    }

    setIsSearchingInChat(true)
    try {
      const results = await chatService.searchMessages(activeContact.id, keyword)
      setSearchResults(results)
      setSearchedKeyword(keyword)
      setCurrentResultIndex(0)
      if (results.length > 0) {
        scrollToMessage(results[0].id)
      } else {
        notify(`Không tìm thấy tin nhắn nào khớp với "${keyword}".`)
      }
    } catch {
      notify('Lỗi khi tìm kiếm tin nhắn. Vui lòng thử lại.')
    } finally {
      setIsSearchingInChat(false)
    }
  }

  // Hợp nhất fetchedMessages với searchResults để giữ ngữ cảnh và cho phép scroll
  const displayMessages = useMemo(() => {
    const list =
      !searchResults || searchResults.length === 0
        ? fetchedMessages
        : (() => {
          const map = new Map<string | number, ChatMessageItem>()
          fetchedMessages.forEach((m) => map.set(m.id, m))
          searchResults.forEach((m) => {
            if (!map.has(m.id)) {
              map.set(m.id, m)
            }
          })
          return Array.from(map.values())
        })()

    // Luôn sắp xếp theo thời gian tăng dần (cũ ở trên đỉnh, mới nhất ở dưới đáy)
    return [...list].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime()
      const timeB = new Date(b.created_at || 0).getTime()
      return timeA - timeB
    })
  }, [searchResults, fetchedMessages])

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

  const isUploading = sendMessageMutation.isPending || uploadAttachmentMutation.isPending

  return (
    <main
      className="chat-room"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}
    >
      {activeContact ? (
        <>
          {/* Header phòng chat */}
          <div className="chat-room-head" style={{ flex: 'none' }}>
            {isSearchInChatOpen ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0 12px',
                    height: '38px',
                  }}
                >
                  <Search size={15} color="#64748b" />
                  <input
                    type="text"
                    placeholder={`Tìm kiếm tin nhắn với ${activeContact.name}... (Nhấn Enter để tìm)`}
                    value={inChatSearchKeyword}
                    onChange={(e) => setInChatSearchKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (
                          inChatSearchKeyword.trim() === searchedKeyword &&
                          searchResults &&
                          searchResults.length > 0
                        ) {
                          if (e.shiftKey) {
                            handleNavigateResult('prev')
                          } else {
                            handleNavigateResult('next')
                          }
                        } else {
                          handleSearchInChat()
                        }
                      }
                      if (e.key === 'Escape') handleCloseInChatSearch()
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12px',
                      outline: 'none',
                      color: '#1e293b',
                    }}
                  />
                  {inChatSearchKeyword && (
                    <button
                      type="button"
                      onClick={() => {
                        setInChatSearchKeyword('')
                        setSearchResults(null)
                        setSearchedKeyword('')
                        setCurrentResultIndex(0)
                        setHighlightedMessageId(null)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: '#94a3b8',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title="Xóa từ khóa"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchInChat}
                  disabled={isSearchingInChat}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: isSearchingInChat ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSearchingInChat ? (
                    <>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang tìm...
                    </>
                  ) : (
                    'Tìm kiếm'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseInChatSearch}
                  style={{
                    width: '38px',
                    height: '38px',
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    color: '#64748b',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                  title="Đóng tìm kiếm (Esc)"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
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
                  onClick={() => setIsSearchInChatOpen(true)}
                  title="Tìm kiếm tin nhắn trong hội thoại này (API 38)"
                  style={{
                    backgroundColor: searchResults ? '#eff6ff' : undefined,
                    color: searchResults ? '#2563eb' : undefined,
                    borderColor: searchResults ? '#bfdbfe' : undefined,
                  }}
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
              </>
            )}
          </div>

          {/* Thanh thông báo kết quả tìm kiếm (API 38) */}
          {searchResults !== null && (
            <div
              className="pinned-message"
              style={{
                flex: 'none',
                backgroundColor: '#eff6ff',
                borderColor: '#bfdbfe',
                color: '#1e40af',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <Search size={14} color="#2563eb" style={{ flexShrink: 0 }} />
                {searchResults.length > 0 ? (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Tìm thấy <b>{searchResults.length}</b> tin nhắn khớp với "<b>{searchedKeyword}</b>"
                    <span style={{ marginLeft: '6px', color: '#64748b', fontSize: '10px' }}>
                      (Kết quả {currentResultIndex + 1}/{searchResults.length})
                    </span>
                  </span>
                ) : (
                  <span>
                    Không tìm thấy tin nhắn nào khớp với "<b>{searchedKeyword}</b>".
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                {searchResults.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleNavigateResult('prev')}
                      title="Cuộn tới kết quả trước (Shift + Enter)"
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: '#fff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        color: '#2563eb',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigateResult('next')}
                      title="Cuộn tới kết quả tiếp theo (Enter)"
                      style={{
                        width: '24px',
                        height: '24px',
                        display: 'grid',
                        placeItems: 'center',
                        backgroundColor: '#fff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '4px',
                        color: '#2563eb',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = searchResults[currentResultIndex]
                        if (target) scrollToMessage(target.id)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0 4px',
                      }}
                      title="Cuộn lại đến tin này"
                    >
                      Cuộn tới tin
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleCloseInChatSearch}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    textDecoration: 'underline',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Đóng tìm kiếm
                </button>
              </div>
            </div>
          )}

          {/* Vùng hiển thị tin nhắn */}
          <section className="messages" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {isLoadingMessages ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '12px' }}>
                Đang nạp tin nhắn...
              </div>
            ) : displayMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '12px' }}>
                {searchResults !== null
                  ? `Không tìm thấy tin nhắn nào khớp với "${searchedKeyword}".`
                  : 'Chưa có tin nhắn trong cuộc trò chuyện này. Hãy gửi lời chào đầu tiên!'}
              </div>
            ) : (
              displayMessages.map((item, idx) => {
                const prevItem = idx > 0 ? displayMessages[idx - 1] : null
                const itemDate = (item.created_at || '').slice(0, 10)
                const prevDate = (prevItem?.created_at || '').slice(0, 10)
                const showDateDivider = !prevItem || itemDate !== prevDate

                const isOutgoing =
                  item.is_outgoing ||
                  (user?.name && item.sender_name === user.name) ||
                  (!activeContact.isGroup &&
                    activeContact.name &&
                    item.sender_name !== activeContact.name)

                const isHighlighted = highlightedMessageId === item.id

                return (
                  <React.Fragment key={item.id || idx}>
                    {showDateDivider && (
                      <div className="date-divider">
                        <span>{formatDateDivider(item.created_at)}</span>
                      </div>
                    )}
                    <div
                      id={`msg-${item.id}`}
                      className={`message ${isOutgoing ? 'outgoing' : ''}`}
                      style={{
                        backgroundColor: isHighlighted ? '#fef9c3' : undefined,
                        boxShadow: isHighlighted ? '0 0 0 2px #facc15' : undefined,
                        borderRadius: '10px',
                        padding: isHighlighted ? '6px 8px' : undefined,
                        transition: 'all 0.35s ease',
                      }}
                    >
                      {!isOutgoing && (
                        <div className="message-avatar blue">
                          {getInitials(item.sender_name)}
                        </div>
                      )}

                      <div>
                        <p>
                          <b>{isOutgoing ? 'Tôi' : item.sender_name}</b>
                          <time>{formatMessageTime(item.created_at)}</time>
                        </p>

                        {/* Tin nhắn ảnh */}
                        {item.type === 'image' && (
                          <div
                            style={{
                              margin: '4px 0',
                              maxWidth: '280px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: '1px solid #e2e8f0',
                              cursor: 'zoom-in',
                              position: 'relative',
                            }}
                            title="Nhấn để xem ảnh phóng to"
                            onClick={() => {
                              if (item.file_url) {
                                if (onPreviewImage) {
                                  onPreviewImage({
                                    url: item.file_url,
                                    title: item.file_name || `Hình ảnh từ ${item.sender_name}`,
                                    date: formatMessageTime(item.created_at),
                                  })
                                } else {
                                  window.open(item.file_url, '_blank')
                                }
                              }
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
                                transition: 'filter 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.filter = 'brightness(0.92)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.filter = 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* Tin nhắn tài liệu */}
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
                              <b>
                                {renderHighlightedContent(
                                  item.file_name || item.content || 'Tài liệu',
                                  searchedKeyword,
                                )}
                              </b>
                              <small>
                                {item.file_size ? formatFileSize(item.file_size) : 'Tài liệu đính kèm'}
                              </small>
                            </span>
                            <Download size={18} />
                          </div>
                        )}

                        {/* Tin nhắn âm thanh / Ghi âm */}
                        {item.type === 'audio' && (
                          <div style={{ margin: '4px 0' }}>
                            <SecureAudioPlayer
                              src={item.file_url}
                              title={item.file_name || 'Ghi âm đính kèm'}
                              compact
                            />
                          </div>
                        )}

                        {/* Tin nhắn video */}
                        {item.type === 'video' && (
                          <div style={{ margin: '4px 0' }}>
                            <SecureVideoPlayer src={item.file_url} />
                          </div>
                        )}

                        {/* Tin nhắn văn bản */}
                        {item.content && item.type === 'text' && (
                          <span>{renderHighlightedContent(item.content, searchedKeyword)}</span>
                        )}

                        {isOutgoing && <small className="seen">✓✓ Đã gửi</small>}
                      </div>

                      {isOutgoing && <div className="message-avatar manager">Tôi</div>}
                    </div>
                  </React.Fragment>
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

          {/* Input file ẩn cho các loại tệp */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Thanh nhập tin nhắn và đính kèm */}
          <div className="message-input" style={{ position: 'relative', flex: 'none' }}>
            <div ref={attachMenuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                title="Đính kèm tệp tin / hình ảnh"
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
                    <ImageIcon size={16} color="#2563eb" /> Hình ảnh
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
                    <FileText size={16} color="#059669" /> Tài liệu
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
                    <Mic size={16} color="#7c3aed" /> Âm thanh
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
                    <Film size={16} color="#dc2626" /> Video
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
            <h3 style={{ color: '#1e3868', fontSize: '16px', margin: '0 0 6px' }}>Chào mừng bạn đến với Chat nội bộ!</h3>
            <p style={{ maxWidth: '340px', margin: 'auto', fontSize: '12px', lineHeight: 1.5 }}>
              Bạn chưa có cuộc trò chuyện nào. Hãy tìm kiếm tên đồng nghiệp ở cột bên trái để bắt đầu trao đổi công việc.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

