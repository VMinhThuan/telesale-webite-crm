import React, { useEffect, useState } from 'react'
import {
  Building2,
  Camera,
  CircleHelp,
  FileText,
  ImagePlus,
  Phone,
  Save,
  Undo2,
  Upload,
  UserCheck,
  UserRound,
} from 'lucide-react'
import { notify } from '../../utils/notify'
import { useAuth } from '../../hooks/useAuth'

interface FileUploadState {
  name: string
  url: string
}

type PhotoAngle = 'front' | 'left' | 'right'

export const SettingsPage: React.FC = () => {
  const { user, updateInfoMutation } = useAuth()
  const [form, setForm] = useState({
    phone: user?.username || '',
    bank: '',
    account: '',
    holder: user?.name || '',
  })
  const [savedForm, setSavedForm] = useState(form)

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        phone: prev.phone || user.username || '',
        holder: prev.holder || user.name || '',
      }))
    }
  }, [user])
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
  })

  const updateFile = (key: 'qr' | PhotoAngle | 'avatar', file: File | null | undefined) => {
    if (file) {
      setFiles((current) => ({
        ...current,
        [key]: { name: file.name, url: URL.createObjectURL(file) },
      }))
      notify(`Đã chọn ảnh cho: ${key}`)
    }
  }

  const handleCancel = () => {
    setForm(savedForm)
    setFiles({ qr: null, front: null, left: null, right: null })
    notify('Đã hủy các thay đổi')
  }

  const handleSave = async () => {
    const formData = new FormData()
    if (form.phone) formData.append('contact_number', form.phone)
    if (form.bank) formData.append('bank_name', form.bank)
    if (form.account) formData.append('bank_account_number', form.account)
    if (form.holder) formData.append('bank_account_name', form.holder)
    try {
      await updateInfoMutation.mutateAsync(formData)
      setSavedForm(form)
      notify('Đã lưu thông tin tài khoản và định danh KYC lên')
    } catch {
      // notify đã được xử lý trong hook
    }
  }

  const photoCards: [PhotoAngle, string][] = [
    ['front', 'Chính diện'],
    ['left', 'Nghiêng mặt bên trái'],
    ['right', 'Nghiêng mặt bên phải'],
  ]

  return (
    <div className="content settings-content">
      <div className="page-title">
        <div>
          <p>Thông tin cá nhân và tài khoản nhận hoa hồng</p>
          <h1>Cài đặt</h1>
        </div>
        <button
          className="help"
          type="button"
          onClick={() => notify('Hướng dẫn cập nhật thông tin và xác minh danh tính')}
        >
          <CircleHelp size={17} /> Hướng dẫn
        </button>
      </div>

      <section className="settings-hero">
        <div className="settings-avatar">
          <UserRound size={42} />
          <label>
            <Camera size={15} />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => updateFile('avatar', e.target.files?.[0])}
            />
          </label>
        </div>
        <div>
          <p className="eyebrow">TÀI KHOẢN CỦA TÔI</p>
          <h2>{user?.name || user?.username || 'Hồ sơ cá nhân'}</h2>
          <span>
            <UserCheck size={15} /> {user?.role || 'Nhân viên'} · {user?.department || 'Telesale'}
          </span>
        </div>
        <div className="settings-status">
          <i /> Tài khoản đã xác thực
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
                <option>Vietcombank</option>
                <option>Techcombank</option>
                <option>MB Bank</option>
                <option>ACB</option>
              </select>
            </label>
            <label>
              <FileText size={18} />
              <span>Số tài khoản ngân hàng</span>
              <input
                value={form.account}
                onChange={(e) => setForm({ ...form, account: e.target.value })}
              />
            </label>
            <label>
              <UserRound size={18} />
              <span>Tên chủ tài khoản</span>
              <input
                value={form.holder}
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
            <small>{files.qr ? 'Đã chọn ảnh mã QR' : 'PNG, JPG · tối đa 5MB'}</small>
            <span>
              <Upload size={16} /> Chọn tệp
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
                <Upload size={15} /> Chọn ảnh
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
          <button onClick={handleCancel} type="button">
            <Undo2 size={17} /> Hủy thay đổi
          </button>
          <button className="save-settings" onClick={handleSave} type="button">
            <Save size={17} /> Lưu thay đổi
          </button>
        </div>
      </section>
    </div>
  )
}
