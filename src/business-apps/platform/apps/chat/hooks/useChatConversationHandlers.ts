/**
 * Conversation list and modal handlers: create, select, back, close, remove,
 * create group, group settings, nudge.
 */

import { startTransition, useCallback } from 'react'
import type { Conversation, User } from '../types'
import type { DimensionContext } from '../components/CreateGroupModal'

export interface UseChatConversationHandlersParams {
  setActiveConversation: (conv: Conversation | null) => void
  setShowConversationList: (show: boolean) => void
  setShowCreateGroupModal: (show: boolean) => void
  setShowGroupSettingsModal: (show: boolean) => void
  setErrorMessage: (msg: string | null) => void
  conversationIdFromUrlProcessed: React.MutableRefObject<boolean>
  apiClient: { markAsRead: (conversationId: string) => Promise<unknown> } | null
  createDirectConversation: (userId: string) => Promise<Conversation | null>
  createGroupConversation: (
    name: string,
    participantIds: string[],
    description?: string,
    avatarUrl?: string,
    dimensionType?: string,
    dimensionId?: string
  ) => Promise<Conversation | null>
  closeConversation: (conversationId: string) => Promise<unknown>
  viewMode: string
  activeConversation: Conversation | null
  currentUser: User | null
  sendNudge: (conversationId: string, userId: string) => boolean
  refreshConversations?: () => void
  t: (key: string, params?: Record<string, unknown>) => string
  lastNudgeTimeRef: React.MutableRefObject<number>
  NUDGE_COOLDOWN_MS: number
}

export interface UseChatConversationHandlersReturn {
  handleCreateConversation: (user: User) => Promise<void>
  handleConversationSelect: (conversation: Conversation) => void
  handleBack: () => void
  handleCloseConversation: () => void
  handleRemoveConversation: (conversationId: string) => Promise<void>
  handleCreateGroup: () => void
  handleCreateGroupSubmit: (
    name: string,
    participantIds: string[],
    description?: string,
    dimensionContext?: DimensionContext
  ) => Promise<void>
  handleShowGroupSettings: () => void
  handleCloseGroupSettings: () => void
  handleNudge: () => void
}

