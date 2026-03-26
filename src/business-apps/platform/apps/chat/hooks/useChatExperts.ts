/**
 * Comprehensive Chat Experts Management Hook
 *
 * Combines all expert-related functionality:
 * - Loading available experts
 * - Managing active experts in conversation
 * - Routing messages to experts
 * - Handling expert responses
 *
 * Used by Chat.tsx with minimal integration points
 */

import { useState, useCallback } from 'react'
import { useEveryExperts } from './useEveryExperts'
import { useConversationExperts } from './useConversationExperts'
import { useExpertRouting, type ExpertAttachment } from './useExpertRouting'
import { detectExpertMention } from '../utils/expertMentionUtils'
import type { MessageEntityReference } from '../types'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import type { AvailableExpert } from './useEveryExperts'

export interface UseChatExpertsOptions {
  accessToken: string
  conversationId: string | null
  currentUserId: string | null
  apiClient: ChatClient | null
}

export const useChatExperts = ({ accessToken, conversationId, currentUserId, apiClient }: UseChatExpertsOptions) => {
  // Load all available Every Experts
  const { experts: availableExperts, isLoading: expertsLoading, reload: reloadExperts } = useEveryExperts(accessToken)

  // Manage active experts in current conversation
  const {
    activeExperts,
    addExpert: addExpertToConversation,
    removeExpert: removeExpertFromConversation,
    isExpertActive,
    getExpert
  } = useConversationExperts(conversationId, currentUserId, apiClient, availableExperts)

  // Expert routing
  const { sendToExpert } = useExpertRouting({ accessToken })

  // UI state
  const [showExpertSelector, setShowExpertSelector] = useState(false)

  /**
   * Add an expert to the conversation with welcome message
   */
  const addExpert = useCallback(
    async (
      expert: AvailableExpert,
      sendMessage: (conversationId: string, content: string, metadata?: Record<string, any>) => Promise<void>
    ): Promise<boolean> => {
      if (!conversationId) return false

      const success = await addExpertToConversation(expert)

      if (success) {
        // Send welcome message from the expert
        const welcomeMessage = `Hi! I'm **${expert.name}**, your ${expert.specialty}. Mention me with @${expert.name.replace(/\s+/g, '')} to ask questions within my area of expertise.`

        await sendMessage(conversationId, welcomeMessage, {
          isEveryExpertResponse: true,
          expertId: expert.id,
          expertName: expert.name,
          expertColor: expert.color,
          isWelcomeMessage: true
        })

        setShowExpertSelector(false)
      }

      return success
    },
    [conversationId, addExpertToConversation]
  )

  /**
   * Remove an expert from the conversation with goodbye message
   */
  const removeExpert = useCallback(
    async (
      expertId: string,
      sendMessage: (conversationId: string, content: string, metadata?: Record<string, any>) => Promise<void>
    ): Promise<boolean> => {
      if (!conversationId) return false

      const expert = getExpert(expertId)
      const success = await removeExpertFromConversation(expertId)

      if (success && expert) {
        // Send goodbye message
        const goodbyeMessage = `${expert.expertName} has left the conversation.`

        await sendMessage(conversationId, goodbyeMessage, {
          isSystemMessage: true
        })
      }

      return success
    },
    [conversationId, getExpert, removeExpertFromConversation]
  )

  /**
   * Process message to detect expert mentions and route accordingly
   * Returns the expert's response if routed, null otherwise
   * @param content - The message content
   * @param entityReferences - Entity references (mentions) in the message
   * @param attachments - Optional attachments from the message to pass to the expert
   */
  const processExpertMention = useCallback(
    async (
      content: string,
      entityReferences?: MessageEntityReference[],
      attachments?: ExpertAttachment[]
    ): Promise<{
      isExpertMention: boolean
      expertResponse?: {
        text: string
        expertId: string
        expertName: string
        expertColor?: string
        citations?: any[]
        confidence?: number
      }
    }> => {
      // Detect expert mention
      const mention = detectExpertMention(content, entityReferences, activeExperts)

      if (!mention.isExpertMention || !mention.expertId) {
        return { isExpertMention: false }
      }

      // Get expert details
      const expert = getExpert(mention.expertId)
      if (!expert) {
        return { isExpertMention: false }
      }

      try {
        // Route to expert's prompt with attachments
        const response = await sendToExpert(mention.prompt, expert, attachments)

        if (response.error) {
          return { isExpertMention: false }
        }

        return {
          isExpertMention: true,
          expertResponse: {
            text: response.text,
            expertId: expert.expertId,
            expertName: expert.expertName,
            expertColor: expert.color,
            citations: response.citations,
            confidence: response.confidence
          }
        }
      } catch (error) {
        console.error('Error processing expert mention:', error)
        return { isExpertMention: false }
      }
    },
    [activeExperts, getExpert, sendToExpert]
  )

  return {
    // Available experts
    availableExperts,
    expertsLoading,
    reloadExperts,

    // Active experts in conversation
    activeExperts,
    isExpertActive,
    getExpert,

    // Actions
    addExpert,
    removeExpert,
    processExpertMention,

    // UI state
    showExpertSelector,
    setShowExpertSelector
  }
}
