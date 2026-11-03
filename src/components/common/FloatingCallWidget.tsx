import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ExternalLink,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  PhoneOff,
  Play,
} from 'lucide-react'
import { useCallStore, CallDurationText } from '../../store/useCallStore'
import { useTelesaleCallStore } from '../../store/useTelesaleCallStore'
import sipService from '../../services/sipService'
import { notify } from '../../utils/notify'

export const FloatingCallWidget: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = useTelesaleCallStore((s) => s.tabs)
  const activeTabId = useTelesaleCallStore((s) => s.activeTabId)
  const setActiveTabId = useTelesaleCallStore((s) => s.setActiveTabId)
  const updateTab = useTelesaleCallStore((s) => s.updateTab)

  // Danh sách các tab đang có cuộc gọi thực tế (calling, connected, paused)
  const activeCallTabs = tabs.filter(
    (t) => t.status === 'calling' || t.status === 'connected' || t.status === 'paused',
  )

  // Tab ưu tiên hiển thị:
  // 1. Tab active hiện tại nếu đang trong cuộc gọi
  // 2. Tab có trạng thái connected (đang đàm thoại)
  // 3. Tab đầu tiên trong danh sách đang gọi/giữ
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const isCurrentActiveTabInCall =
    activeTab && (activeTab.status === 'calling' || activeTab.status === 'connected' || activeTab.status === 'paused')
  const currentTab =
    (isCurrentActiveTabInCall ? activeTab : null) ||
    tabs.find((t) => t.status === 'connected') ||
    activeCallTabs[0] ||
    null

  // Fallback đọc useCallStore cho tương thích ngược
  const legacyStatus = useCallStore((s) => s.status)
  const legacyCaller = useCallStore((s) => s.caller)
  const legacyMuted = useCallStore((s) => s.isMuted)
  const legacyHeld = useCallStore((s) => s.isHeld)

  const isLegacyCallActive =
    legacyStatus === 'calling' || legacyStatus === 'connected' || legacyStatus === 'paused'

  const isCallActive = activeCallTabs.length > 0 || isLegacyCallActive
  const hasInPlaceCallControls =
    location.pathname.startsWith('/telesale') ||
    location.pathname.startsWith('/leads') ||
    location.pathname.startsWith('/orders')

  if (!isCallActive || hasInPlaceCallControls) {
    return null
  }

  // Thuộc tính hiển thị thực tế dựa trên nguồn dữ liệu chuẩn (useTelesaleCallStore ưu tiên)
  const status = currentTab ? currentTab.status : legacyStatus
  const isMuted = currentTab ? currentTab.isMuted : legacyMuted
  const isHeld = currentTab ? currentTab.isHeld : legacyHeld
  const customerName = currentTab
    ? currentTab.customer?.customer_name || 'Khách hàng'
    : legacyCaller?.customerName || 'Khách hàng'
  const phoneMasked = currentTab
    ? currentTab.callerNumber || currentTab.customer?.members?.[0]?.phone_masked || '*** *** ***'
    : legacyCaller?.phoneMasked || '*** *** ***'
  const lineLabel = currentTab ? currentTab.label : undefined

  const handleOpenTelesale = () => {
    if (currentTab) {
      setActiveTabId(currentTab.id)
      sipService.setActiveLineId(currentTab.id)
    }
    navigate('/telesale')
  }

  const handleToggleMute = () => {
    if (currentTab) {
      const isNowMuted = sipService.toggleMute(currentTab.id)
      updateTab(currentTab.id, { isMuted: isNowMuted })
      useCallStore.setState({ isMuted: isNowMuted })
      notify(isNowMuted ? `Đã tắt mic (${currentTab.label})` : `Đã bật mic (${currentTab.label})`)
    } else {
      const isNowMuted = sipService.toggleMute()
      useCallStore.getState().toggleMute()
      notify(isNowMuted ? 'Đã tắt mic' : 'Đã bật mic')
    }
  }

  const handleToggleHold = () => {
    if (currentTab) {
      const result = sipService.toggleHold(currentTab.id)
      if (result === null) {
        notify('Chưa thể giữ máy/tiếp tục vào lúc này. Vui lòng thử lại sau giây lát.')
        return
      }
      const isNowHeld = result
      const newStatus = isNowHeld ? 'paused' : 'connected'
      updateTab(currentTab.id, { isHeld: isNowHeld, status: newStatus })
      useCallStore.setState({ isHeld: isNowHeld, status: newStatus })
      notify(isNowHeld ? `Đang giữ máy (${currentTab.label})` : `Tiếp tục cuộc gọi (${currentTab.label})`)
    } else {
      const result = sipService.toggleHold()
      if (result === null) {
        notify('Chưa thể giữ máy/tiếp tục vào lúc này. Vui lòng thử lại sau giây lát.')
        return
      }
      const isNowHeld = result
      useCallStore.getState().toggleHold()
      notify(isNowHeld ? 'Đang giữ máy' : 'Tiếp tục cuộc gọi')
    }
  }

  const handleEndCall = () => {
    if (currentTab) {
      sipService.hangup(currentTab.id)
      updateTab(currentTab.id, { status: 'ended', isHeld: false })
      const remaining = activeCallTabs.filter((t) => t.id !== currentTab.id)
      if (remaining.length === 0) {
        useCallStore.getState().endCall()
      } else {
        const nextTab = remaining[0]
        setActiveTabId(nextTab.id)
        sipService.setActiveLineId(nextTab.id)
        useCallStore.setState({
          status: nextTab.status,
          isHeld: nextTab.isHeld,
          isMuted: nextTab.isMuted,
          caller: {
            customerName: nextTab.customer?.customer_name || 'Khách hàng',
            phoneMasked: nextTab.callerNumber || '*** *** ***',
          },
          durationSec: nextTab.durationSec,
        })
      }
      notify(`Đã kết thúc cuộc gọi ${currentTab.label}`)
    } else {
      sipService.hangup()
      useCallStore.getState().endCall()
      notify('Đã kết thúc cuộc gọi')
    }
  }

  const handleSwitchTab = (tabId: number) => {
    setActiveTabId(tabId)
    sipService.setActiveLineId(tabId)
    const target = tabs.find((t) => t.id === tabId)
    if (target) {
      useCallStore.setState({
        status: target.status,
        isHeld: target.isHeld,
        isMuted: target.isMuted,
        caller: {
          customerName: target.customer?.customer_name || 'Khách hàng',
          phoneMasked: target.callerNumber || '*** *** ***',
        },
        durationSec: target.durationSec,
      })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'clamp(12px, 3vw, 24px)',
        right: 'clamp(12px, 3vw, 24px)',
        zIndex: 9990,
        backgroundColor: '#1e293b',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: 'min(440px, calc(100vw - 24px))',
        maxWidth: '100%',
        boxSizing: 'border-box',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Bộ chuyển đổi nhanh giữa các Line nếu có nhiều hơn 1 cuộc gọi đang chạy */}
      {activeCallTabs.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '8px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Đổi Line:</span>
          {activeCallTabs.map((t) => {
            const isSelected = t.id === currentTab?.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSwitchTab(t.id)}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #60a5fa' : '1px solid transparent',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#2563eb' : '#334155',
                  color: '#ffffff',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label} ({t.status === 'connected' ? 'Đàm thoại' : t.status === 'paused' ? 'Giữ máy' : 'Đang gọi'})
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Icon trạng thái cuộc gọi với hiệu ứng nhấp nháy */}
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: status === 'paused' ? '#d97706' : '#10b981',
            display: 'grid',
            placeItems: 'center',
            color: '#ffffff',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <PhoneCall size={20} />
          {status === 'connected' && (
            <span
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#34d399',
                border: '2px solid #1e293b',
              }}
            />
          )}
        </div>

        {/* Thông tin khách hàng & thời lượng */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {lineLabel && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {lineLabel}
              </span>
            )}
            <strong
              style={{
                fontSize: '13px',
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {customerName}
            </strong>
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: status === 'paused' ? '#78350f' : '#064e3b',
                color: status === 'paused' ? '#fde68a' : '#a7f3d0',
                fontWeight: 600,
              }}
            >
              {status === 'calling' ? 'Đang gọi...' : status === 'paused' ? 'Giữ máy' : 'Đang thoại'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {phoneMasked}
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>
              <CallDurationText tabId={currentTab?.id} />
            </span>
          </div>
        </div>

        {/* Các nút thao tác nhanh cuộc gọi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted ? 'Bật micro' : 'Tắt micro'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isMuted ? '#ef4444' : '#334155',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            type="button"
            onClick={handleToggleHold}
            title={isHeld ? 'Tiếp tục' : 'Giữ máy'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isHeld ? '#f59e0b' : '#334155',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            {isHeld ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            title="Gác máy"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <PhoneOff size={16} />
          </button>

          <button
            type="button"
            onClick={handleOpenTelesale}
            title="Mở bàn làm việc đàm thoại"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FloatingCallWidget
