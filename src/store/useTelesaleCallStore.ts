import { create } from 'zustand'
import { NextCustomerDto } from '../types/api'

export interface TelesaleCallTab {
  id: number
  label: string
  customer: NextCustomerDto | null
  selectedMemberId?: number
  status: 'idle' | 'calling' | 'connected' | 'paused' | 'ended'
  durationSec: number
  isMuted: boolean
  isHeld: boolean
  callerNumber?: string
}

const initialTabs: TelesaleCallTab[] = [
  {
    id: 1,
    label: 'Số 1',
    customer: null,
    status: 'idle',
    durationSec: 0,
    isMuted: false,
    isHeld: false,
  },
  {
    id: 2,
    label: 'Số 2',
    customer: null,
    status: 'idle',
    durationSec: 0,
    isMuted: false,
    isHeld: false,
  },
  {
    id: 3,
    label: 'Số 3',
    customer: null,
    status: 'idle',
    durationSec: 0,
    isMuted: false,
    isHeld: false,
  },
]

interface TelesaleCallState {
  tabs: TelesaleCallTab[]
  activeTabId: number

  // Actions
  setActiveTabId: (id: number) => void
  setTabs: (
    tabsOrUpdater:
      | TelesaleCallTab[]
      | ((prev: TelesaleCallTab[]) => TelesaleCallTab[]),
  ) => void
  updateTab: (tabId: number, partial: Partial<TelesaleCallTab>) => void
  tickDurations: () => void
  resetTabs: () => void
}

export const useTelesaleCallStore = create<TelesaleCallState>((set) => ({
  tabs: initialTabs,
  activeTabId: 1,

  setActiveTabId: (id: number) => set({ activeTabId: id }),

  setTabs: (tabsOrUpdater) =>
    set((state) => ({
      tabs:
        typeof tabsOrUpdater === 'function'
          ? tabsOrUpdater(state.tabs)
          : tabsOrUpdater,
    })),

  updateTab: (tabId: number, partial: Partial<TelesaleCallTab>) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tabId ? { ...t, ...partial } : t)),
    })),

  tickDurations: () =>
    set((state) => {
      const hasConnected = state.tabs.some((t) => t.status === 'connected')
      if (!hasConnected) return state
      return {
        tabs: state.tabs.map((t) =>
          t.status === 'connected'
            ? { ...t, durationSec: t.durationSec + 1 }
            : t,
        ),
      }
    }),

  resetTabs: () => set({ tabs: initialTabs, activeTabId: 1 }),
}))

export default useTelesaleCallStore

