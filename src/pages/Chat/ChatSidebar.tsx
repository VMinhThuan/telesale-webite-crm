import React, { useMemo, useState } from 'react'
import { ChevronDown, Loader2, Search, Users, X } from 'lucide-react'
import { ContactItem } from './types'
import { getInitials } from './chatUtils'

interface ChatSidebarProps {
  contactList: ContactItem[]
  activeContact: ContactItem | null
  onSelectContact: (c: ContactItem) => void
  totalThreads: number
  totalUnreadCount: number
  isLoadingThreads: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onFetchNextPage?: () => void
  contactsData?: any[]
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  contactList,
  activeContact,
  onSelectContact,
  totalThreads,
  totalUnreadCount,
  isLoadingThreads,
  hasNextPage = false,
  isFetchingNextPage = false,
  onFetchNextPage,
  contactsData,
}) => {
  const [searchContactQuery, setSearchContactQuery] = useState('')
  const [filterUnread, setFilterUnread] = useState(false)

  // Lọc danh sách hội thoại kết hợp tìm kiếm danh bạ đồng nghiệp (API 42)
  const filteredContacts = useMemo(() => {
    const q = searchContactQuery.trim().toLocaleLowerCase('vi')
    if (!q) {
      return filterUnread ? contactList.filter((c) => Boolean(c.unread)) : contactList
    }

    // 1. Tìm kiếm trong danh sách hội thoại hiện có (threads)
    const matchedThreads = contactList.filter((c) => {
      const matchName = c.name.toLocaleLowerCase('vi').includes(q)
      const matchUnread = filterUnread ? Boolean(c.unread) : true
      return matchName && matchUnread
    })

    // 2. Tìm tiếp trong danh bạ đồng nghiệp (API 42: GET /api/chats/find/contacts)
    const existingNames = new Set(contactList.map((c) => c.name.toLocaleLowerCase('vi')))
    const rawApiContacts = Array.isArray(contactsData) ? contactsData : []
    const matchedApiContacts: ContactItem[] = rawApiContacts
      .filter((ac: any) => {
        const acName = (ac.name || ac.user_name || ac.username || '').trim()
        return (
          acName &&
          !existingNames.has(acName.toLocaleLowerCase('vi')) &&
          acName.toLocaleLowerCase('vi').includes(q)
        )
      })
      .map((ac: any, index: number) => ({
        id: ac.id || ac.user_id || `contact_${index}`,
        name: ac.name || ac.user_name || ac.username || 'Đồng nghiệp',
        preview: 'Danh bạ đồng nghiệp (API 42)',
        time: '',
        tone: 'blue',
        unread: '',
        isGroup: false,
        avatarUrl: ac.avatar
          ? ac.avatar.startsWith('http')
            ? ac.avatar
            : `https://locnuoc365.xyz${ac.avatar}`
          : null,
      }))

    return [...matchedThreads, ...matchedApiContacts]
  }, [contactList, searchContactQuery, filterUnread, contactsData])

  const groupContacts = filteredContacts.filter((c) => c.isGroup)
  const privateContacts = filteredContacts.filter((c) => !c.isGroup)

  return (
    <aside className="chat-list">
      <div className="chat-list-head">
        <h2>Đoạn chat</h2>
      </div>

      {/* Ô tìm kiếm danh bạ đồng nghiệp */}
      <label className="chat-search" style={{ position: 'relative' }}>
        <Search size={15} />
        <input
          value={searchContactQuery}
          onChange={(e) => setSearchContactQuery(e.target.value)}
          placeholder="Tìm kiếm đồng nghiệp..."
        />
        {searchContactQuery && (
          <button
            type="button"
            onClick={() => setSearchContactQuery('')}
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
            title="Xóa tìm kiếm"
          >
            <X size={14} />
          </button>
        )}
      </label>

      {/* Bộ lọc Tất cả / Chưa đọc */}
      <div className="chat-filter">
        <button
          className={!filterUnread ? 'active' : ''}
          onClick={() => setFilterUnread(false)}
          type="button"
        >
          Tất cả ({totalThreads})
        </button>
        <button
          className={filterUnread ? 'active' : ''}
          onClick={() => setFilterUnread(true)}
          type="button"
        >
          Chưa đọc {totalUnreadCount > 0 ? `(${totalUnreadCount})` : '(0)'}
        </button>
      </div>

      {isLoadingThreads ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
          Đang tải danh sách hội thoại...
        </div>
      ) : filteredContacts.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '11.5px' }}>
          {searchContactQuery ? (
            <>Không tìm thấy đồng nghiệp nào khớp với "<b>{searchContactQuery}</b>".</>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>Chưa có cuộc trò chuyện nào</p>
              <span style={{ fontSize: '10.5px' }}>Gõ tên vào ô tìm kiếm ở trên để tìm đồng nghiệp nhắn tin.</span>
            </>
          )}
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
                  onClick={() => onSelectContact(c)}
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
              onClick={() => onSelectContact(c)}
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

          {/* Nút tải thêm cuộc trò chuyện (Phân trang vô tận) */}
          {hasNextPage && onFetchNextPage && (
            <div style={{ padding: '12px 16px 20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={onFetchNextPage}
                disabled={isFetchingNextPage}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: isFetchingNextPage ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Đang tải tiếp...
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} /> Tải thêm cuộc trò chuyện ({contactList.length}/{totalThreads})
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  )
}

