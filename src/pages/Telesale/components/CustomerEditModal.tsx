import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  Cpu,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  User,
  X,
} from 'lucide-react'
import { CustomerMemberDto, NextCustomerDto, UpdateCustomerPayload } from '../../../types/api'
import {
  useAddCustomerMemberMutation,
  useUpdateCustomerMemberMutation,
  useUpdateCustomerMutation,
} from '../../../hooks/useCustomers'
import { useEnums } from '../../../hooks/useEnums'
import { notify } from '../../../utils/notify'

export interface CustomerEditModalProps {
  isOpen: boolean
  onClose: () => void
  customer: NextCustomerDto | null
  onSave: (updatedCustomer: NextCustomerDto) => void
}

const DEFAULT_RELATIONSHIPS = [
  'Chính chủ',
  'Người quyết định',
  'Vợ',
  'Chồng',
  'Con',
  'Bố / Mẹ',
  'Người thân',
  'Khác',
]

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSave,
}) => {
  // 1. Tải danh mục quan hệ từ ERP
  const { relationships } = useEnums(['relationship'])
  const relationshipOptions =
    relationships && relationships.length > 0
      ? relationships.map((r) => r.label || r.code)
      : DEFAULT_RELATIONSHIPS

  // 2. State thông tin chung khách hàng
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [machineModel, setMachineModel] = useState('')
  const [members, setMembers] = useState<CustomerMemberDto[]>([])

  // 3. State thêm số điện thoại mới
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [newMemberRelationship, setNewMemberRelationship] = useState(relationshipOptions[0] || 'Chính chủ')

  // 4. State chỉnh sửa inline thành viên đang có
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [editMemberName, setEditMemberName] = useState('')
  const [editMemberPhone, setEditMemberPhone] = useState('')
  const [editMemberRelationship, setEditMemberRelationship] = useState('')

  // 5. React Query Mutations kết nối trực tiếp Backend
  const updateCustomerMutation = useUpdateCustomerMutation()
  const addMemberMutation = useAddCustomerMemberMutation()
  const updateMemberMutation = useUpdateCustomerMemberMutation()

  // Đổ dữ liệu khi mở Modal hoặc khi khách hàng thay đổi
  useEffect(() => {
    if (customer && isOpen) {
      setCustomerName(customer.customer_name || '')
      setAddress(customer.landmark || customer.masked_address || '')
      setMachineModel(customer.custom_field1 || '')
      setMembers(
        Array.isArray(customer.members) && customer.members.length > 0
          ? [...customer.members]
          : [
            {
              member_id: 1,
              name: customer.customer_name || 'Chính chủ',
              phone_masked: '—',
              relationship: 'Chính chủ',
            },
          ],
      )
      setNewMemberName('')
      setNewMemberPhone('')
      setNewMemberRelationship(relationshipOptions[0] || 'Chính chủ')
      setEditingMemberId(null)
    }
  }, [customer, isOpen])

  if (!isOpen || !customer) return null

  // Xử lý thêm số điện thoại mới (gọi API POST /members)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = newMemberPhone.trim().replace(/\s+/g, '')
    const cleanName = newMemberName.trim() || customerName || 'Người liên hệ'

    if (!cleanPhone) {
      notify('Vui lòng nhập số điện thoại')
      return
    }

    // Kiểm tra định dạng số điện thoại (10 chữ số bắt đầu bằng 0 hoặc +84 / 84)
    const phoneRegex = /^(0|\+84|84)[0-9]{9}$/
    if (!phoneRegex.test(cleanPhone)) {
      notify('Số điện thoại không đúng định dạng. Vui lòng nhập 10 chữ số (VD: 0912345678).')
      return
    }

    try {
      const response = await addMemberMutation.mutateAsync({
        customerId: customer.customer_id,
        payload: {
          first_name: cleanName,
          phone_number: cleanPhone,
          relationship: newMemberRelationship,
        },
      })

      // Backend trả về danh sách members cập nhật
      let updatedMembers: CustomerMemberDto[] = []
      if (response?.members && Array.isArray(response.members)) {
        updatedMembers = response.members
      } else {
        // Fallback nếu response dạng tối giản
        const masked = cleanPhone.length === 10
          ? `${cleanPhone.slice(0, 2)}******${cleanPhone.slice(8)}`
          : cleanPhone
        updatedMembers = [
          ...members,
          {
            member_id: response?.member_id || Date.now(),
            name: cleanName,
            phone_masked: masked,
            relationship: newMemberRelationship,
          },
        ]
      }

      setMembers(updatedMembers)
      setNewMemberName('')
      setNewMemberPhone('')

      // Cập nhật ngay phiên làm việc ở store cha để cột gọi có số mới
      onSave({
        ...customer,
        customer_name: customerName.trim() || customer.customer_name,
        masked_address: address.trim() || customer.masked_address,
        landmark: address.trim(),
        custom_field1: machineModel.trim(),
        members: updatedMembers,
      })
    } catch {
      // Lỗi đã được xử lý và hiển thị thông báo qua onError của useAddCustomerMemberMutation
    }
  }

  // Mở chế độ sửa thông tin thành viên
  const handleStartEditMember = (m: CustomerMemberDto) => {
    setEditingMemberId(m.member_id)
    setEditMemberName(m.name || '')
    setEditMemberPhone('') // Mặc định để trống nếu không đổi số
    setEditMemberRelationship(m.relationship || relationshipOptions[0] || 'Chính chủ')
  }

  // Hủy sửa thành viên
  const handleCancelEditMember = () => {
    setEditingMemberId(null)
  }

  // Lưu sửa thông tin thành viên (gọi API POST /members/{memberId})
  const handleSaveEditMember = async (memberId: number) => {
    try {
      const payload: { first_name?: string; phone_number?: string; relationship?: string } = {}
      if (editMemberName.trim()) payload.first_name = editMemberName.trim()
      if (editMemberRelationship) payload.relationship = editMemberRelationship
      if (editMemberPhone.trim()) {
        const cleanPhone = editMemberPhone.trim().replace(/\s+/g, '')
        const phoneRegex = /^(0|\+84|84)[0-9]{9}$/
        if (!phoneRegex.test(cleanPhone)) {
          notify('Số điện thoại mới không hợp lệ. Vui lòng nhập 10 chữ số.')
          return
        }
        payload.phone_number = cleanPhone
      }

      const response = await updateMemberMutation.mutateAsync({
        customerId: customer.customer_id,
        memberId,
        payload,
      })

      let updatedMembers: CustomerMemberDto[] = []
      if (response?.members && Array.isArray(response.members)) {
        updatedMembers = response.members
      } else {
        updatedMembers = members.map((m) =>
          m.member_id === memberId
            ? {
              ...m,
              name: editMemberName.trim() || m.name,
              relationship: editMemberRelationship || m.relationship,
              ...(editMemberPhone.trim()
                ? {
                  phone_masked: `${editMemberPhone.slice(0, 2)}******${editMemberPhone.slice(8)}`,
                }
                : {}),
            }
            : m,
        )
      }

      setMembers(updatedMembers)
      setEditingMemberId(null)

      onSave({
        ...customer,
        members: updatedMembers,
      })
    } catch {
      // Đã notify trong hook
    }
  }

  // Lưu thông tin chung khách hàng (Tên, Địa chỉ chi tiết, Loại máy)
  const handleSubmitSave = async () => {
    if (!customerName.trim()) {
      notify('Họ tên khách hàng không được để trống!')
      return
    }

    const currentName = (customer.customer_name || '').trim()
    const currentAddr = (customer.landmark || customer.masked_address || '').trim()
    const currentMachine = (customer.custom_field1 || '').trim()

    const newName = customerName.trim()
    const newAddr = address.trim()
    const newMachine = machineModel.trim()

    const payload: UpdateCustomerPayload = {}
    let hasChanges = false

    if (newName !== currentName) {
      payload.name = newName
      hasChanges = true
    }
    if (newAddr !== currentAddr && newAddr !== '') {
      payload.landmark = newAddr
      hasChanges = true
    }
    if (newMachine !== currentMachine) {
      payload.custom_field1 = newMachine
      hasChanges = true
    }

    // Nếu không có thay đổi nào ở thông tin chung nhưng có thể đã thêm số
    if (!hasChanges) {
      const updatedCustomer: NextCustomerDto = {
        ...customer,
        customer_name: newName,
        masked_address: newAddr || customer.masked_address,
        landmark: newAddr,
        custom_field1: newMachine,
        members,
      }
      onSave(updatedCustomer)
      onClose()
      return
    }

    try {
      await updateCustomerMutation.mutateAsync({
        customerId: customer.customer_id,
        payload,
      })

      const updatedCustomer: NextCustomerDto = {
        ...customer,
        customer_name: newName,
        masked_address: newAddr || customer.masked_address,
        landmark: newAddr,
        custom_field1: newMachine,
        members,
      }

      onSave(updatedCustomer)
      onClose()
    } catch {
      // Đã notify trong hook
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
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
          borderRadius: '14px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #bfdbfe',
              }}
            >
              <Pencil size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 700, color: '#0f172a' }}>
                Cập nhật thông tin khách hàng
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                Mã KH: <b>{customer.customer_code}</b> • ID: #{customer.customer_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Modal (Scrollable) */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >

          {/* KHỐI 1: THÔNG TIN HỘ GIA ĐÌNH & THIẾT BỊ */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '14px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              <User size={15} style={{ color: '#2563eb' }} />
              <span>Thông tin khách hàng & Thiết bị</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              {/* 1.1 Họ tên */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '5px',
                  }}
                >
                  <span>Họ và tên khách hàng</span> <b style={{ color: '#e11d48' }}>*</b>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nhập họ tên khách hàng..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 1.2 Loại máy đang dùng */}
              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '5px',
                  }}
                >
                  <Cpu size={14} style={{ color: '#2563eb' }} />
                  <span>Loại máy / Thiết bị đang dùng</span>
                </label>
                <input
                  type="text"
                  value={machineModel}
                  onChange={(e) => setMachineModel(e.target.value)}
                  placeholder="VD: Karofi 8 lõi, Kangaroo, AO Smith..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#1e293b',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* 1.3 Địa chỉ chi tiết */}
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '5px',
                }}
              >
                <MapPin size={14} style={{ color: '#2563eb' }} />
                <span>Địa chỉ chi tiết (Số nhà, ngõ ngách, tên đường, thôn xóm)</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Nhập số nhà, ngõ/ngách, đường phố, phường/xã, quận/huyện..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#1e293b',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  lineHeight: '1.45',
                }}
              />
            </div>
          </div>

          {/* KHỐI 2: DANH SÁCH SỐ ĐIỆN THOẠI & NGƯỜI NGHE MÁY */}
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <Phone size={15} style={{ color: '#2563eb' }} />
                <span>Số điện thoại người liên hệ ({members.length})</span>
              </div>
            </div>

            {/* Danh sách các số hiện có */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              {members.map((m, idx) => {
                const isEditing = editingMemberId === m.member_id

                if (isEditing) {
                  return (
                    <div
                      key={m.member_id}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #93c5fd',
                        background: '#eff6ff',
                        display: 'grid',
                        gridTemplateColumns: 'minmax(120px, 1fr) minmax(130px, 1.2fr) minmax(120px, 1fr) auto',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        placeholder="Tên liên hệ"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                      <input
                        type="text"
                        value={editMemberPhone}
                        onChange={(e) => setEditMemberPhone(e.target.value)}
                        placeholder="Số ĐT mới (bỏ trống nếu giữ nguyên)"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#ffffff',
                        }}
                      />
                      <select
                        value={editMemberRelationship}
                        onChange={(e) => setEditMemberRelationship(e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          outline: 'none',
                          background: '#ffffff',
                          color: '#334155',
                        }}
                      >
                        {relationshipOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveEditMember(m.member_id)}
                          disabled={updateMemberMutation.isPending}
                          title="Lưu cập nhật thành viên"
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#2563eb',
                            color: '#ffffff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          {updateMemberMutation.isPending ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Lưu
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditMember}
                          title="Hủy"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={m.member_id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '7px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#eff6ff',
                          color: '#2563eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {m.name || 'Người liên hệ'}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>{m.phone_masked}</span>
                          {m.relationship && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 500,
                              }}
                            >
                              {m.relationship}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStartEditMember(m)}
                      title="Sửa thông tin hoặc số điện thoại người này"
                      style={{
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                      }}
                    >
                      <Pencil size={12} /> Sửa
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Form thêm số điện thoại mới */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1.5px dashed #cbd5e1',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '9px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} style={{ color: '#16a34a' }} />
                <span>Thêm số điện thoại mới cho khách hàng:</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(130px, 1.2fr) minmax(130px, 1.3fr) minmax(120px, 1fr) auto',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Tên người nghe (VD: Chị Mai)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  placeholder="Số ĐT (VD: 0912345678)"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  style={{
                    padding: '7px 11px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                <select
                  value={newMemberRelationship}
                  onChange={(e) => setNewMemberRelationship(e.target.value)}
                  style={{
                    padding: '7px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#fff',
                    color: '#334155',
                    boxSizing: 'border-box',
                  }}
                >
                  {relationshipOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={addMemberMutation.isPending}
                  style={{
                    padding: '7px 15px',
                    borderRadius: '6px',
                    border: 'none',
                    background: addMemberMutation.isPending ? '#94a3b8' : '#16a34a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: addMemberMutation.isPending ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {addMemberMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Đang thêm...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Thêm số
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '14px 22px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={updateCustomerMutation.isPending}
            style={{
              padding: '8px 16px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmitSave}
            disabled={updateCustomerMutation.isPending}
            style={{
              padding: '8px 22px',
              borderRadius: '7px',
              border: 'none',
              background: updateCustomerMutation.isPending ? '#93c5fd' : '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: updateCustomerMutation.isPending ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {updateCustomerMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Đang lưu...
              </>
            ) : (
              'Lưu thay đổi'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerEditModal
