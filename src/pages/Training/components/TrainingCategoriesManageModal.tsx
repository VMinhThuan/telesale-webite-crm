import React, { useEffect, useMemo } from 'react'
import {
  AlertCircle,
  FolderCog,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { TrainingMaterial } from '../../../types/training'

interface TrainingCategoriesManageModalProps {
  categories: string[]
  materials: TrainingMaterial[]
  onClose: () => void
  onRequestDeleteCategory: (categoryName: string) => void
}

export const TrainingCategoriesManageModal: React.FC<TrainingCategoriesManageModalProps> = ({
  categories,
  materials,
  onClose,
  onRequestDeleteCategory,
}) => {
  // Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Tính số lượng tài liệu theo từng danh mục
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>()
    categories.forEach((cat) => map.set(cat, 0))

    materials.forEach((mat) => {
      const count = map.get(mat.category) || 0
      map.set(mat.category, count + 1)
    })

    return map
  }, [categories, materials])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
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
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
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
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#eff6ff',
                display: 'grid',
                placeItems: 'center',
                color: '#2563eb',
              }}
            >
              <FolderCog size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                Quản lý danh mục đào tạo
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Danh sách các phân loại danh mục / Tab trên hệ thống
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung danh sách danh mục */}
        <div style={{ padding: '16px 22px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {categories.map((catName) => {
              const isDefault = catName === 'Tất cả'
              const docCount = categoryCounts.get(catName) || 0

              return (
                <div
                  key={catName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: isDefault ? '#f8fafc' : '#ffffff',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: isDefault ? '#1e293b' : '#334155',
                      }}
                    >
                      {catName}
                    </span>

                    {/* Badge số lượng tài liệu */}
                    {!isDefault && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: docCount > 0 ? '#eff6ff' : '#f1f5f9',
                          color: docCount > 0 ? '#1d4ed8' : '#64748b',
                        }}
                      >
                        {docCount} tài liệu
                      </span>
                    )}

                    {isDefault && (
                      <span
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: '#e2e8f0',
                          color: '#475569',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ShieldCheck size={12} /> Hệ thống
                      </span>
                    )}
                  </div>

                  {/* Hành động */}
                  <div>
                    {isDefault ? (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Không thể xóa
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestDeleteCategory(catName)}
                        title={`Xóa danh mục "${catName}"`}
                        style={{
                          height: '32px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: '1px solid #fee2e2',
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '12px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e11d48'
                          e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff1f2'
                          e.currentTarget.style.color = '#e11d48'
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Xóa</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ghi chú cảnh báo an toàn */}
          <div
            style={{
              marginTop: '16px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.45,
            }}
          >
            <AlertCircle size={16} style={{ color: '#0284c7', flexShrink: 0, marginTop: '1px' }} />
            <span>
              <strong>Lưu ý:</strong> Khi xóa một phân loại danh mục, toàn bộ tài liệu thuộc danh mục đó
              cũng sẽ được xóa vĩnh viễn để bảo đảm tính toàn vẹn dữ liệu.
            </span>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '36px',
              padding: '0 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingCategoriesManageModal
