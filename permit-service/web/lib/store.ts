import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export type ProgressStep = {
  id: string
  label: string
  status: 'completed' | 'current' | 'pending'
}

export type PermitData = {
  // Property Details
  propertyAddress?: string
  propertyCity?: string
  propertyZip?: string
  parcelNumber?: string

  // Contractor Info
  contractorName?: string
  contractorLicense?: string
  contractorPhone?: string
  contractorEmail?: string

  // Work Description
  workType?: string
  workDescription?: string
  estimatedCost?: number

  // Equipment Details
  equipmentType?: string
  equipmentBrand?: string
  equipmentModel?: string
  equipmentBTU?: number
  equipmentSEER?: number
  equipmentTonnage?: number

  // Owner Info
  ownerName?: string
  ownerPhone?: string
  ownerEmail?: string
}

export type SavedSession = {
  sessionId: string
  messages: Message[]
  permitData: PermitData
  progress: ProgressStep[]
  currentStep: number
  selectedTier: 1 | 2 | null
  lastUpdated: Date
  propertyAddress?: string // For easy identification
}

type ChatState = {
  // Session
  sessionId: string | null
  isConnected: boolean

  // Messages
  messages: Message[]
  isLoading: boolean

  // Progress
  progress: ProgressStep[]
  currentStep: number

  // Permit Data
  permitData: PermitData

  // Selected Tier
  selectedTier: 1 | 2 | null

  // Saved Sessions (for managing multiple permits)
  savedSessions: SavedSession[]

  // Actions
  setSessionId: (id: string) => void
  setConnected: (connected: boolean) => void
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  setLoading: (loading: boolean) => void
  updateProgress: (stepId: string, status: ProgressStep['status']) => void
  updatePermitData: (data: Partial<PermitData>) => void
  setTier: (tier: 1 | 2) => void
  saveCurrentSession: () => void
  loadSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  resetChat: () => void
}

const initialProgress: ProgressStep[] = [
  { id: 'property', label: 'Property Details', status: 'current' },
  { id: 'work', label: 'Work Description', status: 'pending' },
  { id: 'contractor', label: 'Contractor Info', status: 'pending' },
  { id: 'equipment', label: 'Equipment Details', status: 'pending' },
  { id: 'review', label: 'Review & Pay', status: 'pending' },
]

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Hey there! I'm here to help you get your HVAC permit sorted out. This should only take about 5 minutes.\n\nLet's start with the basics - what's the property address where you'll be doing the work?",
    timestamp: new Date(),
  },
]

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionId: null,
      isConnected: false,
      messages: initialMessages,
      isLoading: false,
      progress: initialProgress,
      currentStep: 0,
      permitData: {},
      selectedTier: null,
      savedSessions: [],

      // Actions
      setSessionId: (id) => set({ sessionId: id }),

      setConnected: (connected) => set({ isConnected: connected }),

      addMessage: (message) =>
        set((state) => ({
          messages: [
            ...state.messages,
            {
              ...message,
              id: Date.now().toString() + Math.random(),
              timestamp: new Date(),
            },
          ],
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      updateProgress: (stepId, status) =>
        set((state) => {
          const newProgress = state.progress.map((step) =>
            step.id === stepId ? { ...step, status } : step
          )

          // Update current step index
          const currentStepIndex = newProgress.findIndex(
            (step) => step.status === 'current'
          )

          return {
            progress: newProgress,
            currentStep: currentStepIndex,
          }
        }),

      updatePermitData: (data) =>
        set((state) => ({
          permitData: { ...state.permitData, ...data },
        })),

      setTier: (tier) => set({ selectedTier: tier }),

      saveCurrentSession: () => {
        const state = get()
        if (!state.sessionId) return

        const savedSession: SavedSession = {
          sessionId: state.sessionId,
          messages: state.messages,
          permitData: state.permitData,
          progress: state.progress,
          currentStep: state.currentStep,
          selectedTier: state.selectedTier,
          lastUpdated: new Date(),
          propertyAddress: state.permitData.propertyAddress || 'Unnamed Application',
        }

        set((s) => ({
          savedSessions: [
            savedSession,
            ...s.savedSessions.filter((session) => session.sessionId !== state.sessionId),
          ].slice(0, 10), // Keep only 10 most recent
        }))
      },

      loadSession: (sessionId) => {
        const state = get()
        const session = state.savedSessions.find((s) => s.sessionId === sessionId)

        if (session) {
          set({
            sessionId: session.sessionId,
            messages: session.messages,
            permitData: session.permitData,
            progress: session.progress,
            currentStep: session.currentStep,
            selectedTier: session.selectedTier,
          })
        }
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          savedSessions: state.savedSessions.filter((s) => s.sessionId !== sessionId),
        }))
      },

      resetChat: () =>
        set({
          sessionId: null,
          isConnected: false,
          messages: initialMessages,
          isLoading: false,
          progress: initialProgress,
          currentStep: 0,
          permitData: {},
          selectedTier: null,
        }),
    }),
    {
      name: 'chat-storage',
      // Persist everything so contractors can resume their work
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages,
        permitData: state.permitData,
        selectedTier: state.selectedTier,
        progress: state.progress,
        currentStep: state.currentStep,
        savedSessions: state.savedSessions,
      }),
    }
  )
)
