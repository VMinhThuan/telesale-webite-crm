import React, { useState } from 'react'
import { Edit3, Loader2, Plus, X } from 'lucide-react'
import dayjs from '../../../lib/dayjs'
import { TrainingMaterial } from '../../../types/training'
import { useUpdateMaterialMutation } from '../../../hooks/useTraining'
import { notify } from '../../../utils/notify'

interface TrainingEditModalProps {
  material: TrainingMaterial
  categories: string[]
  onClose: () => void
}

export const TrainingEditModal: React.FC<TrainingEditModalProps> = ({
  material,
  categories,
  onClose,
}) => {
  const [title, setTitle] = useState(material.title)
  const [desc, setDesc] = useState(material.desc)
  const [category, setCategory] = useState(material.category)
  const [publishedAt, setPublishedAt] = useState(
    material.publishedAt || material.updatedAt || dayjs().format('YYYY-MM-DD'),
  )
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const updateMutation = useUpdateMaterialMutation()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCategory = isAddingNewCategory
      ? newCategoryName.trim()
      : category.trim()

    if (!title.trim()) {
      notify('Vui lòng nhập tiêu đề tài liệu.')
      return
    }

    if (!finalCategory) {
      notify('Vui lòng chọn hoặc nhập tên danh mục / tab.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: material.id,
        payload: {
          title: title.trim(),
          desc: desc.trim(),
          category: finalCategory,
          publishedAt,
        },
      })
      onClose()
    } catch {
      // Lỗi đã được xử lý trong onError của mutation
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
          maxWidth: '520px',
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
                background: '#fef3c7',
                color: '#d97706',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Edit3 size={18} />
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
                Chỉnh sửa tài liệu
              </h3>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#64748b',
                }}
              >
                Cập nhật thông tin và chuyển danh mục / Tab
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            disabled={updateMutation.isPending}
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

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          {/* Tiêu đề */}
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
              Tiêu đề bài học <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          {/* Phân loại Danh mục / Tab */}
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
                Thuộc danh mục / Tab:
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

          {/* Mô tả */}
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
              Mô tả tóm tắt
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
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
              disabled={updateMutation.isPending}
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
              disabled={updateMutation.isPending}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: updateMutation.isPending ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TrainingEditModal

