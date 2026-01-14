import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocketV2 } from './useWebSocketV2'
import type { PresenceUpdate } from '../types'

interface UsePresenceV2Options {
  accessToken: string
  wsUrl: string
  wsSocketPath?: string
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
  const { accessToken, wsUrl, wsSocketPath, currentUserId } = options

  const [, forceUpdate] = useState({})
  const isMountedRef = useRef(true)

  // Initialize WebSocket
  const ws = useWebSocketV2({
    accessToken,
    wsUrl,
    wsSocketPath
  })

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
    presenceCache.set(userId, state)

    if (isMountedRef.current) {
      forceUpdate({})
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence V2] Updated presence:', { userId, state })
    }
  }, [])

  /**
   * Batch update presence for multiple users
   */
  const batchUpdatePresence = useCallback((updates: Array<{ userId: string; state: PresenceState }>) => {
    updates.forEach(({ userId, state }) => {
      presenceCache.set(userId, state)
    })

    if (isMountedRef.current) {
      forceUpdate({})
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Presence V2] Batch updated presence:', updates.length, 'users')
    }
  }, [])

  /**
   * Get presence for multiple users
   */
  const getBatchPresence = useCallback((userIds: string[]): Map<string, PresenceState> => {
    const result = new Map<string, PresenceState>()
    userIds.forEach(userId => {
      result.set(userId, presenceCache.get(userId) || 'offline')
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
        return
      }

      updatePresence(update.userId, update.state as PresenceState)
    },
    [currentUserId, updatePresence]
  )

  /**
   * Subscribe to presence updates
   */
  useEffect(() => {
    if (!ws.client) return

    ws.on('presence:update', handlePresenceUpdate)

    return () => {
      ws.off('presence:update', handlePresenceUpdate)
    }
  }, [ws, handlePresenceUpdate])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return {
    getUserPresence,
    updatePresence,
    batchUpdatePresence,
    getBatchPresence,
    isConnected: ws.isConnected
  }
}

/**
 * Get presence cache stats (for debugging)
 */
export function getPresenceCacheStats() {
  const entries = Array.from(presenceCache.entries())
  return {
    total: entries.length,
    online: entries.filter(([, state]) => state === 'online').length,
    away: entries.filter(([, state]) => state === 'away').length,
    offline: entries.filter(([, state]) => state === 'offline').length
  }
}

/**
 * Clear presence cache (for testing)
 */
export function clearPresenceCache() {
  presenceCache.clear()
}
