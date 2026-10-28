import React from 'react'
import { FileText, Phone, Play, X } from 'lucide-react'
import { DialogState } from '../../types'
import { notify } from '../../utils/notify'

interface DialogProps {
  dialog: DialogState | null
  onClose: () => void
}

export const Dialog: React.FC<DialogProps> = ({ dialog, onClose }) => {
  if (!dialog) return null

  const handleAction = () => {
    onClose()
    notify(
      dialog.type === 'call'
        ? 'Đang kết nối cuộc gọi đến khách hàng…'
        : 'Đã ghi nhận tiến độ học tập',
    )
  }

  return (
    <div className="mock-dialog-backdrop" onClick={onClose}>
      <section className="mock-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="dialog-close" onClick={onClose} type="button">
          <X size={19} />
        </button>
        <div className="dialog-icon">
          {dialog.type === 'video' ? (
            <Play size={27} />
          ) : dialog.type === 'call' ? (
            <Phone size={27} />
          ) : (
            <FileText size={27} />
          )}
        </div>
        <p className="eyebrow">
          {dialog.type === 'call' ? 'CUỘC GỌI TRỰC TIẾP' : 'TÀI LIỆU HƯỚNG DẪN'}
        </p>
        <h2>{dialog.title}</h2>
        <p>
          {dialog.type === 'video'
            ? 'Khóa đào tạo chuyên sâu về kỹ năng tư vấn và xử lý từ chối của khách hàng.'
            : dialog.type === 'call'
            ? 'Hệ thống đang kết nối kênh thoại tới số điện thoại khách hàng qua tổng đài SIP.'
            : 'Tài liệu hướng dẫn quy trình đối soát và xác nhận đơn hàng trên hệ thống.'}
        </p>
        <button className="dialog-primary" onClick={handleAction} type="button">
          {dialog.type === 'video'
            ? 'Bắt đầu xem'
            : dialog.type === 'call'
            ? 'Thực hiện gọi'
            : 'Đánh dấu đã đọc'}
        </button>
      </section>
    </div>
  )
}

export default Dialog
