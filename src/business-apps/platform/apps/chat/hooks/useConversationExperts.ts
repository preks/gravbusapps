/**
 * Hook to manage active experts in a conversation
 *
 * Integrates with Chat Service backend for persistence and sync across users
 */

import { useState, useEffect, useCallback } from 'react'
import type { ChatApiClient } from '../services/chatApiClient'
import type { AvailableExpert } from './useEveryExperts'

export interface ActiveExpert {
  expertId: string
  expertName: string
  specialty: string
  avatar?: string
  color?: string
  addedAt: string
  addedBy: string
}

export const useConversationExperts = (
  conversationId: string | null,
  currentUserId: string | null,
  apiClient: ChatApiClient | null,
  availableExperts: AvailableExpert[] // To enrich expert IDs with full data
) => {
  const [activeExperts, setActiveExperts] = useState<ActiveExpert[]>([])

  // Load active experts from backend when conversation changes
  useEffect(() => {
    if (!conversationId || !apiClient) return

    apiClient
      .getActiveExperts(conversationId)
      .then(expertIds => {
        // Enrich IDs with full expert data from available experts
        const enriched: ActiveExpert[] = expertIds
          .map(id => {
            const expert = availableExperts.find(e => e.id === id)
            if (!expert) return null

            return {
              expertId: id,
              expertName: expert.name,
              specialty: expert.specialty,
              avatar: expert.avatar,
              color: expert.color,
              addedAt: new Date().toISOString(), // Backend doesn't track this yet
              addedBy: '' // Backend doesn't track this yet
            }
          })
          .filter((e): e is ActiveExpert => e !== null)

        setActiveExperts(enriched)
      })
      .catch(err => {
        console.error('Failed to load active experts:', err)
      })
  }, [conversationId, apiClient, availableExperts])

  /**
   * Add an expert to the conversation
   */
  const addExpert = useCallback(
    async (expert: AvailableExpert): Promise<boolean> => {
      if (!conversationId || !apiClient || !currentUserId) return false

      // Check if expert already active
      if (activeExperts.some(e => e.expertId === expert.id)) {
        return false
      }

      try {
        // Call backend API
        await apiClient.addExpert(conversationId, expert.id)

        // Optimistically update UI
        const newExpert: ActiveExpert = {
          expertId: expert.id,
          expertName: expert.name,
          specialty: expert.specialty,
          avatar: expert.avatar,
          color: expert.color,
          addedAt: new Date().toISOString(),
          addedBy: currentUserId
        }

        setActiveExperts(prev => [...prev, newExpert])
        return true
      } catch (error) {
        console.error('Failed to add expert:', error)
        return false
      }
    },
    [conversationId, apiClient, activeExperts, currentUserId]
  )

  /**
   * Remove an expert from the conversation
   */
  const removeExpert = useCallback(
    async (expertId: string): Promise<boolean> => {
      if (!conversationId || !apiClient) return false

      try {
        // Call backend API
        await apiClient.removeExpert(conversationId, expertId)

        // Optimistically update UI
        setActiveExperts(prev => prev.filter(e => e.expertId !== expertId))
        return true
      } catch (error) {
        console.error('Failed to remove expert:', error)
        return false
      }
    },
    [conversationId, apiClient]
  )

  /**
   * Check if a specific expert is active
   */
  const isExpertActive = useCallback(
    (expertId: string): boolean => {
      return activeExperts.some(e => e.expertId === expertId)
    },
    [activeExperts]
  )

  /**
   * Get expert by ID
   */
  const getExpert = useCallback(
    (expertId: string): ActiveExpert | undefined => {
      return activeExperts.find(e => e.expertId === expertId)
    },
    [activeExperts]
  )

  return {
    activeExperts,
    addExpert,
    removeExpert,
    isExpertActive,
    getExpert
  }
}
