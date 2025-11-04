import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '@/lib/store'

describe('Chat Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useChatStore.getState().resetChat()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useChatStore.getState()

      expect(state.sessionId).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.messages).toHaveLength(1) // Initial assistant message
      expect(state.isLoading).toBe(false)
      expect(state.currentStep).toBe(0)
      expect(state.permitData).toEqual({})
      expect(state.selectedTier).toBeNull()
    })

    it('should have initial assistant message', () => {
      const state = useChatStore.getState()
      const initialMessage = state.messages[0]

      expect(initialMessage.role).toBe('assistant')
      expect(initialMessage.content).toContain('property address')
    })

    it('should have correct progress steps', () => {
      const state = useChatStore.getState()

      expect(state.progress).toHaveLength(5)
      expect(state.progress[0].id).toBe('property')
      expect(state.progress[0].status).toBe('current')
      expect(state.progress[1].status).toBe('pending')
    })
  })

  describe('Session Management', () => {
    it('should set session ID', () => {
      const { setSessionId } = useChatStore.getState()

      setSessionId('test-session-123')

      expect(useChatStore.getState().sessionId).toBe('test-session-123')
    })

    it('should set connected status', () => {
      const { setConnected } = useChatStore.getState()

      setConnected(true)

      expect(useChatStore.getState().isConnected).toBe(true)
    })
  })

  describe('Message Management', () => {
    it('should add user message', () => {
      const { addMessage } = useChatStore.getState()

      addMessage({
        role: 'user',
        content: 'Test message',
      })

      const messages = useChatStore.getState().messages
      expect(messages).toHaveLength(2) // Initial + new
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('Test message')
      expect(messages[1].id).toBeDefined()
      expect(messages[1].timestamp).toBeInstanceOf(Date)
    })

    it('should add assistant message', () => {
      const { addMessage } = useChatStore.getState()

      addMessage({
        role: 'assistant',
        content: 'AI response',
      })

      const messages = useChatStore.getState().messages
      expect(messages[1].role).toBe('assistant')
      expect(messages[1].content).toBe('AI response')
    })

    it('should generate unique IDs for messages', () => {
      const { addMessage } = useChatStore.getState()

      addMessage({ role: 'user', content: 'Message 1' })
      addMessage({ role: 'user', content: 'Message 2' })

      const messages = useChatStore.getState().messages
      expect(messages[1].id).not.toBe(messages[2].id)
    })
  })

  describe('Loading State', () => {
    it('should set loading state', () => {
      const { setLoading } = useChatStore.getState()

      setLoading(true)
      expect(useChatStore.getState().isLoading).toBe(true)

      setLoading(false)
      expect(useChatStore.getState().isLoading).toBe(false)
    })
  })

  describe('Progress Management', () => {
    it('should update progress step status', () => {
      const { updateProgress } = useChatStore.getState()

      updateProgress('property', 'completed')

      const progress = useChatStore.getState().progress
      const propertyStep = progress.find((step) => step.id === 'property')

      expect(propertyStep?.status).toBe('completed')
    })

    it('should update current step index when changing status', () => {
      const { updateProgress } = useChatStore.getState()

      // Mark property as completed
      updateProgress('property', 'completed')

      // Mark work as current
      updateProgress('work', 'current')

      const state = useChatStore.getState()
      expect(state.currentStep).toBe(1) // work is at index 1
    })

    it('should keep other steps unchanged', () => {
      const { updateProgress } = useChatStore.getState()

      updateProgress('work', 'completed')

      const progress = useChatStore.getState().progress
      expect(progress[0].status).toBe('current') // property still current
      expect(progress[2].status).toBe('pending') // contractor still pending
    })
  })

  describe('Permit Data Management', () => {
    it('should update permit data', () => {
      const { updatePermitData } = useChatStore.getState()

      updatePermitData({
        propertyAddress: '123 Main St',
        propertyCity: 'Tampa',
      })

      const permitData = useChatStore.getState().permitData
      expect(permitData.propertyAddress).toBe('123 Main St')
      expect(permitData.propertyCity).toBe('Tampa')
    })

    it('should merge permit data updates', () => {
      const { updatePermitData } = useChatStore.getState()

      updatePermitData({ propertyAddress: '123 Main St' })
      updatePermitData({ propertyCity: 'Tampa' })

      const permitData = useChatStore.getState().permitData
      expect(permitData.propertyAddress).toBe('123 Main St')
      expect(permitData.propertyCity).toBe('Tampa')
    })

    it('should overwrite existing fields', () => {
      const { updatePermitData } = useChatStore.getState()

      updatePermitData({ propertyAddress: '123 Main St' })
      updatePermitData({ propertyAddress: '456 Oak Ave' })

      const permitData = useChatStore.getState().permitData
      expect(permitData.propertyAddress).toBe('456 Oak Ave')
    })
  })

  describe('Tier Selection', () => {
    it('should set tier 1', () => {
      const { setTier } = useChatStore.getState()

      setTier(1)

      expect(useChatStore.getState().selectedTier).toBe(1)
    })

    it('should set tier 2', () => {
      const { setTier } = useChatStore.getState()

      setTier(2)

      expect(useChatStore.getState().selectedTier).toBe(2)
    })

    it('should change tier selection', () => {
      const { setTier } = useChatStore.getState()

      setTier(1)
      expect(useChatStore.getState().selectedTier).toBe(1)

      setTier(2)
      expect(useChatStore.getState().selectedTier).toBe(2)
    })
  })

  describe('Reset Chat', () => {
    it('should reset all state to initial values', () => {
      const { addMessage, setSessionId, updatePermitData, setTier, resetChat } =
        useChatStore.getState()

      // Set some state
      setSessionId('test-123')
      addMessage({ role: 'user', content: 'Test' })
      updatePermitData({ propertyAddress: '123 Main St' })
      setTier(1)

      // Reset
      resetChat()

      const state = useChatStore.getState()
      expect(state.sessionId).toBeNull()
      expect(state.messages).toHaveLength(1) // Back to initial message
      expect(state.permitData).toEqual({})
      expect(state.selectedTier).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })
})
