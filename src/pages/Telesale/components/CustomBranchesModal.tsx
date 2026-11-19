import React, { useState, useMemo, useEffect } from 'react'
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Edit2,
  Loader2,
  Plus,
  Power,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react'
import { CampaignDto, ErpSource } from '../../../types/api'
import { CustomBranchItem } from '../../../types/customBranchConfig'
import {
  useCustomBranchConfig,
  useSaveCustomBranchConfigMutation,
} from '../../../hooks/useCustomBranchConfig'
import { validateBranchIdDuplicate } from '../../../utils/customBranchValidator'
import { notify } from '../../../utils/notify'

interface CustomBranchesModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: CampaignDto[]
}

export const CustomBranchesModal: React.FC<CustomBranchesModalProps> = ({
  isOpen,
  onClose,
  campaigns = [],
}) => {
  const { data: config, isLoading: isLoadingConfig, refetch } = useCustomBranchConfig()
  const saveMutation = useSaveCustomBranchConfigMutation()

  // Danh sách các chi nhánh bổ sung hiện có
  const [branchesList, setBranchesList] = useState<CustomBranchItem[]>([])

  // Đồng bộ state cục bộ khi cấu hình từ hệ thống tải xong
  useEffect(() => {
    if (config?.branches) {
      setBranchesList(config.branches)
    }
  }, [config])

  // Lọc theo nguồn ERP trên bảng
  const [selectedErpFilter, setSelectedErpFilter] = useState<'all' | ErpSource>('all')

  // Trạng thái mở form thêm/sửa
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form states theo cấu trúc tương đồng với Campaign API trả về
  const [inputBranchId, setInputBranchId] = useState<string>('')
  const [inputCampaignName, setInputCampaignName] = useState<string>('')
  const [inputBranchName, setInputBranchName] = useState<string>('')
  const [inputCampaignId, setInputCampaignId] = useState<string>('')
  const [inputSourceErp, setInputSourceErp] = useState<ErpSource>('locnuoc365')
  const [inputIsActive, setInputIsActive] = useState<boolean>(true)

  // Đếm xem danh sách có thay đổi so với cấu hình trên máy chủ không
  const hasChanges = useMemo(() => {
    const original = config?.branches || []
    return JSON.stringify(original) !== JSON.stringify(branchesList)
  }, [config, branchesList])

  // Reset form
  const resetForm = () => {
    setEditingId(null)
    setInputBranchId('')
    setInputCampaignName('')
    setInputBranchName('')
    setInputCampaignId('')
    setInputSourceErp('locnuoc365')
    setInputIsActive(true)
    setIsFormOpen(false)
  }

  // Mở form thêm mới
  const handleOpenAdd = () => {
    resetForm()
    setIsFormOpen(true)
  }

  // Mở form sửa
  const handleOpenEdit = (item: CustomBranchItem) => {
    setEditingId(item.id)
    setInputBranchId(String(item.branch_id))
    setInputCampaignName(item.name || item.branch_name || '')
    setInputBranchName(item.branch_name || '')
    setInputCampaignId(item.campaign_id ? String(item.campaign_id) : '')
    setInputSourceErp(item.source_erp)
    setInputIsActive(item.is_active)
    setIsFormOpen(true)
  }

  // Kiểm tra tính hợp lệ và trùng lặp thời gian thực
  const validationResult = useMemo(() => {
    if (!isFormOpen || !inputBranchId.trim()) {
      return { isValid: false, errorMessage: undefined }
    }

    return validateBranchIdDuplicate({
      inputBranchId,
      inputSourceErp,
      campaigns,
      existingCustomBranches: branchesList,
      currentEditingId: editingId || undefined,
    })
  }, [isFormOpen, inputBranchId, inputSourceErp, campaigns, branchesList, editingId])

  // Kiểm tra điều kiện có thể lưu form
  const isFormValid =
    validationResult.isValid &&
    inputCampaignName.trim().length > 0 &&
    inputBranchName.trim().length > 0

  // Xác nhận thêm/sửa vào danh sách
  const handleConfirmForm = () => {
    const trimmedCampaignName = inputCampaignName.trim()
    const trimmedBranchName = inputBranchName.trim()

    if (!trimmedCampaignName) {
      notify('Vui lòng nhập tên chiến dịch (name) hiển thị trên thanh chọn.', { type: 'warning' })
      return
    }

    if (!trimmedBranchName) {
      notify('Vui lòng nhập tên chi nhánh (branch_name) hiển thị ở lịch hẹn và đơn hàng.', {
        type: 'warning',
      })
      return
    }

    const check = validateBranchIdDuplicate({
      inputBranchId,
      inputSourceErp,
      campaigns,
      existingCustomBranches: branchesList,
      currentEditingId: editingId || undefined,
    })

    if (!check.isValid) {
      notify(check.errorMessage || 'Mã chi nhánh không hợp lệ hoặc bị trùng.', {
        type: 'warning',
      })
      return
    }

    const numericBranchId = Number(inputBranchId)
    const numericCampaignId = inputCampaignId.trim()
      ? Number(inputCampaignId.trim())
      : numericBranchId

    if (editingId) {
      // Chỉnh sửa chi nhánh đã có
      setBranchesList((prev) =>
        prev.map((b) =>
          b.id === editingId
            ? {
              ...b,
              campaign_id: numericCampaignId,
              name: trimmedCampaignName,
              branch_id: numericBranchId,
              branch_name: trimmedBranchName,
              source_erp: inputSourceErp,
              is_active: inputIsActive,
              updatedAt: new Date().toISOString(),
            }
            : b,
        ),
      )
      notify(`Đã cập nhật chi nhánh #${numericBranchId} (${trimmedBranchName})`, { type: 'info' })
    } else {
      // Thêm mới chi nhánh vào danh sách
      const newItem: CustomBranchItem = {
        id: `custom-branch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        campaign_id: numericCampaignId,
        name: trimmedCampaignName,
        branch_id: numericBranchId,
        branch_name: trimmedBranchName,
        source_erp: inputSourceErp,
        is_active: inputIsActive,
        updatedAt: new Date().toISOString(),
      }
      setBranchesList((prev) => [...prev, newItem])
      notify(`Đã thêm chi nhánh #${numericBranchId} (${trimmedBranchName}) vào danh sách`, {
        type: 'info',
      })
    }

    resetForm()
  }

  // Xóa chi nhánh
  const handleDeleteBranch = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa chi nhánh "${name}" khỏi danh sách bổ sung?`)) {
      setBranchesList((prev) => prev.filter((b) => b.id !== id))
      if (editingId === id) {
        resetForm()
      }
      notify(`Đã xóa chi nhánh "${name}". Vui lòng bấm "Lưu cấu hình" để hoàn tất.`, {
        type: 'info',
      })
    }
  }

  // Bật/tắt trạng thái hiển thị nhanh
  const handleToggleActive = (id: string) => {
    setBranchesList((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b)),
    )
  }

  // Lưu toàn bộ cấu hình vào máy chủ hệ thống
  const handleSaveConfig = async () => {
    try {
      await saveMutation.mutateAsync({
        version: config?.version || '1.0',
        updatedAt: new Date().toISOString(),
        branches: branchesList,
      })
    } catch {
      // Error handled in mutation
    }
  }

  // Danh sách sau khi lọc
  const filteredBranches = useMemo(() => {
    if (selectedErpFilter === 'all') return branchesList
    return branchesList.filter((b) => b.source_erp === selectedErpFilter)
  }, [branchesList, selectedErpFilter])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saveMutation.isPending) {
          onClose()
        }
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '96%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header rộng rãi & hiện đại */}
        <div
          style={{
            padding: '22px 32px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #fdf4ff 0%, #ffffff 60%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#f3e8ff',
                color: '#7e22ce',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 2px 6px rgba(126, 34, 206, 0.15)',
              }}
            >
              <Building2 size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>
                  Quản lý Chi nhánh Bổ sung
                </h2>
                <span
                  style={{
                    background: '#7e22ce',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '12px',
                    letterSpacing: '0.5px',
                  }}
                >
                  ADMIN
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Bổ sung các chi nhánh ERP chưa nằm trong danh sách chiến dịch để đồng bộ hiển thị và nạp lịch hẹn đặt đơn.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoadingConfig}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Làm mới dữ liệu từ hệ thống"
            >
              <RotateCw size={17} className={isLoadingConfig ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                display: 'grid',
                placeItems: 'center',
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Đóng cửa sổ"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body mở rộng */}
        <div
          style={{
            padding: '24px 32px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Thanh công cụ: Lọc theo nguồn ERP & Nút Thêm mới */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Bộ lọc nguồn */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                Nguồn hệ thống:
              </span>
              <button
                type="button"
                onClick={() => setSelectedErpFilter('all')}
                style={{
                  padding: '7px 15px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: selectedErpFilter === 'all' ? '#2563eb' : '#cbd5e1',
                  background: selectedErpFilter === 'all' ? '#eff6ff' : '#ffffff',
                  color: selectedErpFilter === 'all' ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                Tất cả ({branchesList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedErpFilter('locnuoc365')}
                style={{
                  padding: '7px 15px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: selectedErpFilter === 'locnuoc365' ? '#0284c7' : '#cbd5e1',
                  background: selectedErpFilter === 'locnuoc365' ? '#f0f9ff' : '#ffffff',
                  color: selectedErpFilter === 'locnuoc365' ? '#0369a1' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                Lọc Nước 365 ({branchesList.filter((b) => b.source_erp === 'locnuoc365').length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedErpFilter('zomzem')}
                style={{
                  padding: '7px 15px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: selectedErpFilter === 'zomzem' ? '#7e22ce' : '#cbd5e1',
                  background: selectedErpFilter === 'zomzem' ? '#faf5ff' : '#ffffff',
                  color: selectedErpFilter === 'zomzem' ? '#6b21a8' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                Zomzem ({branchesList.filter((b) => b.source_erp === 'zomzem').length})
              </button>
            </div>

            {/* Nút mở form thêm mới */}
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAdd}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={18} />
                <span>Thêm chi nhánh mới</span>
              </button>
            )}
          </div>

          {/* Form Thêm / Chỉnh sửa Chi nhánh chuẩn cấu trúc dữ liệu Campaign */}
          {isFormOpen && (
            <div
              style={{
                background: '#f8fafc',
                border: '2px solid #cbd5e1',
                borderRadius: '14px',
                padding: '22px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '12px',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {editingId ? 'Chỉnh sửa thông tin chi nhánh' : 'Thêm chi nhánh bổ sung mới'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  Hủy bỏ
                </button>
              </div>

              {/* Hàng 1: Mã chi nhánh, Nguồn hệ thống, Mã chiến dịch (tùy chọn) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.5fr 1.2fr',
                  gap: '16px',
                }}
              >
                {/* 1. Ô nhập Branch ID */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Mã chi nhánh (branch_id) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inputBranchId}
                    onChange={(e) => setInputBranchId(e.target.value)}
                    placeholder="VD: 104"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid',
                      borderColor:
                        inputBranchId.trim() && !validationResult.isValid
                          ? '#ef4444'
                          : inputBranchId.trim() && validationResult.isValid
                            ? '#22c55e'
                            : '#cbd5e1',
                      fontSize: '14px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                {/* 2. Chọn Nguồn ERP */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Nguồn hệ thống <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={inputSourceErp}
                    onChange={(e) => setInputSourceErp(e.target.value as ErpSource)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      background: '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="locnuoc365">Lọc Nước 365 (locnuoc365)</option>
                    <option value="zomzem">Zomzem (zomzem)</option>
                  </select>
                </div>

                {/* 3. Ô nhập Mã chiến dịch (campaign_id) - Tùy chọn */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Mã chiến dịch (campaign_id) <small style={{ color: '#64748b' }}>(tùy chọn)</small>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={inputCampaignId}
                    onChange={(e) => setInputCampaignId(e.target.value)}
                    placeholder="Mặc định = branch_id"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Hàng 2: Tên chiến dịch (name cho dropdown) & Tên chi nhánh (branch_name cho lịch hẹn) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                }}
              >
                {/* 4. Ô nhập Tên chiến dịch (name) cho dropdown topbar */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Tên chiến dịch (name - dropdown chọn) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={inputCampaignName}
                    onChange={(e) => setInputCampaignName(e.target.value)}
                    placeholder="VD: Bình Dương (Dĩ An)"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    Tên này sẽ hiển thị trên thanh chọn chiến dịch.
                  </small>
                </div>

                {/* 5. Ô nhập Tên chi nhánh (branch_name) cho lịch hẹn Cột 1 & đơn hàng Cột 3 */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Tên chi nhánh (branch_name - lịch hẹn & đơn) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={inputBranchName}
                    onChange={(e) => setInputBranchName(e.target.value)}
                    placeholder="VD: Dĩ An"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                  <small style={{ color: '#64748b', fontSize: '11.5px', marginTop: '4px', display: 'block' }}>
                    Tên này sẽ hiển thị ở Cột 1 "LỊCH HẸN CHI NHÁNH" và Cột 3 "Chi nhánh thực hiện".
                  </small>
                </div>
              </div>

              {/* Thông báo kiểm tra trùng lặp thời gian thực */}
              {inputBranchId.trim() && (
                <div>
                  {!validationResult.isValid ? (
                    <div
                      style={{
                        padding: '10px 16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#b91c1c',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                      <span>{validationResult.errorMessage}</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: '10px 16px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#15803d',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                      <span>
                        Mã chi nhánh <b>#{inputBranchId}</b> hợp lệ và chưa tồn tại trong chiến dịch hay danh sách bổ sung của{' '}
                        <b>{inputSourceErp === 'zomzem' ? 'Zomzem' : 'Lọc Nước 365'}</b>.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkbox kích hoạt & Nút Lưu trong form */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid #e2e8f0',
                  marginTop: '4px',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    color: '#334155',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={inputIsActive}
                    onChange={(e) => setInputIsActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Kích hoạt hiển thị cho nhân viên Telesale</span>
                </label>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={resetForm}
                    style={{
                      padding: '9px 18px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmForm}
                    disabled={!isFormValid}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: !isFormValid ? '#94a3b8' : '#2563eb',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: !isFormValid ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s ease',
                      boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <Check size={17} />
                    <span>{editingId ? 'Cập nhật chi nhánh' : 'Xác nhận thêm'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bảng danh sách chi nhánh bổ sung rộng rãi, dễ xem */}
          <div
            style={{
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', width: '110px' }}>
                    Branch ID
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>
                    Tên Chiến Dịch (Dropdown)
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569' }}>
                    Tên Chi Nhánh (Lịch hẹn / Đơn)
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', width: '120px' }}>
                    Campaign ID
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', width: '140px' }}>
                    Nguồn Hệ Thống
                  </th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: '#475569', width: '120px' }}>
                    Trạng Thái
                  </th>
                  <th
                    style={{
                      padding: '12px 18px',
                      fontWeight: 600,
                      color: '#475569',
                      width: '100px',
                      textAlign: 'center',
                    }}
                  >
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingConfig ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                      <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
                      Đang tải danh sách chi nhánh...
                    </td>
                  </tr>
                ) : filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '42px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      <Building2 size={34} style={{ margin: '0 auto 10px', color: '#cbd5e1' }} />
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#64748b' }}>
                        Chưa có chi nhánh bổ sung nào{selectedErpFilter !== 'all' ? ' cho nguồn này' : ''}.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAdd}
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px dashed #93c5fd',
                          borderRadius: '8px',
                          padding: '7px 16px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Bấm vào đây để thêm chi nhánh đầu tiên
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: editingId === item.id ? '#eff6ff' : '#ffffff',
                        transition: 'background 0.1s ease',
                      }}
                    >
                      <td style={{ padding: '13px 18px', fontWeight: 700, color: '#0f172a' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#1e293b',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        >
                          #{item.branch_id}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px', fontWeight: 600, color: '#1e293b' }}>
                        {item.name || item.branch_name}
                      </td>
                      <td style={{ padding: '13px 18px', fontWeight: 600, color: '#0284c7' }}>
                        {item.branch_name}
                      </td>
                      <td style={{ padding: '13px 18px', color: '#64748b', fontSize: '13px' }}>
                        <span
                          style={{
                            background: '#f8fafc',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontFamily: 'monospace',
                          }}
                        >
                          #{item.campaign_id || item.branch_id}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: item.source_erp === 'zomzem' ? '#faf5ff' : '#f0f9ff',
                            color: item.source_erp === 'zomzem' ? '#7e22ce' : '#0369a1',
                            border: `1px solid ${item.source_erp === 'zomzem' ? '#e9d5ff' : '#bae6fd'}`,
                          }}
                        >
                          {item.source_erp === 'zomzem' ? 'Zomzem' : 'Lọc Nước 365'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 18px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          title="Bấm để bật / tắt hiển thị trên màn hình Telesale"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 11px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: item.is_active ? '#dcfce7' : '#f1f5f9',
                            color: item.is_active ? '#15803d' : '#64748b',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Power size={13} />
                          {item.is_active ? 'Đang bật' : 'Tạm ẩn'}
                        </button>
                      </td>
                      <td style={{ padding: '13px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa thông tin"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(item.id, item.branch_name)}
                            title="Xóa chi nhánh này"
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer lớn & rõ ràng */}
        <div
          style={{
            padding: '18px 32px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasChanges && (
              <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 600 }}>
                ⚠️ Bạn có thay đổi chưa lưu vào hệ thống.
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saveMutation.isPending}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saveMutation.isPending || (!hasChanges && branchesList.length === 0)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: hasChanges ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: saveMutation.isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                transition: 'all 0.15s ease',
              }}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Đang lưu cấu hình...</span>
                </>
              ) : (
                <>
                  <Check size={17} />
                  <span>{hasChanges ? 'Lưu cấu hình' : 'Đã lưu cấu hình'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
