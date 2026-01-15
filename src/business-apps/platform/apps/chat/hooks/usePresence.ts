import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { PresenceUpdate } from '../types'

interface UsePresenceOptions {
  wsClient: ChatWebSocketClient | null
  currentUserId: string | null
}

export type PresenceState = 'online' | 'away' | 'offline'

export interface PresenceData {
  state: PresenceState
  lastSeen?: string // ISO timestamp
}

// Backward compatibility alias for V1 components
export type UserPresence = {
  status: PresenceState
  lastSeen?: Date | string
}

// Global presence cache (shared across all components)
// Now stores full presence data including lastSeen timestamp
const presenceCache = new Map<string, PresenceData>()

/**
 * User Presence Hook with Global Cache
 *
 * Features:
 * - Global presence cache (one source of truth)
 * - Lazy updates (only re-render when accessed)
 * - Batch presence updates for conversation participants
 * - Show presence in conversation list and headers
 */
export function usePresence(options: UsePresenceOptions) {
  const { wsClient, currentUserId } = options

  const [, forceUpdate] = useState({})
  const isMountedRef = useRef(true)

  /**
   * Get user presence from cache
   */
  const getUserPresence = useCallback((userId: string): PresenceState => {
    return presenceCache.get(userId)?.state || 'offline'
  }, [])

  /**
   * Get full presence data (including lastSeen)
   */
  const getPresenceData = useCallback((userId: string): PresenceData => {
    return presenceCache.get(userId) || { state: 'offline' }
  }, [])

  /**
   * Update user presence
   */
  const updatePresence = useCallback((userId: string, state: PresenceState, lastSeen?: string) => {
    const oldData = presenceCache.get(userId)

    // Skip update if state hasn't changed (optimization to prevent unnecessary re-renders)
    if (oldData?.state === state && oldData?.lastSeen === lastSeen) {
      return
    }

    const presenceData: PresenceData = {
      state,
      lastSeen: state === 'offline' ? lastSeen : undefined // Only store lastSeen for offline users
    }

    presenceCache.set(userId, presenceData)

    if (isMountedRef.current) {
      forceUpdate({})
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence] 🟢 Updated presence:', {
        userId,
        oldState: oldData?.state,
        newState: state,
        lastSeen
      })
    }
  }, [])

  /**
   * Batch update multiple users
   */
  const batchUpdatePresence = useCallback(
    (updates: Array<{ userId: string; state: PresenceState; lastSeen?: string }>) => {
      updates.forEach(({ userId, state, lastSeen }) => {
        const presenceData: PresenceData = {
          state,
          lastSeen: state === 'offline' ? lastSeen : undefined
        }
        presenceCache.set(userId, presenceData)
      })

      if (isMountedRef.current) {
        forceUpdate({})
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Presence] Batch updated', updates.length, 'users')
      }
    },
    []
  )

  /**
   * Get presence for multiple users (optimized)
   */
  const getBatchPresence = useCallback((userIds: string[]): Map<string, PresenceState> => {
    const result = new Map<string, PresenceState>()
    userIds.forEach(id => {
      result.set(id, presenceCache.get(id)?.state || 'offline')
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
          console.log('[Presence] Ignoring own presence update')
        }
        return
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[Presence] 📡 Received presence update:', {
          userId: update.userId,
          state: update.state,
          timestamp: update.timestamp
        })
      }

      // Convert timestamp to string if it's a Date object
      const timestampString = update.timestamp instanceof Date ? update.timestamp.toISOString() : update.timestamp

      updatePresence(update.userId, update.state as PresenceState, timestampString)
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
      // TRACK BACKEND DATA
      console.log('[Presence] 🔍 RAW Backend presence data:', data)

      const update: PresenceUpdate = {
        userId: data.userId,
        state: data.isOnline ? 'online' : 'offline',
        timestamp: data.timestamp || new Date().toISOString()
      }

      console.log('[Presence] 📦 Converted to PresenceUpdate:', update)

      handlePresenceUpdate(update)
    }

    wsClient.onPresence(handleBackendPresence)

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence] Subscribed to presence updates')
    }

    return () => {
      // Cleanup: remove the listener
      if (process.env.NODE_ENV === 'development') {
        console.log('[Presence] Unsubscribed from presence updates')
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
      getPresenceData,
      updatePresence,
      batchUpdatePresence,
      getBatchPresence
    }),
    [getUserPresence, getPresenceData, updatePresence, batchUpdatePresence, getBatchPresence]
  )
}

/**
 * Get presence from cache without subscribing
 * Useful for non-reactive reads
 */
export function getPresenceFromCache(userId: string): PresenceState {
  return presenceCache.get(userId)?.state || 'offline'
}

/**
 * Get full presence data from cache
 */
export function getPresenceDataFromCache(userId: string): PresenceData {
  return presenceCache.get(userId) || { state: 'offline' }
}

/**
 * Clear all presence cache (useful for logout)
 */
export function clearPresenceCache(): void {
  presenceCache.clear()
}
