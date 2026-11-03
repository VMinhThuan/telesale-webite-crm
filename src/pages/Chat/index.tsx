import React, { useEffect, useMemo, useState } from 'react'
import {
  useChatContacts,
  useChatThreadDetail,
  useInfiniteChatThreads,
  useMarkReadMutation,
} from '../../hooks/useChat'
import { useAuth, useUserLists } from '../../hooks/useAuth'
import { notify } from '../../utils/notify'
import { ContactItem, LightboxImage } from './types'
import { formatConversationTime } from './chatUtils'
import { ChatSidebar } from './ChatSidebar'
import { ChatRoom } from './ChatRoom'
import { ChatInfo } from './ChatInfo'
import { ImageLightboxModal } from './ImageLightboxModal'

export const Chat: React.FC = () => {
  const { user } = useAuth()
  const [previewImage, setPreviewImage] = useState<LightboxImage | null>(null)

  // 1. Tải danh sách hội thoại từ ERP với hỗ trợ phân trang vô tận (API 35: GET /api/chats?page=X&per_page=20)
  const {
    data: infiniteThreadsData,
    isLoading: isLoadingThreads,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteChatThreads(20)

  const { data: contactsData } = useChatContacts()
  // Danh bạ nhân viên telesale để hỗ trợ tìm kiếm khi cần
  useUserLists({ phong_ban: 19 })
  const markReadMutation = useMarkReadMutation()

  const rawThreads = useMemo(() => {
    return infiniteThreadsData?.pages.flatMap((page) => page.threads) || []
  }, [infiniteThreadsData])

  // Lấy tổng số cuộc trò chuyện chuẩn từ ERP (result.pagination.total)
  const totalThreads = useMemo(() => {
    const firstPage = infiniteThreadsData?.pages[0]
    return firstPage?.pagination?.total ?? firstPage?.total ?? rawThreads.length
  }, [infiniteThreadsData, rawThreads.length])

  // Đếm tổng số cuộc trò chuyện có tin nhắn chưa đọc
  const totalUnreadCount = useMemo(() => {
    return rawThreads.filter((t: any) => Number(t.unread_count || 0) > 0).length
  }, [rawThreads])

  // Chuẩn hóa danh sách hội thoại từ ERP (API 35: GET /api/chats)
  const contactList: ContactItem[] = useMemo(() => {
    if (!rawThreads || rawThreads.length === 0) return []

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
      const time = formatConversationTime(timeStr)

      // Chuẩn hóa đường dẫn avatar từ ERP (/messenger/assets/...)
      const avatarUrl = t.avatar
        ? t.avatar.startsWith('http')
          ? t.avatar
          : `https://locnuoc365.xyz${t.avatar}`
        : null

      const unread = t.unread_count && Number(t.unread_count) > 0 ? String(t.unread_count) : ''
      const tones = ['blue', 'green', 'amber', 'purple', 'rose']
      const tone = isGroup ? 'group' : tones[index % tones.length]

      return {
        id: t.thread_id || t.id,
        name,
        preview,
        time,
        tone,
        unread,
        isGroup,
        avatarUrl,
      }
    })
  }, [rawThreads])

  const [activeContact, setActiveContact] = useState<ContactItem | null>(null)

  // 2. Quản lý Responsive Master-Detail cho Tablet & Mobile
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  })
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    return typeof window !== 'undefined'
      ? window.innerWidth > 768 && window.innerWidth <= 1200
      : false
  })
  const [mobileView, setMobileView] = useState<'sidebar' | 'room' | 'info'>('sidebar')
  const [showInfoPanel, setShowInfoPanel] = useState<boolean>(true)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const mobile = width <= 768
      const tablet = width > 768 && width <= 1200
      setIsMobile(mobile)
      setIsTablet(tablet)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Tự động mở cuộc hội thoại mới nhất khi có dữ liệu từ ERP
  useEffect(() => {
    if (contactList.length > 0) {
      const isCurrentValid = activeContact && contactList.some((c) => c.id === activeContact.id)
      if (!isCurrentValid) {
        setActiveContact(contactList[0])
      }
    }
  }, [contactList, activeContact])

  const handleSelectContact = (c: ContactItem) => {
    const isRealThread = typeof c.id === 'string' && c.id.length > 20 && c.id.includes('-')
    if (!isRealThread) {
      notify(`Chưa có lịch sử hội thoại với ${c.name} trên ERP.`)
      return
    }

    setActiveContact(c)
    if (isMobile) {
      setMobileView('room')
    }
    // Nếu hội thoại có tin nhắn chưa đọc, kích hoạt đánh dấu đã đọc trên ERP (API 43)
    if (c.unread) {
      markReadMutation.mutate(c.id)
    }
  }

  const handleBackToSidebar = () => {
    setMobileView('sidebar')
  }

  const handleToggleInfo = () => {
    if (isMobile) {
      setMobileView((prev) => (prev === 'info' ? 'room' : 'info'))
    } else {
      setShowInfoPanel((prev) => !prev)
    }
  }

  const handleCloseInfo = () => {
    if (isMobile) {
      setMobileView('room')
    } else {
      setShowInfoPanel(false)
    }
  }

  // 3. Tải tin nhắn & danh sách thành viên của hội thoại đang chọn (API 37: GET /api/chats/{thread_id})
  const {
    data: threadDetail,
    isLoading: isLoadingMessages,
  } = useChatThreadDetail(activeContact?.id)

  return (
    <div className={`chat-page ${isMobile ? 'is-mobile' : ''}`}>
      <div
        className={`chat-layout ${!showInfoPanel ? 'info-hidden' : ''} ${
          isMobile ? `mobile-view-${mobileView}` : ''
        }`}
      >
        {/* Cột 1: Danh sách hội thoại & tìm kiếm đồng nghiệp */}
        {(!isMobile || mobileView === 'sidebar') && (
          <ChatSidebar
            contactList={contactList}
            activeContact={activeContact}
            onSelectContact={handleSelectContact}
            totalThreads={totalThreads}
            totalUnreadCount={totalUnreadCount}
            isLoadingThreads={isLoadingThreads}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={fetchNextPage}
            contactsData={contactsData}
          />
        )}

        {/* Cột 2: Khung trò chuyện chính, tìm kiếm tin nhắn & gửi tệp */}
        {(!isMobile || mobileView === 'room') && (
          <ChatRoom
            activeContact={activeContact}
            threadDetail={threadDetail}
            isLoadingMessages={isLoadingMessages}
            user={user}
            onPreviewImage={setPreviewImage}
            onBack={isMobile ? handleBackToSidebar : undefined}
            onToggleInfo={handleToggleInfo}
            isInfoOpen={isMobile ? mobileView === 'info' : showInfoPanel}
          />
        )}

        {/* Cột 3: Thông tin hội thoại, thành viên tham gia & tệp đã chia sẻ */}
        {isMobile && mobileView === 'info' && (
          <ChatInfo
            activeContact={activeContact}
            threadDetail={threadDetail}
            user={user}
            onPreviewImage={setPreviewImage}
            onClose={handleCloseInfo}
          />
        )}

        {!isMobile && showInfoPanel && (
          <>
            {isTablet && (
              <div
                className="chat-info-backdrop"
                onClick={handleCloseInfo}
                title="Đóng thông tin hội thoại"
              />
            )}
            <ChatInfo
              activeContact={activeContact}
              threadDetail={threadDetail}
              user={user}
              onPreviewImage={setPreviewImage}
              onClose={isTablet ? handleCloseInfo : undefined}
              isDrawer={isTablet}
            />
          </>
        )}
      </div>

      {/* Modal phóng to xem ảnh trực tiếp trên website (Lightbox) */}
      <ImageLightboxModal
        isOpen={Boolean(previewImage)}
        image={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}

export default Chat
