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
    // Clear experts immediately when conversation changes or becomes null
    // This prevents showing experts from previous conversation
    if (!conversationId || !apiClient) {
      setActiveExperts([])
      return
    }

    // Clear experts immediately when switching to a new conversation
    setActiveExperts([])

    // Track if this effect is still relevant (prevent race conditions)
    let isCurrent = true

    apiClient
      .getActiveExperts(conversationId)
      .then(expertIds => {
        // Only update state if this conversation is still active
        // This prevents race condition where old API call finishes after new one
        if (!isCurrent) {
          return
        }

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
      .catch(() => {
        // Only clear experts if this request is still current
        if (isCurrent) {
          setActiveExperts([])
        }
      })

    // Cleanup: mark this effect as stale when conversation changes
    return () => {
      isCurrent = false
    }
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
      } catch {
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
      } catch {
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