export function useChatConversationHandlers({
  setActiveConversation,
  setShowConversationList,
  setShowCreateGroupModal,
  setShowGroupSettingsModal,
  setErrorMessage,
  conversationIdFromUrlProcessed,
  apiClient,
  createDirectConversation,
  createGroupConversation,
  closeConversation,
  viewMode,
  activeConversation,
  currentUser,
  sendNudge,
  refreshConversations,
  t,
  lastNudgeTimeRef,
  NUDGE_COOLDOWN_MS
}: UseChatConversationHandlersParams): UseChatConversationHandlersReturn {
  const handleCreateConversation = useCallback(
    async (user: User) => {
      try {
        conversationIdFromUrlProcessed.current = true
        const conversation = await createDirectConversation(user.id)
        setShowConversationList(false)
        if (conversation?.id) {
          const url = new URL(globalThis.location.href)
          url.searchParams.set('conversationId', conversation.id)
          globalThis.history.replaceState({}, '', url.toString())
        }
      } catch {
        setErrorMessage(t('chat-failedToCreateConversation'))
      }
    },
    [createDirectConversation, setShowConversationList, conversationIdFromUrlProcessed, setErrorMessage, t]
  )

  const handleConversationSelect = useCallback(
    (conversation: Conversation) => {
      conversationIdFromUrlProcessed.current = true
      startTransition(() => {
        setActiveConversation(conversation)
        setShowConversationList(false)
        const url = new URL(globalThis.location.href)
        url.searchParams.set('conversationId', conversation.id)
        globalThis.history.replaceState({}, '', url.toString())
        if (apiClient && (conversation.unreadCount ?? 0) > 0) {
          apiClient.markAsRead(conversation.id).catch(error => {
            console.error('[Chat] Failed to mark conversation as read:', error)
          })
        }
      })
    },
    [setActiveConversation, setShowConversationList, apiClient, conversationIdFromUrlProcessed]
  )

  const handleBack = useCallback(() => {
    setShowConversationList(true)
    setActiveConversation(null)
    refreshConversations?.()
    const url = new URL(globalThis.location.href)
    url.searchParams.delete('conversationId')
    globalThis.history.replaceState({}, '', url.toString())
  }, [setActiveConversation, setShowConversationList, refreshConversations])

  const handleCloseConversation = useCallback(() => {
    setActiveConversation(null)
    if (viewMode !== 'full') {
      setShowConversationList(true)
      refreshConversations?.()
    }
    const url = new URL(globalThis.location.href)
    url.searchParams.delete('conversationId')
    globalThis.history.replaceState({}, '', url.toString())
  }, [setActiveConversation, viewMode, setShowConversationList, refreshConversations])

  const handleRemoveConversation = useCallback(
    async (conversationId: string) => {
      try {
        setErrorMessage(null)
        await closeConversation(conversationId)
        if (viewMode !== 'full') {
          setShowConversationList(true)
        }
        const url = new URL(globalThis.location.href)
        url.searchParams.delete('conversationId')
        globalThis.history.replaceState({}, '', url.toString())
      } catch (error: unknown) {
        const errorMsg =
          (error as { response?: { data?: { message?: string }; message?: string }; message?: string })?.response?.data
            ?.message ||
          (error as { message?: string })?.message ||
          ''
        if (errorMsg.toLowerCase().includes('last owner')) {
          setErrorMessage(t('chat-cannotLeaveAsLastOwner'))
          setShowGroupSettingsModal(true)
        } else {
          setErrorMessage(t('chat-failedToLeave'))
        }
      }
    },
    [closeConversation, viewMode, setShowConversationList, setErrorMessage, setShowGroupSettingsModal, t]
  )

  const handleCreateGroup = useCallback(() => {
    setShowCreateGroupModal(true)
  }, [setShowCreateGroupModal])

  const handleCreateGroupSubmit = useCallback(
    async (name: string, participantIds: string[], description?: string, dimensionContext?: DimensionContext) => {
      try {
        conversationIdFromUrlProcessed.current = true
        const conversation = await createGroupConversation(
          name,
          participantIds,
          description,
          undefined,
          dimensionContext?.type,
          dimensionContext?.id
        )
        setShowCreateGroupModal(false)
        if (conversation?.id) {
          setActiveConversation(conversation)
          setShowConversationList(false)
          refreshConversations?.()
          const url = new URL(globalThis.location.href)
          url.searchParams.set('conversationId', conversation.id)
          globalThis.history.replaceState({}, '', url.toString())
        }
      } catch (error) {
        throw error
      }
    },
    [
      createGroupConversation,
      setShowCreateGroupModal,
      setActiveConversation,
      setShowConversationList,
      refreshConversations,
      conversationIdFromUrlProcessed
    ]
  )

  const handleShowGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(true)
  }, [setShowGroupSettingsModal])

  const handleCloseGroupSettings = useCallback(() => {
    setShowGroupSettingsModal(false)
    refreshConversations?.()
  }, [setShowGroupSettingsModal, refreshConversations])

  const handleNudge = useCallback(() => {
    if (!activeConversation || activeConversation?.type !== 'direct' || !currentUser) return
    const now = Date.now()
    const timeSinceLastNudge = now - lastNudgeTimeRef.current
    if (timeSinceLastNudge < NUDGE_COOLDOWN_MS) {
      const secondsRemaining = Math.ceil((NUDGE_COOLDOWN_MS - timeSinceLastNudge) / 1000)
      setErrorMessage(t('chat-nudgeCooldown', { seconds: secondsRemaining }))
      setTimeout(() => setErrorMessage(null), 3000)
      return
    }
    const otherParticipant = activeConversation.participants?.find(
      p => p.userId !== currentUser.id && p.user?.id !== currentUser.id
    )
    if (!otherParticipant?.userId) return
    const success = sendNudge(activeConversation.id, otherParticipant.userId)
    if (success) lastNudgeTimeRef.current = now
  }, [activeConversation, currentUser, sendNudge, setErrorMessage, t, lastNudgeTimeRef, NUDGE_COOLDOWN_MS])

  return {
    handleCreateConversation,
    handleConversationSelect,
    handleBack,
    handleCloseConversation,
    handleRemoveConversation,
    handleCreateGroup,
    handleCreateGroupSubmit,
    handleShowGroupSettings,
    handleCloseGroupSettings,
    handleNudge
  }
}
