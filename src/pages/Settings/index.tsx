import React, { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  Calendar,
  Camera,
  Copy,
  FileText,
  Headphones,
  ImagePlus,
  Mail,
  Phone,
  PhoneCall,
  Save,
  Sparkles,
  Undo2,
  Upload,
  UserCheck,
  UserRound,
} from 'lucide-react'
import { notify } from '../../utils/notify'
import { useAuth } from '../../hooks/useAuth'
import dayjs from '../../lib/dayjs'

interface FileUploadState {
  name: string
  url: string
}

type PhotoAngle = 'front' | 'left' | 'right'

const POPULAR_BANKS = [
  'Vietcombank',
  'Techcombank',
  'MB Bank',
  'ACB',
  'Vp Bank',
  'VPBank',
  'VietinBank',
  'BIDV',
  'Agribank',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'SHB',
  'MSB',
  'OCB',
  'LienVietPostBank',
  'SeABank',
  'Bac A Bank',
  'Nam A Bank',
]

export const SettingsPage: React.FC = () => {
  const { user, updateInfoMutation } = useAuth()

  const [form, setForm] = useState({
    phone: user?.contactNumber || user?.username || '',
    bank: user?.bankName || 'Vietcombank',
    account: user?.bankAccountNumber || '',
    holder: user?.bankAccountName || user?.name || '',
  })
  const [savedForm, setSavedForm] = useState(form)

  // Lưu trữ file thực tế do người dùng tải lên để gửi trong FormData
  const [rawFiles, setRawFiles] = useState<{
    qr?: File | null
    front?: File | null
    left?: File | null
    right?: File | null
    avatar?: File | null
  }>({})

  // Lưu trạng thái preview hiển thị ảnh
  const [files, setFiles] = useState<{
    qr: FileUploadState | null
    front: FileUploadState | null
    left: FileUploadState | null
    right: FileUploadState | null
    avatar?: FileUploadState | null
  }>({
    qr: null,
    front: null,
    left: null,
    right: null,
    avatar: null,
  })

  // Đồng bộ dữ liệu hồ sơ cá nhân và ảnh chân dung KYC từ ERP
  useEffect(() => {
    if (user) {
      const initialForm = {
        phone: user.contactNumber || user.username || '',
        bank: user.bankName || 'Vietcombank',
        account: user.bankAccountNumber || '',
        holder: user.bankAccountName || user.name || '',
      }
      setForm(initialForm)
      setSavedForm(initialForm)

      setFiles({
        qr: user.bankQrImageUrl ? { name: 'Mã QR ngân hàng (ERP)', url: user.bankQrImageUrl } : null,
        front: user.frontImageUrl ? { name: 'Ảnh chính diện (ERP)', url: user.frontImageUrl } : null,
        left: user.leftImageUrl ? { name: 'Ảnh nghiêng trái (ERP)', url: user.leftImageUrl } : null,
        right: user.rightImageUrl ? { name: 'Ảnh nghiêng phải (ERP)', url: user.rightImageUrl } : null,
        avatar: user.avatarUrl ? { name: 'Ảnh đại diện', url: user.avatarUrl } : null,
      })
    }
  }, [user])

  // Danh sách ngân hàng hoàn chỉnh, đảm bảo luôn hiển thị đúng tên ngân hàng từ ERP
  const bankOptions = useMemo(() => {
    const list = [...POPULAR_BANKS]
    if (form.bank && !list.includes(form.bank)) {
      list.unshift(form.bank)
    }
    return list
  }, [form.bank])

  const updateFile = (key: 'qr' | PhotoAngle | 'avatar', file: File | null | undefined) => {
    if (file) {
      setRawFiles((current) => ({ ...current, [key]: file }))
      setFiles((current) => ({
        ...current,
        [key]: { name: file.name, url: URL.createObjectURL(file) },
      }))

      const labelMap: Record<string, string> = {
        qr: 'Mã QR ngân hàng',
        front: 'Ảnh chính diện',
        left: 'Ảnh nghiêng trái',
        right: 'Ảnh nghiêng phải',
        avatar: 'Ảnh đại diện',
      }
      notify(`Đã chọn: ${labelMap[key] || key}`)
    }
  }

  const handleCancel = () => {
    setForm(savedForm)
    setRawFiles({})
    setFiles({
      qr: user?.bankQrImageUrl ? { name: 'Mã QR ngân hàng (ERP)', url: user.bankQrImageUrl } : null,
      front: user?.frontImageUrl ? { name: 'Ảnh chính diện (ERP)', url: user.frontImageUrl } : null,
      left: user?.leftImageUrl ? { name: 'Ảnh nghiêng trái (ERP)', url: user.leftImageUrl } : null,
      right: user?.rightImageUrl ? { name: 'Ảnh nghiêng phải (ERP)', url: user.rightImageUrl } : null,
      avatar: user?.avatarUrl ? { name: 'Ảnh đại diện', url: user.avatarUrl } : null,
    })
    notify('Đã hủy các thay đổi')
  }

  const handleSave = async () => {
    const formData = new FormData()
    if (form.phone) formData.append('contact_number', form.phone)
    if (form.bank) formData.append('bank_name', form.bank)
    if (form.account) formData.append('bank_account_number', form.account)
    if (form.holder) formData.append('bank_account_name', form.holder)

    // Đính kèm các file ảnh mới được người dùng chọn
    if (rawFiles.qr) formData.append('bank_qr_image', rawFiles.qr)
    if (rawFiles.front) formData.append('front_image', rawFiles.front)
    if (rawFiles.left) formData.append('left_image', rawFiles.left)
    if (rawFiles.right) formData.append('right_image', rawFiles.right)
    if (rawFiles.avatar) formData.append('avatar', rawFiles.avatar)

    try {
      await updateInfoMutation.mutateAsync(formData)
      setSavedForm(form)
      setRawFiles({})
    } catch {
      // notify đã được xử lý trong hook useAuth
    }
  }

  const photoCards: [PhotoAngle, string][] = [
    ['front', 'Chính diện'],
    ['left', 'Nghiêng mặt bên trái'],
    ['right', 'Nghiêng mặt bên phải'],
  ]

  const isSaving = updateInfoMutation.isPending

  return (
    <div className="content settings-content">
      <section className="settings-hero">
        <div className="settings-avatar" style={{ position: 'relative', overflow: 'hidden' }}>
          {files.avatar?.url || user?.avatarUrl ? (
            <img
              src={files.avatar?.url || user?.avatarUrl}
              alt={user?.name || 'Avatar'}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <UserRound size={42} />
          )}
          <label title="Đổi ảnh đại diện">
            <Camera size={15} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => updateFile('avatar', e.target.files?.[0])}
            />
          </label>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow">HỒ SƠ NHÂN SỰ CHÍNH THỨC</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: '2px 0 4px', fontSize: '22px' }}>{user?.name || user?.username || 'Hồ sơ cá nhân'}</h2>
            {user?.surname && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#e0effe',
                  color: '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}
              >
                Mã NV: {user.surname}
              </span>
            )}
            {user?.userExtension && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#fef3c7',
                  color: '#b45309',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                <Headphones size={13} /> Máy lẻ: #{user.userExtension}
              </span>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              marginTop: '6px',
              fontSize: '11.5px',
              color: '#56749c',
            }}
          >
            <span>
              <UserCheck size={14} style={{ color: '#2563eb' }} /> {user?.chucVu || user?.role || 'Nhân viên'} ·{' '}
              {user?.department || 'Phòng Telesale'} ({user?.loaiNv?.toUpperCase() || 'NVKD'})
            </span>
            {user?.email && (
              <span>
                <Mail size={14} style={{ color: '#2563eb' }} /> {user.email}
              </span>
            )}
            <span>
              <Sparkles size={14} style={{ color: '#059669' }} /> Chấm công:{' '}
              {user?.attendanceMethod === 'face_detection' ? 'Nhận diện khuôn mặt (Face ID)' : 'Mặc định'}
            </span>
            {user?.createdAt && (
              <span>
                <Calendar size={14} style={{ color: '#64748b' }} /> Gia nhập:{' '}
                {dayjs(user.createdAt).format('DD/MM/YYYY')}
              </span>
            )}
          </div>
        </div>
        <div className="settings-status">
          <i style={{ backgroundColor: user?.isVerified ? '#24c987' : '#f59e0b' }} />{' '}
          {user?.isVerified ? 'Tài khoản đã xác thực' : 'Chưa hoàn tất định danh'}
        </div>
      </section>

      {/* Khối Thông tin Tổng đài & Danh bạ Điều hành chi nhánh (Read-only) */}
      <section className="call-panel" style={{ marginTop: '16px', paddingBottom: '16px' }}>
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">VOIP & LIÊN HỆ ĐIỀU PHỐI</p>
            <h2>Tổng đài & Danh bạ điều hành</h2>
          </div>
        </div>

        <div
          style={{
            padding: '0 18px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '14px',
          }}
        >
          {/* Box thông số SIP Softphone */}
          <div
            style={{
              background: '#f8fafd',
              border: '1px solid #dce5f0',
              borderRadius: '8px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Headphones size={16} style={{ color: '#2563eb' }} /> Máy nhánh Softphone Telesale
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  color: '#15803d',
                  fontWeight: 600,
                  background: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                ● Đã kích hoạt
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Số máy lẻ:</span>
                <b style={{ color: '#0f172a', fontSize: '14px' }}>#{user?.userExtension || '1126'}</b>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Giao thức kết nối:</span>
                <span style={{ color: '#334155', fontWeight: 600 }}>WebRTC / SIP WSS</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Máy chủ tổng đài:</span>
                <span style={{ color: '#334155' }}>tongdai.zozin.vn:7443</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Hệ thống PBX:</span>
                <span style={{ color: '#334155' }}>Grandstream</span>
              </div>
            </div>
          </div>

          {/* Danh bạ NV điều hành (list_pdh) */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <PhoneCall size={13} style={{ color: '#2563eb' }} /> Danh bạ Phụ trách / Điều hành chi nhánh (
              {user?.listPdh?.length || 0}):
            </p>
            <div style={{ display: 'grid', gap: '6px' }}>
              {user?.listPdh && user.listPdh.length > 0 ? (
                user.listPdh.map((pdh, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      fontSize: '11px',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{pdh.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          color: '#0284c7',
                          background: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        Máy lẻ: {pdh.sdt}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(pdh.sdt)
                          notify(`Đã sao chép máy lẻ: ${pdh.sdt}`)
                        }}
                        title="Sao chép số máy lẻ"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          cursor: 'pointer',
                          color: '#475569',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Copy size={11} /> Chép
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Chưa có danh bạ điều hành</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="settings-top-grid">
        <section className="call-panel account-panel">
          <div className="call-panel-heading">
            <div>
              <p className="eyebrow">THÔNG TIN NHẬN TIỀN</p>
              <h2>Thông tin tài khoản</h2>
            </div>
          </div>
          <div className="settings-fields">
            <label>
              <Phone size={18} />
              <span>Số điện thoại</span>
              <input
                value={form.phone}
                placeholder="Nhập số điện thoại..."
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              <Building2 size={18} />
              <span>Ngân hàng nhận</span>
              <select
                value={form.bank}
                onChange={(e) => setForm({ ...form, bank: e.target.value })}
              >
                {bankOptions.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FileText size={18} />
              <span>Số tài khoản ngân hàng</span>
              <input
                value={form.account}
                placeholder="Nhập số tài khoản..."
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </label>
            <label>
              <UserRound size={18} />
              <span>Tên chủ tài khoản</span>
              <input
                value={form.holder}
                placeholder="Nhập họ và tên chủ thẻ..."
                onChange={(e) => setForm({ ...form, holder: e.target.value.toUpperCase() })}
              />
            </label>
          </div>
        </section>

        <section className="call-panel qr-panel">
          <div className="call-panel-heading">
            <div>
              <p className="eyebrow">THANH TOÁN</p>
              <h2>Mã QR tài khoản ngân hàng</h2>
            </div>
          </div>
          <label className={`upload-area ${files.qr ? 'has-file' : ''}`}>
            {files.qr ? (
              <img src={files.qr.url} alt="Mã QR ngân hàng" />
            ) : (
              <ImagePlus size={42} />
            )}
            <strong>{files.qr ? files.qr.name : 'Tải ảnh mã QR lên'}</strong>
            <small>{files.qr ? 'Đã có ảnh mã QR' : 'PNG, JPG · tối đa 5MB'}</small>
            <span>
              <Upload size={16} /> {files.qr ? 'Đổi tệp' : 'Chọn tệp'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => updateFile('qr', e.target.files?.[0])}
            />
          </label>
        </section>
      </div>

      <section className="call-panel portrait-panel">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">XÁC THỰC DANH TÍNH</p>
            <h2>Ảnh chân dung</h2>
            <span className="portrait-hint">Tải lên ảnh rõ mặt theo ba góc chụp.</span>
          </div>
        </div>
        <div className="portrait-grid">
          {photoCards.map(([key, label]) => (
            <label className={`portrait-upload ${files[key] ? 'has-file' : ''}`} key={key}>
              {files[key] ? (
                <img src={files[key]?.url} alt={label} />
              ) : (
                <UserRound size={50} />
              )}
              <strong>{label}</strong>
              <span>
                <Upload size={15} /> {files[key] ? 'Đổi ảnh' : 'Chọn ảnh'}
              </span>
              <small>{files[key] ? files[key]?.name : 'Chưa có tệp được chọn'}</small>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => updateFile(key, e.target.files?.[0])}
              />
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <button onClick={handleCancel} type="button" disabled={isSaving}>
            <Undo2 size={17} /> Hủy thay đổi
          </button>
          <button className="save-settings" onClick={handleSave} type="button" disabled={isSaving}>
            <Save size={17} /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
