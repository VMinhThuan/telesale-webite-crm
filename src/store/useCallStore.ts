import React from 'react'
import { create } from 'zustand'
import { formatDuration } from '../utils/formatters'

export type CallStatus = 'idle' | 'calling' | 'connected' | 'paused' | 'ended'

export interface CallerInfo {
  customerId?: number
  customerName: string
  phoneMasked: string
  address?: string
  memberId?: number
  memberName?: string
  dialNumber?: string
}

interface CallState {
  status: CallStatus
  caller: CallerInfo | null
  durationSec: number
  isMuted: boolean
  isHeld: boolean
  isAutoDial: boolean

  // Actions
  startCall: (caller: CallerInfo) => void
  connectCall: () => void
  toggleMute: () => void
  toggleHold: () => void
  endCall: () => void
  tickDuration: () => void
  setAutoDial: (auto: boolean) => void
  resetCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  status: 'idle',
  caller: null,
  durationSec: 0,
  isMuted: false,
  isHeld: false,
  isAutoDial: false,

  startCall: (caller) =>
    set({
      status: 'calling',
      caller,
      durationSec: 0,
      isMuted: false,
      isHeld: false,
    }),

  connectCall: () => set({ status: 'connected' }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleHold: () =>
    set((state) => ({
      isHeld: !state.isHeld,
      status: !state.isHeld ? 'paused' : 'connected',
    })),

  endCall: () => set({ status: 'ended' }),

  tickDuration: () => set((state) => ({ durationSec: state.durationSec + 1 })),

  setAutoDial: (auto) => set({ isAutoDial: auto }),

  resetCall: () =>
    set({
      status: 'idle',
      caller: null,
      durationSec: 0,
      isMuted: false,
      isHeld: false,
    }),
}))

/**
 * Component hiển thị thời lượng cuộc gọi nguyên tử (Atomic Component).
 * Chỉ re-render duy nhất phần text thời gian mỗi giây, giúp component cha (Telesale, Widget)
 * KHÔNG bị re-render toàn bộ khi durationSec tăng.
 */
export const CallDurationText: React.FC<{
  className?: string
  style?: React.CSSProperties
}> = React.memo(({ className, style }) => {
  const durationSec = useCallStore((state) => state.durationSec)
  return React.createElement('span', { className, style }, formatDuration(durationSec))
})

export default useCallStore
