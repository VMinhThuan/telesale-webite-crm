import React, { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Eye,
  FileText,
  FileVideo,
  GraduationCap,
  Info,
  MessageCircle,
  MonitorPlay,
  Phone,
  Play,
  Search,
} from 'lucide-react'
import { DialogState, PageType, TrainingItem } from '../../types'
import { notify } from '../../utils/notify'

interface TrainingProps {
  onOpenDialog?: (dialog: DialogState) => void
  setPage?: (page: PageType) => void
}

const materials: TrainingItem[] = [
  { title: 'Quy trình telesale', desc: 'Các bước gọi, tư vấn và ghi nhận kết quả.', icon: FileText, meta: 'PDF · 12 trang', type: 'pdf', category: 'Nghiệp vụ telesale', tone: 'blue' },
  { title: 'Kịch bản tư vấn', desc: 'Bảo dưỡng, thay lõi và xử lý từ chối.', icon: FileText, meta: 'PDF · 8 trang', type: 'doc', category: 'Kịch bản tư vấn', tone: 'amber' },
  { title: 'Kiến thức máy lọc nước', desc: 'Cấu tạo máy và chức năng các lõi lọc.', icon: GraduationCap, meta: 'PDF · 15 trang', type: 'course', category: 'Kiến thức sản phẩm', tone: 'green' },
  { title: 'Quy trình hẹn đơn', desc: 'Chọn slot và xác nhận lịch với khách.', icon: CalendarDays, meta: 'PDF · 6 trang', type: 'calendar', category: 'Nghiệp vụ telesale', tone: 'rose' },
  { title: 'Kỹ năng chăm sóc khách hàng', desc: 'Cách khai thác nhu cầu và theo dõi khách.', icon: FileVideo, meta: 'Video · 08:30', type: 'video', category: 'Kịch bản tư vấn', tone: 'video' },
  { title: 'Hướng dẫn sử dụng hệ thống', desc: 'Dashboard, Telesale, CSKH và Đơn hàng.', icon: MonitorPlay, meta: 'Video · 06:45', type: 'video', category: 'Video hướng dẫn', tone: 'video' },
  { title: 'Video xử lý từ chối', desc: 'Thực hành các tình huống thường gặp khi tư vấn.', icon: FileVideo, meta: 'Video · 12:10', type: 'video', category: 'Video hướng dẫn', tone: 'video' },
]

const categories = ['Tất cả', 'Nghiệp vụ telesale', 'Kịch bản tư vấn', 'Kiến thức sản phẩm', 'Video hướng dẫn']

