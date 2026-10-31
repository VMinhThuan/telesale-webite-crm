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
  Loader2,
  MonitorPlay,
  Phone,
  Play,
  Pencil,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { DialogState, PageType } from '../../types'
import { TrainingMaterial } from '../../types/training'
import {
  useDeleteMaterialMutation,
  useTrainingManifest,
} from '../../hooks/useTraining'
import { notify } from '../../utils/notify'
import { formatDate } from '../../utils/formatters'
import { TrainingUploadModal } from './components/TrainingUploadModal'
import { TrainingViewerModal } from './components/TrainingViewerModal'
import { TrainingEditModal } from './components/TrainingEditModal'

interface TrainingProps {
  onOpenDialog?: (dialog: DialogState) => void
  setPage?: (page: PageType) => void
}

const getMaterialIcon = (type: string, tone?: string) => {
  if (type === 'video' || tone === 'video') return FileVideo
  if (tone === 'green') return GraduationCap
  if (tone === 'rose') return CalendarDays
  return FileText
}

export const Training: React.FC<TrainingProps> = ({ setPage: _setPage }) => {
  const [category, setCategory] = useState('Tất cả')
  const [query, setQuery] = useState('')

  // State quản lý Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [viewerMaterial, setViewerMaterial] = useState<TrainingMaterial | null>(null)
  const [editingMaterial, setEditingMaterial] = useState<TrainingMaterial | null>(null)

  // Truy vấn danh mục và tài liệu từ Cloudflare R2
  const { data: manifest, isLoading } = useTrainingManifest()
  const deleteMutation = useDeleteMaterialMutation()

  const categories = useMemo(
    () =>
      manifest?.categories || [
        'Tất cả',
        'Nghiệp vụ telesale',
        'Kịch bản tư vấn',
        'Kiến thức sản phẩm',
        'Video hướng dẫn',
      ],
    [manifest?.categories],
  )

  const materialsList = useMemo(
    () => manifest?.materials || [],
    [manifest?.materials],
  )

  const visibleMaterials = useMemo(() => {
    return materialsList.filter((item) => {
      const matchCat = category === 'Tất cả' || item.category === category
      const matchQuery = `${item.title} ${item.desc}`
        .toLocaleLowerCase('vi')
        .includes(query.toLocaleLowerCase('vi'))
      return matchCat && matchQuery
    })
  }, [materialsList, category, query])

  const journey = useMemo(() => {
    if (manifest?.journeys && manifest.journeys[category]) {
      return manifest.journeys[category].map((step) => ({
        ...step,
        icon: step.tone === 'green' ? GraduationCap : step.tone === 'amber' ? FileText : BookOpen,
      }))
    }

    switch (category) {
      case 'Kiến thức sản phẩm':
        return [
          {
            title: 'Nắm kiến thức sản phẩm',
            desc: 'Tìm hiểu cấu tạo máy và chức năng các lõi lọc.',
            icon: GraduationCap,
            tone: 'green',
          },
          {
            title: 'Ôn cấu tạo lõi lọc',
            desc: 'Xem lại các lõi lọc và thời hạn sử dụng.',
            icon: BookOpen,
            tone: 'blue',
          },
        ]
      case 'Video hướng dẫn':
        return [
          {
            title: 'Xem hướng dẫn hệ thống',
            desc: 'Làm quen Dashboard, Telesale và CSKH.',
            icon: MonitorPlay,
            tone: 'blue',
          },
          {
            title: 'Luyện xử lý từ chối',
            desc: 'Thực hành cách phản hồi khách hàng.',
            icon: FileVideo,
            tone: 'amber',
          },
        ]
      case 'Kịch bản tư vấn':
        return [
          {
            title: 'Luyện kịch bản tư vấn',
            desc: 'Thực hành các tình huống tư vấn và xử lý từ chối.',
            icon: FileText,
            tone: 'amber',
          },
          {
            title: 'Kỹ năng chăm sóc khách',
            desc: 'Khai thác nhu cầu và theo dõi khách.',
            icon: Phone,
            tone: 'green',
          },
        ]
      default:
        return [
          {
            title: 'Đọc quy trình telesale',
            desc: 'Hiểu các bước gọi, tư vấn và ghi nhận kết quả.',
            icon: FileText,
            tone: 'blue',
          },
          {
            title: 'Thực hành hẹn đơn',
            desc: 'Chọn slot và xác nhận lịch với khách.',
            icon: CalendarDays,
            tone: 'rose',
          },
        ]
    }
  }, [category, manifest])

  const handleOpenMaterial = (item: TrainingMaterial) => {
    setViewerMaterial(item)
  }

  const handleDeleteMaterial = async (
    e: React.MouseEvent,
    item: TrainingMaterial,
  ) => {
    e.stopPropagation()
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài liệu "${item.title}"?`,
    )
    if (confirmed) {
      await deleteMutation.mutateAsync({ id: item.id, fileKey: item.fileKey })
    }
  }

  return (
    <div className="content training-content">
      {/* Tiêu đề trang & Nút tải lên R2 */}
      <div className="page-title training-title">
        <div>
          <h2>Kiến thức và hướng dẫn dành cho nhân viên telesale</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label className="training-search" style={{ margin: 0 }}>
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tài liệu, video, kịch bản..."
            />
          </label>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <UploadCloud size={16} /> Tải tài liệu lên
          </button>
        </div>
      </div>

      {/* Tabs danh mục */}
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

      {/* Grid nội dung */}
      <div className="training-grid">
        <div className="material-column">
          <section className="call-panel materials-panel">
            <div className="call-panel-heading">
              <div>
                <p className="eyebrow">THƯ VIỆN ĐÀO TẠO</p>
              </div>
              <span className="materials-count">
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  `${visibleMaterials.length.toString().padStart(2, '0')} tài liệu`
                )}
              </span>
            </div>

            <div className="materials-list">
              {isLoading ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  <Loader2
                    size={28}
                    className="animate-spin"
                    style={{ margin: '0 auto 12px', color: '#3b82f6' }}
                  />
                  Đang đồng bộ tài liệu...
                </div>
              ) : visibleMaterials.length > 0 ? (
                visibleMaterials.map((item) => {
                  const Icon = getMaterialIcon(item.type, item.tone)
                  return (
                    <article className="material-card" key={item.id || item.title}>
                      <div className={`material-icon ${item.tone || 'blue'}`}>
                        <Icon size={35} />
                      </div>
                      <div className="material-copy">
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                          }}
                        >
                          <h3>{item.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Nút chỉnh sửa tài liệu */}
                            <button
                              type="button"
                              title="Chỉnh sửa tài liệu"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingMaterial(item)
                              }}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color = '#3b82f6')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = '#94a3b8')
                              }
                            >
                              <Pencil size={15} />
                            </button>
                            {/* Nút xóa tài liệu */}
                            <button
                              type="button"
                              title="Xóa tài liệu"
                              onClick={(e) => handleDeleteMaterial(e, item)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.color = '#ef4444')
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.color = '#94a3b8')
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <p>{item.desc}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                            <span>
                              {item.type === 'video' ? (
                                <FileVideo size={14} />
                              ) : (
                                <FileText size={14} />
                              )}
                              {item.meta}
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#64748b',
                                fontSize: '12px',
                              }}
                            >
                              <CalendarDays size={13} />
                              {formatDate(item.publishedAt || item.updatedAt)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenMaterial(item)}
                            type="button"
                          >
                            {item.type === 'video' ? (
                              <Play size={14} />
                            ) : (
                              <Eye size={15} />
                            )}{' '}
                            {item.type === 'video' ? 'Xem video' : 'Xem tài liệu'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              ) : (
                <div className="empty-materials">
                  Không tìm thấy tài liệu phù hợp trong danh mục này.
                </div>
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

        {/* Cột Lộ trình học & Mới cập nhật */}
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
                onClick={() => notify('Đang hiển thị các tài liệu mới nhất')}
              >
                Xem tất cả <ArrowRight size={13} />
              </button>
            </div>
            {visibleMaterials.length > 0 ? (
              visibleMaterials.slice(0, 3).map((item) => {
                const Icon = getMaterialIcon(item.type, item.tone)
                return (
                  <div
                    className="updated-row"
                    key={item.id || item.title}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleOpenMaterial(item)}
                  >
                    <Icon size={16} />
                    <span>{item.title}</span>
                    <time>{formatDate(item.publishedAt || item.updatedAt)}</time>
                  </div>
                )
              })
            ) : (
              <div style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '13px' }}>
                Chưa có tài liệu nào
              </div>
            )}
          </section>


        </aside>
      </div>

      {/* Modal Tải tài liệu lên */}
      {isUploadOpen && (
        <TrainingUploadModal
          categories={categories}
          activeCategory={category}
          onClose={() => setIsUploadOpen(false)}
        />
      )}

      {/* Modal Chỉnh sửa thông tin tài liệu */}
      {editingMaterial && (
        <TrainingEditModal
          material={editingMaterial}
          categories={categories}
          onClose={() => setEditingMaterial(null)}
        />
      )}

      {/* Modal Xem Video / Đọc PDF tài liệu thực tế từ R2 */}
      {viewerMaterial && (
        <TrainingViewerModal
          material={viewerMaterial}
          onClose={() => setViewerMaterial(null)}
        />
      )}
    </div>
  )
}

export default Training
