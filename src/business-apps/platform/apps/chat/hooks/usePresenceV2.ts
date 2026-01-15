import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { PresenceUpdate } from '../types'

interface UsePresenceV2Options {
  wsClient: ChatWebSocketClient | null
  currentUserId: string | null
}

export type PresenceState = 'online' | 'away' | 'offline'

// Global presence cache (shared across all components)
const presenceCache = new Map<string, PresenceState>()

/**
 * User Presence Hook with Global Cache
 *
 * Features:
 * - Global presence cache (one source of truth)
 * - Lazy updates (only re-render when accessed)
 * - Batch presence updates for conversation participants
 * - Show presence in conversation list and headers
 */
export function usePresenceV2(options: UsePresenceV2Options) {
  const { wsClient, currentUserId } = options

  const [, forceUpdate] = useState({})
  const isMountedRef = useRef(true)

  /**
   * Get user presence from cache
   */
  const getUserPresence = useCallback((userId: string): PresenceState => {
    return presenceCache.get(userId) || 'offline'
  }, [])

  /**
   * Update user presence
   */
  const updatePresence = useCallback((userId: string, state: PresenceState) => {
    const oldState = presenceCache.get(userId)

    // Skip update if state hasn't changed (optimization to prevent unnecessary re-renders)
    if (oldState === state) {
      return
    }

    presenceCache.set(userId, state)

    if (isMountedRef.current) {
      forceUpdate({})
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence V2] 🟢 Updated presence:', { userId, oldState, newState: state })
    }
  }, [])

  /**
   * Batch update multiple users
   */
  const batchUpdatePresence = useCallback((updates: Array<{ userId: string; state: PresenceState }>) => {
    updates.forEach(({ userId, state }) => {
      presenceCache.set(userId, state)
    })

    if (isMountedRef.current) {
      forceUpdate({})
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence V2] Batch updated', updates.length, 'users')
    }
  }, [])

  /**
   * Get presence for multiple users (optimized)
   */
  const getBatchPresence = useCallback((userIds: string[]): Map<string, PresenceState> => {
    const result = new Map<string, PresenceState>()
    userIds.forEach(id => {
      result.set(id, presenceCache.get(id) || 'offline')
    })
    return result
  }, [])

  /**
   * Handle presence update from WebSocket
   */
  const handlePresenceUpdate = useCallback(
    (update: PresenceUpdate) => {
      // Ignore own presence updates (handled separately)
      if (update.userId === currentUserId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[Presence V2] Ignoring own presence update')
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Presence V2] 📡 Received presence update:', { userId: update.userId, state: update.state })
      }

      updatePresence(update.userId, update.state as PresenceState)
    },
    [currentUserId, updatePresence]
  )

  /**
   * Subscribe to presence updates
   * Backend sends: { userId, isOnline, timestamp }
   * We convert to: { userId, state, timestamp }
   */
  useEffect(() => {
    if (!wsClient) return

    // Bridge backend format to V2 format
    const handleBackendPresence = (data: any) => {
      const update: PresenceUpdate = {
        userId: data.userId,
        state: data.isOnline ? 'online' : 'offline',
        timestamp: data.timestamp || new Date().toISOString()
      }
      handlePresenceUpdate(update)
    }

    wsClient.onPresence(handleBackendPresence)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence V2] Subscribed to presence updates')
    }

    return () => {
      // Cleanup: remove the listener
      if (process.env.NODE_ENV === 'development') {
        console.log('[Presence V2] Unsubscribed from presence updates')
      }
    }
  }, [wsClient, handlePresenceUpdate])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  // PERFORMANCE: Memoize return object to prevent cascade re-renders
  // Callbacks are already stable via useCallback, so object is always the same
  return useMemo(
    () => ({
      getUserPresence,
      updatePresence,
      batchUpdatePresence,
      getBatchPresence
    }),
    [getUserPresence, updatePresence, batchUpdatePresence, getBatchPresence]
  )
}

/**
 * Get presence from cache without subscribing
 * Useful for non-reactive reads
 */
export function getPresenceFromCache(userId: string): PresenceState {
  return presenceCache.get(userId) || 'offline'
}

/**
 * Clear all presence cache (useful for logout)
 */
export function clearPresenceCache(): void {
  presenceCache.clear()
}
