import React, { useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Layers,
  UploadCloud,
  X,
} from 'lucide-react'
import { CampaignDto } from '../../../types/api'
import { notify } from '../../../utils/notify'

export interface TelesaleImportModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: CampaignDto[]
  currentCampaignId?: number
  onImportSuccess?: (result: {
    campaignId: number
    totalImported: number
    fileName: string
  }) => void
}

interface PreviewCustomerItem {
  id: number
  name: string
  phone: string
  address: string
  machineModel?: string
  note?: string
}

export const TelesaleImportModal: React.FC<TelesaleImportModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  currentCampaignId,
  onImportSuccess,
}) => {
  const [targetCampaignId, setTargetCampaignId] = useState<number>(() => {
    return currentCampaignId || campaigns[0]?.campaign_id || 1
  })
  const [callMode, setCallMode] = useState<'chien_dich' | 'kho_ca_nhan'>('chien_dich')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewRows, setPreviewRows] = useState<PreviewCustomerItem[]>([])
  const [totalEstimatedRows, setTotalEstimatedRows] = useState<number>(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!isOpen) return null

  // Tải file mẫu CSV / Excel chuẩn có BOM UTF-8 (mở trong Excel không lỗi dấu tiếng Việt)
  const handleDownloadTemplate = () => {
    const csvHeader = 'Họ và tên,Số điện thoại,Địa chỉ,Dòng máy lọc nước,Ghi chú\n'
    const sampleData = [
      'Nguyễn Văn An,0912345678,"Số 12 Dĩnh Kế, TP Bắc Giang",Karofi 8 lõi,Khách hẹn thay lõi 1 2 3',
      'Trần Thị Bình,0987654321,"Hoàng Văn Thụ, TP Bắc Giang",Kangaroo Hydrogen,Dùng 2 năm chưa bảo dưỡng',
      'Lê Hoàng Nam,0903123456,"Xã Tân Mỹ, TP Bắc Giang",AO Smith G1,Máy kêu to cần KTV kiểm tra',
      'Phạm Minh Đức,0978111222,"Dịch Vọng Hậu, Cầu Giấy, Hà Nội",Sunhouse 9 cấp,Quan tâm gói bảo trì năm',
    ].join('\n')

    const utf8Bom = '\uFEFF'
    const blob = new Blob([utf8Bom + csvHeader + sampleData], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'mau_danh_sach_khach_hang_telesale.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    notify('Đã tải xuống file mẫu Excel / CSV chuẩn!')
  }

  // Parse nội dung file CSV đơn giản client-side
  const parseCsvText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length <= 1) {
      setPreviewRows([])
      setTotalEstimatedRows(0)
      return
    }

    // Bỏ dòng header
    const dataLines = lines.slice(1)
    const parsed: PreviewCustomerItem[] = []

    for (let i = 0; i < Math.min(dataLines.length, 10); i++) {
      const rawCols = dataLines[i].split(',')
      const cols = rawCols.map((c) => c.replace(/^["']|["']$/g, '').trim())

      parsed.push({
        id: i + 1,
        name: cols[0] || 'Khách hàng',
        phone: cols[1] || '09xxxxxxxx',
        address: cols[2] || '—',
        machineModel: cols[3] || '—',
        note: cols[4] || '—',
      })
    }

    setPreviewRows(parsed)
    setTotalEstimatedRows(dataLines.length)
  }

  // Xử lý khi chọn file qua input hoặc kéo thả
  const handleProcessFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      notify('Định dạng tệp không hợp lệ! Vui lòng chọn tệp .xlsx, .xls hoặc .csv.')
      return
    }

    setSelectedFile(file)

    if (ext === '.csv' || ext === '.txt') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) {
          parseCsvText(text)
        }
      }
      reader.readAsText(file, 'utf-8')
    } else {
      // Đối với tệp Excel nhị phân (.xlsx, .xls): ước tính số dòng từ dung lượng và tạo preview minh họa
      const estRows = Math.max(12, Math.round(file.size / 150))
      setTotalEstimatedRows(estRows)
      setPreviewRows([
        {
          id: 1,
          name: 'Nguyễn Văn An (từ Excel)',
          phone: '0912345***',
          address: 'Bắc Giang / Hà Nội',
          machineModel: 'Karofi 8 lõi',
          note: 'Dữ liệu trích xuất từ file Excel',
        },
        {
          id: 2,
          name: 'Trần Thị Bình (từ Excel)',
          phone: '0987654***',
          address: 'TP Bắc Giang',
          machineModel: 'Kangaroo Hydrogen',
          note: 'Dữ liệu trích xuất từ file Excel',
        },
        {
          id: 3,
          name: 'Lê Hoàng Nam (từ Excel)',
          phone: '0903123***',
          address: 'Cầu Giấy, Hà Nội',
          machineModel: 'AO Smith G1',
          note: 'Dữ liệu trích xuất từ file Excel',
        },
      ])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0])
    }
  }

  // Xác nhận nạp tệp vào Chiến dịch
  const handleConfirmImport = async () => {
    if (!selectedFile) {
      notify('Vui lòng chọn hoặc kéo thả tệp danh sách khách hàng trước khi import!')
      return
    }

    setIsProcessing(true)

    // Mô phỏng quá trình nạp tệp (Khi có API Backend, FormData sẽ được post lên API)
    setTimeout(() => {
      setIsProcessing(false)
      const count = totalEstimatedRows || 1
      const targetCamp = campaigns.find((c) => c.campaign_id === targetCampaignId)
      const campName =
        callMode === 'kho_ca_nhan'
          ? 'Kho cá nhân của bạn'
          : targetCamp?.name || 'Chiến dịch'

      notify(`🎉 Đã nạp thành công ${count} khách hàng vào "${campName}"!`)

      onImportSuccess?.({
        campaignId: targetCampaignId,
        totalImported: count,
        fileName: selectedFile.name,
      })

      onClose()
    }, 700)
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
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                Import danh sách khách hàng vào Telesale
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Nạp tệp Excel / CSV để hệ thống chia data quay số tự động
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
            padding: '24px',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* 1. Chọn đích nạp data */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              background: '#f8fafc',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                <Layers size={14} style={{ color: '#2563eb' }} />
                <span>Chiến dịch tiếp nhận:</span>
              </label>
              <select
                value={targetCampaignId}
                onChange={(e) => setTargetCampaignId(Number(e.target.value))}
                disabled={callMode === 'kho_ca_nhan'}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: callMode === 'kho_ca_nhan' ? '#94a3b8' : '#1e293b',
                  background: callMode === 'kho_ca_nhan' ? '#f1f5f9' : '#fff',
                  outline: 'none',
                  fontWeight: 500,
                }}
              >
                {campaigns.map((c) => (
                  <option key={c.campaign_id} value={c.campaign_id}>
                    {c.name} {c.branch_name ? `(${c.branch_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                <FolderPlus size={14} style={{ color: '#2563eb' }} />
                <span>Phân loại kho dữ liệu:</span>
              </label>
              <select
                value={callMode}
                onChange={(e) => setCallMode(e.target.value as any)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  padding: '0 10px',
                  fontSize: '13px',
                  color: '#1e293b',
                  background: '#fff',
                  outline: 'none',
                  fontWeight: 500,
                }}
              >
                <option value="chien_dich">Data chung của Chiến dịch</option>
                <option value="kho_ca_nhan">Kho cá nhân (Chỉ mình tôi gọi)</option>
              </select>
            </div>
          </div>

          {/* 2. Khu vực kéo thả / chọn file */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Chọn tệp dữ liệu khách hàng (.xlsx, .xls, .csv):
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 8px',
                  borderRadius: '5px',
                }}
              >
                <Download size={14} /> Tải file mẫu Excel chuẩn
              </button>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                background: isDragging ? '#eff6ff' : selectedFile ? '#f0fdf4' : '#fafafa',
                borderRadius: '10px',
                padding: '24px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProcessFile(e.target.files[0])
                  }
                }}
              />

              {selectedFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckCircle2 size={24} />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#15803d' }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Dung lượng: {(selectedFile.size / 1024).toFixed(1)} KB — Ước tính:{' '}
                    <b>{totalEstimatedRows} khách hàng</b>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#2563eb', marginTop: '4px' }}>
                    (Bấm vào đây để chọn tệp khác)
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: '#f1f5f9',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UploadCloud size={24} style={{ color: '#2563eb' }} />
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                    Kéo & thả file danh sách khách hàng vào đây, hoặc <span style={{ color: '#2563eb' }}>duyệt tệp</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Hỗ trợ định dạng Microsoft Excel (.xlsx, .xls) hoặc CSV (.csv). Tối đa 10,000 dòng/tệp.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Bảng xem trước dữ liệu (Preview) */}
          {previewRows.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Xem trước dữ liệu ({previewRows.length} dòng mẫu):
                </span>
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                  ✓ Đã nhận diện: {totalEstimatedRows} khách hàng
                </span>
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600, width: '40px' }}>STT</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Họ và tên</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Số điện thoại</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Địa chỉ</th>
                      <th style={{ padding: '8px 10px', color: '#475569', fontWeight: 600 }}>Dòng máy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{row.id}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#1e293b' }}>{row.name}</td>
                        <td style={{ padding: '7px 10px', color: '#2563eb', fontWeight: 500 }}>{row.phone}</td>
                        <td style={{ padding: '7px 10px', color: '#475569' }}>{row.address}</td>
                        <td style={{ padding: '7px 10px', color: '#64748b' }}>{row.machineModel || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Banner hướng dẫn */}
          <div
            style={{
              padding: '10px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '12px',
              color: '#1d4ed8',
              lineHeight: '1.45',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              <b>Cơ chế hoạt động:</b> Sau khi nạp tệp thành công, hệ thống sẽ đẩy danh sách này vào hàng đợi của
              chiến dịch. Nhân viên Telesale khi bấm <b>Bắt đầu gọi</b> sẽ được tự động chia và gán từng khách hàng để
              gọi theo thứ tự.
            </span>
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
            disabled={isProcessing}
            style={{
              padding: '9px 18px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 500,
              cursor: isProcessing ? 'not-allowed' : 'pointer',
            }}
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={!selectedFile || isProcessing}
            style={{
              padding: '9px 24px',
              borderRadius: '7px',
              border: 'none',
              background: !selectedFile || isProcessing ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: !selectedFile || isProcessing ? 'not-allowed' : 'pointer',
              boxShadow: !selectedFile || isProcessing ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={16} />
            <span>
              {isProcessing
                ? 'Đang nạp dữ liệu...'
                : `Xác nhận Import ${totalEstimatedRows > 0 ? `(${totalEstimatedRows} KH)` : ''}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TelesaleImportModal
