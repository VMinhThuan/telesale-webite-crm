import React, { useState } from 'react'
import {
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { TelesaleScript } from '../../../types/telesaleConfig'
import {
  useDeleteScriptMutation,
  useSaveScriptMutation,
} from '../../../hooks/useTelesaleConfig'
import { notify } from '../../../utils/notify'

interface TelesaleScriptEditModalProps {
  scripts: TelesaleScript[]
  activeScriptId: string
  onSelectScript: (id: string) => void
  onClose: () => void
}

export const TelesaleScriptEditModal: React.FC<TelesaleScriptEditModalProps> = ({
  scripts,
  activeScriptId,
  onSelectScript,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(activeScriptId || scripts[0]?.id || '')
  const currentScript = scripts.find((s) => s.id === selectedId) || scripts[0]

  const [name, setName] = useState(currentScript?.name || '')
  const [title, setTitle] = useState(currentScript?.title || '')
  const [steps, setSteps] = useState<string[]>(
    currentScript?.steps && currentScript.steps.length > 0
      ? currentScript.steps
      : [''],
  )

  const saveScriptMutation = useSaveScriptMutation()
  const deleteScriptMutation = useDeleteScriptMutation()

  // Khi người dùng chuyển sang kịch bản khác trong modal
  const handleSelectScriptToEdit = (script: TelesaleScript) => {
    setSelectedId(script.id)
    setName(script.name)
    setTitle(script.title)
    setSteps(script.steps?.length ? script.steps : [''])
  }

  // Tạo kịch bản mới
  const handleCreateNew = () => {
    const newId = `script-${Date.now()}`
    setSelectedId(newId)
    setName('Kịch bản mới')
    setTitle('Tiêu đề kịch bản tư vấn')
    setSteps([
      'Em chào anh/chị, em là tư vấn viên từ Lọc Nước 365...',
      'Dạ anh/chị cho em hỏi...',
    ])
  }

  // Cập nhật câu thoại theo index
  const handleStepChange = (index: number, val: string) => {
    const newSteps = [...steps]
    newSteps[index] = val
    setSteps(newSteps)
  }

  // Thêm câu thoại
  const handleAddStep = () => {
    setSteps([...steps, ''])
  }

  // Xóa câu thoại
  const handleRemoveStep = (index: number) => {
    if (steps.length <= 1) {
      notify('Kịch bản cần ít nhất 1 câu thoại.')
      return
    }
    const newSteps = steps.filter((_, i) => i !== index)
    setSteps(newSteps)
  }

  // Lưu kịch bản
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanName = name.trim()
    const cleanTitle = title.trim()
    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean)

    if (!cleanName || !cleanTitle) {
      notify('Vui lòng nhập tên và tiêu đề kịch bản.')
      return
    }

    if (cleanSteps.length === 0) {
      notify('Vui lòng nhập ít nhất 1 câu thoại cho kịch bản.')
      return
    }

    try {
      const payload: TelesaleScript = {
        id: selectedId || `script-${Date.now()}`,
        name: cleanName,
        title: cleanTitle,
        steps: cleanSteps,
      }

      await saveScriptMutation.mutateAsync(payload)
      onSelectScript(payload.id)
      onClose()
    } catch {
      // error handled in mutation
    }
  }

  // Xóa kịch bản hiện tại
  const handleDeleteCurrentScript = async () => {
    if (scripts.length <= 1) {
      notify('Hệ thống cần duy trì ít nhất 1 kịch bản.')
      return
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa kịch bản "${currentScript?.name}"?`)) {
      try {
        await deleteScriptMutation.mutateAsync(selectedId)
        const remaining = scripts.filter((s) => s.id !== selectedId)
        if (remaining.length > 0) {
          handleSelectScriptToEdit(remaining[0])
          onSelectScript(remaining[0].id)
        }
      } catch {
        // error handled in mutation
      }
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
          maxWidth: '960px',
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
              Chỉnh sửa Kịch bản tư vấn Telesale
            </h3>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: '13px',
                color: '#64748b',
              }}
            >
              Nội dung kịch bản được lưu trữ và tự động đồng bộ ngay cho toàn bộ nhân viên tư vấn
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

        {/* Danh sách các kịch bản (Tabs ngang) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 28px',
            background: '#f1f5f9',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
          }}
        >
          {scripts.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScriptToEdit(sc)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: sc.id === selectedId ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: sc.id === selectedId ? '#2563eb' : '#ffffff',
                color: sc.id === selectedId ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {sc.name}
            </button>
          ))}
          <button
            type="button"
            onClick={handleCreateNew}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px dashed #2563eb',
              background: '#eff6ff',
              color: '#2563eb',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} /> Tạo kịch bản mới
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
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
                Tên kịch bản (Hiển thị ở Dropdown) *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Bảo dưỡng / Thay lõi"
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
                Tiêu đề kịch bản *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Tư vấn máy lọc nước"
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
          </div>

          {/* Danh sách các câu thoại */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                Các câu thoại tư vấn (Theo thứ tự 1, 2, 3...) *
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Thêm câu thoại
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: '#eff6ff',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '12px',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Câu thoại số ${idx + 1}...`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    title="Xóa câu này"
                    onClick={() => handleRemoveStep(idx)}
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
                      flexShrink: 0,
                      marginTop: '6px',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            {scripts.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteCurrentScript}
                disabled={deleteScriptMutation.isPending}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={15} /> Xóa kịch bản này
              </button>
            )}

            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
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
                Hủy
              </button>
              <button
                type="submit"
                disabled={saveScriptMutation.isPending}
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
                {saveScriptMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang lưu kịch bản...
                  </>
                ) : (
                  'Lưu kịch bản'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
export default TelesaleScriptEditModal