export const Training: React.FC<TrainingProps> = ({ onOpenDialog, setPage }) => {
  const [category, setCategory] = useState('Tất cả')
  const [query, setQuery] = useState('')

  const visibleMaterials = useMemo(() => {
    return materials.filter((item) => {
      const matchCat = category === 'Tất cả' || item.category === category
      const matchQuery = `${item.title} ${item.desc}`
        .toLocaleLowerCase('vi')
        .includes(query.toLocaleLowerCase('vi'))
      return matchCat && matchQuery
    })
  }, [category, query])

  const journey = useMemo(() => {
    switch (category) {
      case 'Kiến thức sản phẩm':
        return [
          { title: 'Nắm kiến thức sản phẩm', desc: 'Tìm hiểu cấu tạo máy và chức năng các lõi lọc.', icon: GraduationCap, tone: 'green' },
          { title: 'Ôn cấu tạo lõi lọc', desc: 'Xem lại các lõi lọc và thời hạn sử dụng.', icon: BookOpen, tone: 'blue' },
        ]
      case 'Video hướng dẫn':
        return [
          { title: 'Xem hướng dẫn hệ thống', desc: 'Làm quen Dashboard, Telesale và CSKH.', icon: MonitorPlay, tone: 'blue' },
          { title: 'Luyện xử lý từ chối', desc: 'Thực hành cách phản hồi khách hàng.', icon: FileVideo, tone: 'amber' },
        ]
      case 'Kịch bản tư vấn':
        return [
          { title: 'Luyện kịch bản tư vấn', desc: 'Thực hành các tình huống tư vấn và xử lý từ chối.', icon: FileText, tone: 'amber' },
          { title: 'Kỹ năng chăm sóc khách', desc: 'Khai thác nhu cầu và theo dõi khách.', icon: Phone, tone: 'green' },
        ]
      default:
        return [
          { title: 'Đọc quy trình telesale', desc: 'Hiểu các bước gọi, tư vấn và ghi nhận kết quả.', icon: FileText, tone: 'blue' },
          { title: 'Thực hành hẹn đơn', desc: 'Chọn slot và xác nhận lịch với khách.', icon: CalendarDays, tone: 'rose' },
        ]
    }
  }, [category])

  const handleOpenMaterial = (item: TrainingItem) => {
    if (onOpenDialog) {
      onOpenDialog({
        title: item.title,
        type: item.tone === 'video' ? 'video' : 'document',
      })
    } else {
      notify(`Đang mở: ${item.title}`)
    }
  }

  return (
    <div className="content training-content">
      <div className="page-title training-title">
        <div>
          <p>Kiến thức và hướng dẫn dành cho nhân viên telesale</p>
          <h1>Tài liệu đào tạo</h1>
        </div>
        <label className="training-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tài liệu, video, kịch bản..."
          />
        </label>
      </div>

      <div className="training-tabs">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            className={category === item ? 'active' : ''}
            onClick={() => {
              setCategory(item)
              notify(`Đã lọc danh mục: ${item}`)
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="training-grid">
        <div className="material-column">
          <section className="call-panel materials-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">THƯ VIỆN</p>
                <h2>{category === 'Tất cả' ? 'Tài liệu dành cho bạn' : category}</h2>
              </div>
              <span className="materials-count">
                {visibleMaterials.length.toString().padStart(2, '0')} tài liệu
              </span>
            </div>

            <div className="materials-list">
              {visibleMaterials.length > 0 ? (
                visibleMaterials.map((item) => {
                  const Icon = item.icon
                  return (
                    <article className="material-card" key={item.title}>
                      <div className={`material-icon ${item.tone}`}>
                        <Icon size={35} />
                      </div>
                      <div className="material-copy">
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                        <div>
                          <span>
                            <FileText size={14} />
                            {item.meta}
                          </span>
                          <button onClick={() => handleOpenMaterial(item)} type="button">
                            {item.tone === 'video' ? <Play size={14} /> : <Eye size={15} />}{' '}
                            {item.tone === 'video' ? 'Xem video' : 'Xem tài liệu'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="empty-materials">Không tìm thấy tài liệu phù hợp.</div>
              )}
            </div>
          </section>

          <div className="training-tip">
            <Info size={21} />
            <div>
              <strong>Lưu ý nghiệp vụ</strong>
              <ul>
                <li>Kiểm tra slot trống trước khi xác nhận lịch hẹn.</li>
                <li>Ghi nhận đầy đủ nội dung sau mỗi cuộc gọi.</li>
              </ul>
            </div>
          </div>
        </div>

        <aside className="training-side">
          <section className="call-panel getting-started">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">LỘ TRÌNH</p>
                <h2>{category === 'Tất cả' ? 'Bắt đầu tại đây' : `Lộ trình · ${category}`}</h2>
              </div>
            </div>
            {journey.map((step, i) => {
              const Icon = step.icon
              return (
                <button
                  className="journey-step"
                  key={step.title}
                  type="button"
                  onClick={() => notify(`Bắt đầu bước ${i + 1}: ${step.title}`)}
                >
                  <b className={step.tone}>{i + 1}</b>
                  <span className={`journey-icon ${step.tone}`}>
                    <Icon size={19} />
                  </span>
                  <span>
                    <strong>{step.title}</strong>
                    <small>{step.desc}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              )
            })}
          </section>

          <section className="call-panel updated-materials">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">MỚI CẬP NHẬT</p>
                <h2>Tài liệu mới cập nhật</h2>
              </div>
              <button
                className="see-all"
                type="button"
                onClick={() => notify('Xem tất cả tài liệu cập nhật')}
              >
                Xem tất cả <ArrowRight size={13} />
              </button>
            </div>
            {visibleMaterials.slice(0, 3).map((item, index) => {
              const Icon = item.icon
              return (
                <div className="updated-row" key={item.title}>
                  <Icon size={16} />
                  <span>{item.title}</span>
                  <time>{`${String(4 - index).padStart(2, '0')}/10/2026`}</time>
                </div>
              )
            })}
          </section>

          <section className="training-help">
            <MessageCircle size={21} />
            <div>
              <strong>Cần hỗ trợ?</strong>
              <span>Trao đổi với quản lý hoặc nhóm nội bộ.</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (setPage) setPage('chat')
                notify('Đã chuyển sang Chat nội bộ')
              }}
            >
              <MessageCircle size={16} /> Mở Chat
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
