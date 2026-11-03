import React, { useRef, useState } from 'react'
import {
  Clock,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { BannerConfig } from '../../types/telesaleConfig'
import {
  useDeleteBannerMutation,
  useTelesaleConfig,
  useUpdateBannerSettingsMutation,
  useUploadBannerMutation,
} from '../../hooks/useTelesaleConfig'
import { notify } from '../../utils/notify'

interface SidebarBannerModalProps {
  bannerConfig: BannerConfig
  onClose: () => void
}

export const SidebarBannerModal: React.FC<SidebarBannerModalProps> = ({
  bannerConfig: initialConfig,
  onClose,
}) => {
  const { data: liveConfig } = useTelesaleConfig()
  const bannerConfig = liveConfig?.banners || initialConfig
  const [activeTab, setActiveTab] = useState<'upload' | 'list' | 'settings'>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  // Settings
  const [intervalSec, setIntervalSec] = useState(bannerConfig.intervalSeconds || 5)
  const [autoPlay, setAutoPlay] = useState(bannerConfig.autoPlay !== false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadBannerMutation()
  const deleteMutation = useDeleteBannerMutation()
  const updateSettingsMutation = useUpdateBannerSettingsMutation()

  const handleFileChange = (file: File) => {
    setSelectedFile(file)
    if (!title) {
      const cleanName = file.name.substring(0, file.name.lastIndexOf('.'))
      setTitle(cleanName.replace(/[_-]/g, ' '))
    }
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      notify('Vui lòng chọn hình ảnh để tải lên.')
      return
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        title,
        linkUrl,
      })
      setSelectedFile(null)
      setPreviewUrl(null)
      setTitle('')
      setLinkUrl('')
      setActiveTab('list')
    } catch {
      // error handled in mutation
    }
  }

  const handleSaveSettings = async () => {
    try {
      await updateSettingsMutation.mutateAsync({
        intervalSeconds: Math.max(2, Math.min(60, Number(intervalSec) || 5)),
        autoPlay,
      })
    } catch {
      // error handled in mutation
    }
  }

  const handleDeleteBanner = async (id: string, bannerTitle: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa banner "${bannerTitle}"?`)) {
      await deleteMutation.mutateAsync(id)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '820px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              Quản lý Banner Sidebar
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              Upload nhiều ảnh và tùy chỉnh thời gian trình chiếu trên thanh điều hướng
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#e2e8f0',
              color: '#475569',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            padding: '0 28px',
            background: '#ffffff',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            style={{
              padding: '12px 14px',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'upload' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'upload' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UploadCloud size={16} /> Tải ảnh mới
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              padding: '12px 14px',
              border: 'none',
              borderBottom: activeTab === 'list' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'list' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'list' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ImageIcon size={16} /> Danh sách ({bannerConfig.items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 14px',
              border: 'none',
              borderBottom: activeTab === 'settings' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === 'settings' ? '#2563eb' : '#64748b',
              fontWeight: activeTab === 'settings' ? 600 : 500,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={16} /> Cài đặt hiển thị
          </button>
        </div>

        {/* Content body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && (
            <form onSubmit={handleUploadSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFileChange(f)
                  }}
                />

                {previewUrl ? (
                  <div>
                    <img
                      src={previewUrl}
                      alt="Xem trước banner"
                      style={{
                        maxHeight: '160px',
                        maxWidth: '100%',
                        borderRadius: '8px',
                        objectFit: 'contain',
                        margin: '0 auto 10px',
                        display: 'block',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>
                      Nhấn để đổi ảnh khác
                    </span>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#2563eb',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 10px',
                      }}
                    >
                      <UploadCloud size={24} />
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      Kéo thả ảnh vào đây hoặc click để chọn tệp
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                      Khuyến nghị ảnh tỉ lệ 16:9 hoặc 4:3 (JPG, PNG, WebP)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Tiêu đề banner (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Chiến dịch thi đua Telesale Tháng 11"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Liên kết khi click vào (URL - tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="https://... hoặc để trống"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || uploadMutation.isPending}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: uploadMutation.isPending ? '#93c5fd' : '#2563eb',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: selectedFile && !uploadMutation.isPending ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang tải ảnh lên...
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Tải ảnh lên
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIST */}
          {activeTab === 'list' && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {bannerConfig.items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                  <ImageIcon size={32} style={{ margin: '0 auto 8px', color: '#cbd5e1' }} />
                  <p style={{ margin: 0, fontSize: '13px' }}>Chưa có banner nào được tải lên.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    style={{
                      marginTop: '12px',
                      padding: '8px 14px',
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    + Tải ảnh đầu tiên
                  </button>
                </div>
              ) : (
                bannerConfig.items.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#475569',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      style={{
                        width: '70px',
                        height: '42px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong
                        style={{
                          fontSize: '13px',
                          color: '#1e293b',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </strong>
                      {item.linkUrl && (
                        <small
                          style={{
                            fontSize: '11px',
                            color: '#2563eb',
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.linkUrl}
                        </small>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Xóa banner"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDeleteBanner(item.id, item.title)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        background: '#fee2e2',
                        color: '#ef4444',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '8px',
                  }}
                >
                  Thời gian chuyển ảnh (giây): <strong>{intervalSec} giây</strong>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <input
                    type="range"
                    min={2}
                    max={20}
                    step={1}
                    value={intervalSec}
                    onChange={(e) => setIntervalSec(Number(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <input
                    type="number"
                    min={2}
                    max={60}
                    value={intervalSec}
                    onChange={(e) => setIntervalSec(Number(e.target.value))}
                    style={{
                      width: '64px',
                      padding: '6px 8px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  />
                </div>
                <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                  Khoảng thời gian mỗi banner xuất hiện trước khi tự động lướt sang ảnh tiếp theo.
                </small>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="autoPlayCheck"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <label
                  htmlFor="autoPlayCheck"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
                >
                  Tự động chuyển ảnh (Auto-play carousel)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#2563eb',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang lưu...
                    </>
                  ) : (
                    'Lưu cài đặt'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default SidebarBannerModal

