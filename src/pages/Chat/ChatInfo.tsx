import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Download, FileText, Image as ImageIcon, Users } from 'lucide-react'
import { ContactItem, LightboxImage } from './types'
import { getInitials, isImageFile } from './chatUtils'
import { notify } from '../../utils/notify'

interface ChatInfoProps {
  activeContact: ContactItem | null
  threadDetail: any
  user: any
  onPreviewImage?: (image: LightboxImage) => void
}

export const ChatInfo: React.FC<ChatInfoProps> = ({
  activeContact,
  threadDetail,
  user,
  onPreviewImage,
}) => {
  const [showAllParticipants, setShowAllParticipants] = useState(false)

  // Tự động thu gọn danh sách thành viên khi đổi sang cuộc trò chuyện khác
  useEffect(() => {
    setShowAllParticipants(false)
  }, [activeContact?.id])

  // Xác định cuộc hội thoại hiện tại có phải nhóm trao đổi không (type === 2)
  const isGroupChat = Boolean(activeContact?.isGroup || threadDetail?.thread?.type === 2)

  // Chuẩn hóa danh sách thành viên tham gia hội thoại (chỉ áp dụng cho nhóm trao đổi)
  const displayParticipants = useMemo(() => {
    if (!isGroupChat) return []
    const participants = threadDetail?.participants
    if (participants && participants.length > 0) {
      return participants
    }
    return []
  }, [threadDetail?.participants, isGroupChat])

  // Lọc danh sách tệp đã chia sẻ từ tin nhắn (ưu tiên tệp mới nhất lên đầu)
  const sharedFiles = useMemo(() => {
    const messages = threadDetail?.messages || []
    return messages
      .filter((m: any) => m.file_url || m.type === 'document' || m.type === 'image')
      .sort((a: any, b: any) => {
        const timeA = new Date(a.created_at || 0).getTime()
        const timeB = new Date(b.created_at || 0).getTime()
        return timeB - timeA
      })
  }, [threadDetail?.messages])

  return (
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
              <strong>{threadDetail?.thread?.subject || activeContact.name}</strong>
              <span>{isGroupChat ? 'Nhóm trao đổi' : 'Đồng nghiệp Telesale'}</span>
            </div>
          </div>

          {/* Chỉ hiển thị mục Thành viên tham gia cho Nhóm trao đổi (type === 2) */}
          {isGroupChat && (
            <section>
              <div className="info-heading">
                <h3>Thành viên tham gia ({displayParticipants.length})</h3>
                {displayParticipants.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllParticipants((prev) => !prev)}
                    style={{
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 500,
                      fontSize: '11px',
                    }}
                  >
                    {showAllParticipants ? (
                      'Thu gọn'
                    ) : (
                      <>
                        Tất cả ({displayParticipants.length}) <ArrowRight size={13} />
                      </>
                    )}
                  </button>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxHeight: showAllParticipants ? '380px' : 'none',
                  overflowY: showAllParticipants ? 'auto' : 'visible',
                  paddingRight: showAllParticipants ? '4px' : '0',
                }}
              >
                {(showAllParticipants
                  ? displayParticipants
                  : displayParticipants.slice(0, 6)
                ).map((p: any, idx: number) => {
                  const pName =
                    p.name ||
                    p.owner_name ||
                    p.user_name ||
                    p.username ||
                    `Thành viên #${idx + 1}`

                  const pAvatar = p.avatar || p.owner?.avatar
                  const avatarSrc = pAvatar
                    ? pAvatar.startsWith('http')
                      ? pAvatar
                      : `https://locnuoc365.xyz${pAvatar}`
                    : null

                  const initials = getInitials(pName)
                  const isMe = p.isMe || (user?.name && pName === user.name)
                  const tones = ['blue', 'green', 'amber', 'purple', 'rose']
                  const tone = isMe ? 'manager' : tones[idx % tones.length]
                  const isAdmin = Boolean(p.admin)

                  return (
                    <div className="member" key={p.id || p.owner_id || idx}>
                      <div className={`message-avatar ${tone}`}>
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={pName}
                            style={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              objectFit: 'cover',
                            }}
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
                      <b
                        style={{
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: isAdmin ? '#eff6ff' : '#f1f5f9',
                          color: isAdmin ? '#2563eb' : '#64748b',
                          border: isAdmin ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        }}
                      >
                        {isAdmin ? 'Quản trị' : p.role || 'Thành viên'}
                      </b>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Mục Tệp đã chia sẻ */}
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
              sharedFiles.slice(0, 5).map((m: any, idx: number) => {
                const isImage = isImageFile(m)
                const fileName = m.file_name || m.content || (isImage ? 'Hình ảnh' : 'Tệp đính kèm')

                return (
                  <div
                    className="info-file"
                    key={m.id || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (isImage && m.file_url) {
                        if (onPreviewImage) {
                          onPreviewImage({
                            url: m.file_url,
                            title: fileName,
                            date: m.created_at,
                          })
                        } else {
                          window.open(m.file_url, '_blank')
                        }
                      } else if (m.file_url) {
                        window.open(m.file_url, '_blank')
                      }
                    }}
                  >
                    {isImage ? (
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#eff6ff',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {m.file_url ? (
                          <img
                            src={m.file_url}
                            alt={fileName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <ImageIcon size={16} color="#2563eb" />
                        )}
                      </div>
                    ) : (
                      <FileText size={22} />
                    )}
                    <span>
                      <b>{fileName}</b>
                      <small>{m.created_at ? m.created_at.slice(0, 10) : 'Gần đây'}</small>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (m.file_url) window.open(m.file_url, '_blank')
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: 'inherit',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                      title="Mở tệp"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )
              })
            )}
          </section>
        </>
      ) : (
        <div style={{ color: '#94a3b8', fontSize: '11px', textAlign: 'center', padding: '32px 16px' }}>
          Chọn một cuộc trò chuyện để xem hồ sơ và tệp chia sẻ.
        </div>
      )}
    </aside>
  )
}

