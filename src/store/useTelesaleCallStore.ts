import { create } from 'zustand'
import { CallResultOutcome, NextCustomerDto } from '../types/api'
import { ParsedCallTermination } from '../utils/sipCallParser'

export interface TelesaleDraftResult {
  outcome: CallResultOutcome
  callbackDate: string
  callbackTime: string
  note: string
  deniedLevel1: string
  deniedLevel2: string
  deniedLevel3: string
  deniedCustomText: string
  selectedPainPoint: string
  selectedServices: string[]
  selectedDoCanMang: string[]
  selectedMachineProblem: string
  otherMachineProblem: string
  selectedMoreRequest: string
  otherMoreRequest: string
  orderDate: string
  orderTime: string
  orderSlotId?: number
  branchId?: number
}

export const createDefaultDraftResult = (defaultOrderDate = ''): TelesaleDraftResult => ({
  outcome: 'potential',
  callbackDate: '',
  callbackTime: '14:30',
  note: '',
  deniedLevel1: '',
  deniedLevel2: '',
  deniedLevel3: '',
  deniedCustomText: '',
  selectedPainPoint: '',
  selectedServices: [],
  selectedDoCanMang: [],
  selectedMachineProblem: '',
  otherMachineProblem: '',
  selectedMoreRequest: '',
  otherMoreRequest: '',
  orderDate: defaultOrderDate,
  orderTime: '08:30',
  orderSlotId: undefined,
  branchId: undefined,
})

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
  draftResult?: TelesaleDraftResult
  terminationInfo?: ParsedCallTermination | null
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
  selectedCampaignId: number | null
  selectedCampaignKey: string | null
  drafts: Record<number, TelesaleDraftResult>

  // Actions
  setActiveTabId: (id: number) => void
  setSelectedCampaignId: (campaignId: number | null) => void
  setSelectedCampaignKey: (key: string | null) => void
  setTabs: (
    tabsOrUpdater:
      | TelesaleCallTab[]
      | ((prev: TelesaleCallTab[]) => TelesaleCallTab[]),
  ) => void
  updateTab: (tabId: number, partial: Partial<TelesaleCallTab>) => void
  updateTabDraft: (tabId: number, partialDraft: Partial<TelesaleDraftResult>) => void
  resetTabDraft: (tabId: number, defaultOrderDate?: string) => void
  getTabDraft: (tabId: number) => TelesaleDraftResult
  tickDurations: () => void
  resetTabs: () => void
}

export const useTelesaleCallStore = create<TelesaleCallState>((set, get) => ({
  tabs: initialTabs,
  activeTabId: 1,
  selectedCampaignId: null,
  selectedCampaignKey: null,
  drafts: {
    1: createDefaultDraftResult(),
    2: createDefaultDraftResult(),
    3: createDefaultDraftResult(),
  },

  setActiveTabId: (id: number) => set({ activeTabId: id }),
  setSelectedCampaignId: (id: number | null) => set({ selectedCampaignId: id }),
  setSelectedCampaignKey: (key: string | null) => set({ selectedCampaignKey: key }),

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

  updateTabDraft: (tabId: number, partialDraft: Partial<TelesaleDraftResult>) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [tabId]: {
          ...(state.drafts[tabId] || createDefaultDraftResult()),
          ...partialDraft,
        },
      },
    })),

  resetTabDraft: (tabId: number, defaultOrderDate = '') =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [tabId]: createDefaultDraftResult(defaultOrderDate),
      },
    })),

  getTabDraft: (tabId: number) => {
    return get().drafts[tabId] || createDefaultDraftResult()
  },

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

  resetTabs: () =>
    set({
      tabs: initialTabs,
      activeTabId: 1,
      drafts: {
        1: createDefaultDraftResult(),
        2: createDefaultDraftResult(),
        3: createDefaultDraftResult(),
      },
    }),
}))

export default useTelesaleCallStore

