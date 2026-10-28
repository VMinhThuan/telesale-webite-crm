import { create } from 'zustand'

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

export default useCallStore
