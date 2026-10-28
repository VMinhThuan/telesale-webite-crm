import React, { useMemo, useState } from 'react'
import {
  ArrowRight,
  Download,
  FileText,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Search,
  Smile,
  Users,
} from 'lucide-react'
import { notify } from '../../utils/notify'

interface ContactItem {
  name: string
  preview: string
  time: string
  tone: string
  unread: string
  isGroup: boolean
}

const initialContacts: ContactItem[] = [
  { name: 'Nhóm Telesale', preview: 'Quản lý: Mọi người nhớ ghi chú…', time: '11:00', tone: 'group', unread: '3', isGroup: true },
  { name: 'Điều phối kỹ thuật', preview: 'Lê Văn Hùng: Đã xử lý xong', time: '10:32', tone: 'green', unread: '2', isGroup: true },
  { name: 'Thông báo nội bộ', preview: 'Phòng HCNS: Lịch nghỉ lễ 20/10…', time: '08:15', tone: 'amber', unread: '', isGroup: true },
  { name: 'Nguyễn Văn A', preview: 'Dạ, em sẽ liên hệ lại khách.', time: '10:47', tone: 'blue', unread: '', isGroup: false },
  { name: 'Trần Thị Lan', preview: 'Cảm ơn anh!', time: '10:38', tone: 'rose', unread: '', isGroup: false },
  { name: 'Lê Văn Hùng', preview: 'Đã gửi file anh xem nhé.', time: '09:55', tone: 'purple', unread: '', isGroup: false },
]

export const Chat: React.FC = () => {
  const [active, setActive] = useState('Nhóm Telesale')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState<string[]>([])
  const [filterUnread, setFilterUnread] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      setSent((curr) => [...curr, message.trim()])
      setMessage('')
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
          {groupContacts.map(({ name, preview, time, tone, unread }) => (
            <button
              onClick={() => setActive(name)}
              className={`contact ${active === name ? 'active' : ''}`}
              key={name}
              type="button"
            >
              <div className={`contact-avatar ${tone}`}>
                <Users size={22} />
              </div>
              <div>
                <strong>{name}</strong>
                <span>{preview}</span>
              </div>
              <time>
                {time}
                {unread && <b>{unread}</b>}
              </time>
            </button>
          ))}

          {privateContacts.length > 0 && <p className="chat-section private">TIN NHẮN RIÊNG</p>}
          {privateContacts.map(({ name, preview, time, tone }) => (
            <button
              onClick={() => setActive(name)}
              className={`contact ${active === name ? 'active' : ''}`}
              key={name}
              type="button"
            >
              <div className={`contact-avatar ${tone}`}>
                {name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(-2)
                  .join('')}
                <i />
              </div>
              <div>
                <strong>{name}</strong>
                <span>{preview}</span>
              </div>
              <time>{time}</time>
            </button>
          ))}
        </aside>

        {/* Cột 2: Khung chat trung tâm */}
        <main className="chat-room">
          <header className="chat-room-head">
            <div className="contact-avatar group">
              <Users size={24} />
            </div>
            <div>
              <h2>{active}</h2>
              <p>
                8 thành viên · <i /> 3 đang online
              </p>
            </div>
            <span />
            <button
              type="button"
              onClick={() => notify('Tìm kiếm trong hội thoại')}
            >
              <Search size={19} />
            </button>
            <button
              type="button"
              onClick={() => notify('Tùy chọn phòng chat')}
            >
              <MoreHorizontal size={20} />
            </button>
          </header>

          <div className="pinned-message">
            <Pin size={16} />
            <b>Tin ghim:</b> Xác nhận slot trước khi hẹn khách.
            <ArrowRight size={16} />
          </div>

          <section className="messages">
            <div className="date-divider">
              <span>Hôm nay, 04/10/2026</span>
            </div>

            <div className="message incoming">
              <div className="message-avatar blue">NA</div>
              <div>
                <p>
                  <b>Nguyễn Văn A</b>
                  <time>10:45</time>
                </p>
                <span>Em đã xác nhận 3 lịch hẹn sáng mai và cập nhật vào Đơn hàng.</span>
              </div>
            </div>

            <div className="message incoming">
              <div className="message-avatar rose">TL</div>
              <div>
                <p>
                  <b>Trần Thị Lan</b>
                  <time>10:48</time>
                </p>
                <span>Slot 14:30 ngày 05/10 còn chỗ không ạ?</span>
              </div>
            </div>

            <div className="message outgoing">
              <div>
                <p>
                  <b>Quản lý</b>
                  <time>10:50</time>
                </p>
                <span>
                  Còn 2 slot. Em kiểm tra lại bảng Slot hẹn đơn trước khi xác nhận với khách nhé.
                </span>
              </div>
              <div className="message-avatar manager">QL</div>
            </div>

            <div className="message incoming">
              <div className="message-avatar rose">TL</div>
              <div>
                <p>
                  <b>Trần Thị Lan</b>
                  <time>10:51</time>
                </p>
                <span>Dạ, em đã kiểm tra và xác nhận lịch với khách.</span>
              </div>
            </div>

            <div className="message incoming">
              <div className="message-avatar purple">LH</div>
              <div>
                <p>
                  <b>Lê Văn Hùng</b>
                  <time>10:55</time>
                </p>
                <div className="shared-file">
                  <FileText size={25} />
                  <span>
                    <b>Quy_trinh_hen_don.pdf</b>
                    <small>Tài liệu hướng dẫn</small>
                  </span>
                  <Download size={20} />
                </div>
              </div>
            </div>

            <div className="message outgoing">
              <div>
                <p>
                  <b>Quản lý</b>
                  <time>11:00</time>
                </p>
                <span>Mọi người nhớ ghi chú đầy đủ sau mỗi cuộc gọi.</span>
                <small className="seen">✓✓ Đã xem</small>
              </div>
              <div className="message-avatar manager">QL</div>
            </div>

            {sent.map((item, i) => (
              <div className="message outgoing" key={i}>
                <div>
                  <span>{item}</span>
                </div>
                <div className="message-avatar manager">QL</div>
              </div>
            ))}
          </section>

          <div className="message-input">
            <button
              type="button"
              onClick={() => notify('Đính kèm tệp tin tài liệu')}
            >
              <Paperclip size={20} />
            </button>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Nhập tin nhắn nội bộ..."
            />
            <button
              type="button"
              onClick={() => notify('Chọn biểu tượng cảm xúc')}
            >
              <Smile size={21} />
            </button>
            <button onClick={handleSend} className="send-button" type="button">
              Gửi
            </button>
          </div>
        </main>

        {/* Cột 3: Thông tin nhóm & tệp đính kèm */}
        <aside className="chat-info">
          <h2>Thông tin nhóm</h2>
          <div className="chat-group-info">
            <div className="contact-avatar group">
              <Users size={25} />
            </div>
            <div>
              <strong>Nhóm Telesale</strong>
              <span>8 thành viên</span>
            </div>
          </div>

          <section>
            <div className="info-heading">
              <h3>Thành viên</h3>
              <button
                type="button"
                onClick={() => notify('Xem tất cả 8 thành viên')}
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
