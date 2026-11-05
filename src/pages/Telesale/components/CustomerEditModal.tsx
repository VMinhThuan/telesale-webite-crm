import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { CustomerMemberDto, NextCustomerDto } from '../../../types/api'
import { notify } from '../../../utils/notify'

export interface CustomerEditModalProps {
  isOpen: boolean
  onClose: () => void
  customer: NextCustomerDto | null
  onSave: (updatedCustomer: NextCustomerDto) => void
}

const RELATIONSHIP_OPTIONS = [
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
  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [members, setMembers] = useState<CustomerMemberDto[]>([])

  // State cho form thêm số điện thoại mới
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberPhone, setNewMemberPhone] = useState('')
  const [newMemberRelationship, setNewMemberRelationship] = useState('Chính chủ')

  // Đổ dữ liệu khi mở Modal hoặc khi khách hàng thay đổi
  useEffect(() => {
    if (customer && isOpen) {
      setCustomerName(customer.customer_name || '')
      setAddress(customer.masked_address || '')
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
      setNewMemberRelationship('Chính chủ')
    }
  }, [customer, isOpen])

  if (!isOpen || !customer) return null

  // Xử lý thêm số điện thoại mới vào danh sách
  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = newMemberPhone.trim()
    const cleanName = newMemberName.trim() || customerName || 'Người liên hệ'

    if (!cleanPhone) {
      notify('Vui lòng nhập số điện thoại')
      return
    }

    // Kiểm tra định dạng cơ bản của số điện thoại Việt Nam (10 số)
    const phoneRegex = /^(0|\+84)[0-9]{8,11}$/
    if (!phoneRegex.test(cleanPhone.replace(/\s+/g, ''))) {
      notify('Số điện thoại không đúng định dạng. Vui lòng nhập 10 chữ số (VD: 0912345678).')
      return
    }

    const newMember: CustomerMemberDto = {
      member_id: -Math.floor(Date.now() % 1000000), // ID âm tượng trưng cho member tạo mới ở FE
      name: cleanName,
      phone_masked: cleanPhone,
      relationship: newMemberRelationship,
    }

    setMembers((prev) => [...prev, newMember])
    setNewMemberPhone('')
    setNewMemberName('')
    notify(`Đã thêm số điện thoại: ${cleanPhone} (${cleanName})`)
  }

  // Xử lý xóa một số điện thoại
  const handleRemoveMember = (memberId: number) => {
    if (members.length <= 1) {
      notify('Khách hàng phải có tối thiểu 1 số điện thoại liên hệ!')
      return
    }
    setMembers((prev) => prev.filter((m) => m.member_id !== memberId))
  }

  // Lưu lại các thay đổi vào hồ sơ khách hàng
  const handleSubmitSave = () => {
    if (!customerName.trim()) {
      notify('Họ tên khách hàng không được để trống!')
      return
    }

    const updatedCustomer: NextCustomerDto = {
      ...customer,
      customer_name: customerName.trim(),
      masked_address: address.trim() || customer.masked_address,
      members,
    }

    onSave(updatedCustomer)
    notify('Đã cập nhật thông tin khách hàng thành công!')
    onClose()
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
          maxWidth: '720px',
          maxHeight: '90vh',
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
            padding: '18px 24px',
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
              <Pencil size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                Sửa thông tin khách hàng
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Mã KH: <b>{customer.customer_code}</b>
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

        {/* Body Modal (Scrollable, không cuộn ngang) */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Thông báo API */}
          <div
            style={{
              padding: '10px 12px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#0369a1',
              lineHeight: '1.4',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <b>Lưu ý:</b> Dữ liệu chỉnh sửa sẽ được cập nhật trực tiếp vào phiên gọi của tab hiện tại.
              Khi Backend hoàn thiện API, hệ thống sẽ tự động đồng bộ vĩnh viễn lên cơ sở dữ liệu ERP.
            </span>
          </div>

          {/* 1. Tên khách hàng */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              <User size={15} style={{ color: '#2563eb' }} />
              <span>Họ và tên khách hàng</span> <b style={{ color: '#e11d48' }}>*</b>
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nhập họ tên khách hàng..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* 2. Địa chỉ */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              <MapPin size={15} style={{ color: '#2563eb' }} />
              <span>Địa chỉ liên hệ / Lắp đặt</span>
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                color: '#1e293b',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* 3. Danh sách số điện thoại & Người liên hệ */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  margin: 0,
                }}
              >
                <Phone size={15} style={{ color: '#2563eb' }} />
                <span>Số điện thoại người liên hệ ({members.length})</span>
              </label>
            </div>

            {/* Danh sách các số hiện có */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginBottom: '12px',
              }}
            >
              {members.map((m, idx) => (
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
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.member_id)}
                      title="Xóa số điện thoại này"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Form thêm số điện thoại mới */}
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '9px',
                border: '1.5px dashed #cbd5e1',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={15} style={{ color: '#16a34a' }} />
                <span>Thêm số điện thoại mới cho khách hàng:</span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(140px, 1.3fr) minmax(130px, 1fr) auto',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Tên người nghe (VD: Chị Mai)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '7px',
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
                    padding: '8px 12px',
                    borderRadius: '7px',
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
                    padding: '8px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                    background: '#fff',
                    color: '#334155',
                    boxSizing: 'border-box',
                  }}
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddMember}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '7px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={15} /> Thêm
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13.5px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmitSave}
            style={{
              padding: '9px 24px',
              borderRadius: '7px',
              border: 'none',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            }}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  )
}

export default CustomerEditModal

