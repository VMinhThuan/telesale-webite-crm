import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  FileText,
  FileVideo,
  Loader2,
  Plus,
  UploadCloud,
  X,
} from 'lucide-react'
import dayjs from '../../../lib/dayjs'
import { useUploadMaterialMutation } from '../../../hooks/useTraining'
import { R2_CONFIG } from '../../../services/trainingStorage.service'
import { notify } from '../../../utils/notify'

interface TrainingUploadModalProps {
  categories: string[]
  activeCategory?: string
  onClose: () => void
}

export const TrainingUploadModal: React.FC<TrainingUploadModalProps> = ({
  categories,
  activeCategory,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState(
    activeCategory && activeCategory !== 'Tất cả'
      ? activeCategory
      : categories.find((c) => c !== 'Tất cả') || 'Nghiệp vụ telesale',
  )
  const [publishedAt, setPublishedAt] = useState(() =>
    dayjs().format('YYYY-MM-DD'),
  )
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadMaterialMutation()

  const isConfigured = Boolean(
    R2_CONFIG.accountId && R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey,
  )

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    if (!title) {
      // Tự động gợi ý tiêu đề từ tên file
      const rawName = selectedFile.name.substring(
        0,
        selectedFile.name.lastIndexOf('.'),
      )
      setTitle(rawName.replace(/[_-]/g, ' '))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCategory = isAddingNewCategory
      ? newCategoryName.trim()
      : category.trim()

    if (!file) {
      notify('Vui lòng chọn một tệp tài liệu hoặc video để tải lên.')
      return
    }

    if (!title.trim()) {
      notify('Vui lòng nhập tiêu đề cho tài liệu.')
      return
    }

    if (!finalCategory) {
      notify('Vui lòng chọn hoặc nhập tên danh mục / Tab.')
      return
    }

    try {
      await uploadMutation.mutateAsync({
        file,
        title: title.trim(),
        desc: desc.trim() || 'Tài liệu hướng dẫn nội bộ.',
        category: finalCategory,
        publishedAt,
      })
      onClose()
    } catch {
      // Lỗi đã được xử lý trong onError của hook
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
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
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <UploadCloud size={20} />
            </div>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Tải lên tài liệu mới
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                Thêm tài liệu hoặc video hướng dẫn nội bộ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={uploadMutation.isPending}
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

        {/* Cảnh báo cấu hình nếu chưa có Key */}
        {!isConfigured && (
          <div
            style={{
              margin: '16px 20px 0',
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              gap: '10px',
              fontSize: '12px',
              color: '#991b1b',
              lineHeight: 1.5,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Lưu ý:</strong> Bạn cần điền đầy đủ các thông số trong file{' '}
              <code>.env</code> (<code>VITE_R2_ACCOUNT_ID</code>,{' '}
              <code>VITE_R2_ACCESS_KEY_ID</code>,{' '}
              <code>VITE_R2_SECRET_ACCESS_KEY</code>) để thực hiện tải tệp lên hệ thống.
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Khu vực kéo thả / chọn file */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              if (e.dataTransfer.files?.[0]) {
                handleFileSelect(e.dataTransfer.files[0])
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? '#2563eb' : '#cbd5e1'}`,
              borderRadius: '12px',
              padding: '24px 16px',
              textAlign: 'center',
              background: dragOver ? '#eff6ff' : '#f8fafc',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '16px',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.mp4,.webm,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0])
                }
              }}
            />

            {file ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: '#1e293b',
                }}
              >
                {file.type.includes('video') ? (
                  <FileVideo size={28} color="#2563eb" />
                ) : (
                  <FileText size={28} color="#059669" />
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{file.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <UploadCloud
                  size={32}
                  color="#64748b"
                  style={{ margin: '0 auto 8px' }}
                />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Kéo thả tệp vào đây hoặc{' '}
                  <span style={{ color: '#2563eb' }}>chọn từ máy tính</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  Hỗ trợ định dạng PDF, MP4, WebM (Dung lượng khuyến nghị &lt; 500MB)
                </div>
              </div>
            )}
          </div>

          {/* Tiêu đề tài liệu */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Tiêu đề tài liệu <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Kịch bản tư vấn thay lõi lọc nước tháng 10"
              required
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* Danh mục */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                }}
              >
                Phân loại danh mục / Tab:
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Plus size={12} />
                {isAddingNewCategory ? 'Chọn danh mục có sẵn' : 'Tạo Tab mới'}
              </button>
            </div>

            {isAddingNewCategory ? (
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nhập tên danh mục / Tab mới..."
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #3b82f6',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  padding: '0 12px',
                  fontSize: '13px',
                  outline: 'none',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                {categories
                  .filter((c) => c !== 'Tất cả')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Ngày phát hành */}
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Ngày phát hành
            </label>
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff',
              }}
            />
          </div>

          {/* Mô tả tóm tắt */}
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Mô tả ngắn
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung tài liệu để nhân viên dễ theo dõi..."
              rows={3}
              style={{
                width: '100%',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          {/* Footer nút bấm */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={uploadMutation.isPending}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !file}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: uploadMutation.isPending ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: uploadMutation.isPending || !file ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang tải lên...
                </>
              ) : (
                <>
                  <UploadCloud size={16} /> Bắt đầu tải lên
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TrainingUploadModal

