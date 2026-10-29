import React from 'react'
import {
  ChevronDown,
  Lightbulb,
  MapPin,
  Mic,
  MicOff,
  Pause,
  Phone,
  PhoneCall,
  PhoneOff,
  Play,
  UserRound,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import { useCallStore, CallDurationText } from '../../../store/useCallStore'
import { NextCustomerDto } from '../../../types/api'
import { notify } from '../../../utils/notify'

export interface TelesaleCallCenterPanelProps {
  currentCustomer: NextCustomerDto | null
  selectedMemberId?: number
  onSelectMemberId: (id: number) => void
  onDial: (memberId?: number) => void
  onFetchNextCustomer: () => void
  isFetchingCustomer: boolean
}

export const TelesaleCallCenterPanel: React.FC<TelesaleCallCenterPanelProps> = ({
  currentCustomer,
  selectedMemberId,
  onSelectMemberId,
  onDial,
  onFetchNextCustomer,
  isFetchingCustomer,
}) => {
  // Lấy các state và actions từ Zustand Call Store theo cơ chế Atomic Selectors
  const status = useCallStore((s) => s.status)
  const caller = useCallStore((s) => s.caller)
  const isMuted = useCallStore((s) => s.isMuted)
  const isHeld = useCallStore((s) => s.isHeld)
  const toggleMute = useCallStore((s) => s.toggleMute)
  const toggleHold = useCallStore((s) => s.toggleHold)
  const endCall = useCallStore((s) => s.endCall)

  return (
    <div className="center-call-column">
      {/* Khối điều khiển phiên đàm thoại */}
      <section className="call-panel active-call">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">PHIÊN ĐÀM THOẠI</p>
            <h2>Điều khiển cuộc gọi</h2>
          </div>
          <span className="calling-status">
            <i />{' '}
            {status === 'connected'
              ? 'Đang đàm thoại'
              : status === 'paused'
                ? 'Đang giữ máy'
                : status === 'calling'
                  ? 'Đang đổ chuông...'
                  : 'Sẵn sàng quay số'}
          </span>
        </div>

        {/* Thông tin khách hàng & thời lượng cuộc gọi */}
        {currentCustomer ? (
          <>
            <div className="caller">
              <div className="customer-avatar">
                <UserRound size={35} />
              </div>
              <div>
                <h3>{currentCustomer.customer_name}</h3>
                <p>
                  <MapPin size={14} />{' '}
                  {currentCustomer.masked_address || 'Địa chỉ bảo mật'}
                </p>
              </div>
              <strong>
                <CallDurationText />
              </strong>
            </div>

            <div className="caller-number" style={{ padding: '0 16px 10px' }}>
              <Phone size={15} />{' '}
              {caller?.phoneMasked ||
                currentCustomer.members?.[0]?.phone_masked ||
                'Số điện thoại bảo mật'}
            </div>

            {/* Danh sách thành viên liên hệ để chọn quay số */}
            {currentCustomer.members && currentCustomer.members.length > 0 && (
              <div style={{ padding: '0 16px 12px' }}>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#475569',
                    margin: '0 0 6px 0',
                  }}
                >
                  Thành viên liên hệ:
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {currentCustomer.members.map((m) => {
                    const isChosen = selectedMemberId === m.member_id
                    return (
                      <button
                        key={m.member_id}
                        type="button"
                        onClick={() => {
                          onSelectMemberId(m.member_id)
                          onDial(m.member_id)
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: isChosen ? '#eff6ff' : '#fff',
                          color: isChosen ? '#1d4ed8' : '#334155',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <PhoneCall size={12} />
                        <b>{m.name}</b> ({m.phone_masked})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Các nút điều khiển cuộc gọi */}
            <div className="call-controls">
              <button
                type="button"
                onClick={() => {
                  toggleMute()
                  notify(!isMuted ? 'Đã tắt micro' : 'Đã bật micro')
                }}
                className={clsx({ selected: isMuted })}
                disabled={status === 'idle'}
              >
                <span>{isMuted ? <MicOff size={20} /> : <Mic size={20} />}</span>
                {isMuted ? 'Bật mic' : 'Tắt mic'}
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleHold()
                  notify(!isHeld ? 'Đang giữ máy khách hàng' : 'Tiếp tục cuộc gọi')
                }}
                className={clsx({ selected: isHeld })}
                disabled={status === 'idle'}
              >
                <span>{isHeld ? <Play size={20} /> : <Pause size={20} />}</span>
                {isHeld ? 'Tiếp tục' : 'Giữ máy'}
              </button>

              <button
                className="end"
                type="button"
                onClick={() => {
                  endCall()
                  notify('Đã kết thúc cuộc gọi')
                }}
                disabled={status === 'idle'}
              >
                <span>
                  <PhoneOff size={20} />
                </span>
                Kết thúc
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '36px 16px', textAlign: 'center' }}>
            <p
              style={{
                color: '#64748b',
                fontSize: '13px',
                margin: '0 0 16px 0',
              }}
            >
              Chưa nạp khách hàng. Bấm nút bên dưới để nhận khách tiếp theo từ
              chiến dịch.
            </p>
            <button
              type="button"
              className="dialog-primary"
              onClick={onFetchNextCustomer}
              disabled={isFetchingCustomer}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Users size={16} />
              {isFetchingCustomer ? 'Đang nạp...' : 'Lấy khách tiếp theo'}
            </button>
          </div>
        )}
      </section>

      {/* Kịch bản tư vấn theo tình huống */}
      <section className="call-panel script-panel">
        <div className="call-panel-heading">
          <div>
            <p className="eyebrow">KỊCH BẢN TƯ VẤN</p>
            <h2>Tư vấn máy lọc nước</h2>
          </div>
          <button className="subtle-select" type="button">
            Bảo dưỡng / Thay lõi <ChevronDown size={15} />
          </button>
        </div>
        <ol>
          <li>
            Em chào anh/chị, em là tư vấn viên từ Lọc Nước 365. Em liên hệ để hỗ
            trợ kiểm tra định kỳ chất lượng nguồn nước nhà mình ạ.
          </li>
          <li>
            Dạ không biết lần gần nhất gia đình mình thay bộ lõi thô 1, 2, 3 là
            khi nào rồi ạ?
          </li>
          <li>
            Hiện tại vòi nước nhà mình chảy có mạnh không, nước có mùi vị lạ hay
            máy có phát ra tiếng ồn không ạ?
          </li>
          <li>
            Bên em đang có chương trình kỹ thuật viên qua kiểm tra máy, đo nồng
            độ TDS miễn phí tại nhà. Em hẹn lịch vào ca sáng hay chiều tiện cho
            gia đình mình ạ?
          </li>
        </ol>
        <button
          className="next-tip"
          type="button"
          onClick={() =>
            notify(
              'Gợi ý: Nhấn mạnh dịch vụ kiểm tra miễn phí áp lực nước và nồng độ TDS',
            )
          }
        >
          <Lightbulb size={17} /> Gợi ý tiếp theo
        </button>
      </section>
    </div>
  )
}
