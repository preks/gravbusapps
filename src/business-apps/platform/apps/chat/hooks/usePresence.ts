import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { UserStatus, UserStatusChangeEvent } from '../types'

interface UsePresenceOptions {
  wsClient: ChatWebSocketClient | null
  currentUserId: string | null
}

export type PresenceState = 'online' | 'away' | 'offline'

export interface PresenceData {
  state: PresenceState
  lastSeen?: string // ISO timestamp
  userStatus?: UserStatus // Extended status information
}

// Backward compatibility alias for V1 components
export type UserPresence = PresenceData

// Global presence cache (shared across all components)
// Now stores full presence data including lastSeen timestamp and user status
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
   * Get the entire presence map (for efficient bulk lookups)
   * Returns a stable Map reference that only changes when presence data updates
   */
  const getPresenceMap = useCallback((): ReadonlyMap<string, PresenceData> => {
    return presenceCache
  }, [])

  // Track version for change detection (incremented on batch updates)
  const [presenceVersion, setPresenceVersion] = useState(0)

  /**
   * Update user presence
   */
  const updatePresence = useCallback(
    (userId: string, state: PresenceState, lastSeen?: string, userStatus?: UserStatus) => {
      const oldData = presenceCache.get(userId)

      // Preserve existing userStatus if not provided (backward compatibility)
      const finalUserStatus = userStatus !== undefined ? userStatus : oldData?.userStatus

      // Skip update if nothing has changed
      if (oldData?.state === state && oldData?.lastSeen === lastSeen && oldData?.userStatus === finalUserStatus) {
        return
      }

      const presenceData: PresenceData = {
        state,
        lastSeen: state === 'offline' ? lastSeen : undefined, // Only store lastSeen for offline users
        userStatus: finalUserStatus // Use preserved value if not provided
      }

      presenceCache.set(userId, presenceData)

      setPresenceVersion(v => v + 1)

      if (isMountedRef.current) {
        forceUpdate({})
      }

      if (process.env.NODE_ENV === 'development') {
        // Presence updated
      }
    },
    []
  )

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

      setPresenceVersion(v => v + 1)

      if (isMountedRef.current) {
        forceUpdate({})
      }

      if (process.env.NODE_ENV === 'development') {
        // Batch presence updated
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
   * Subscribe to presence updates
   * Backend sends enhanced format: { userId, status, isSystemStatus, isOnline, timestamp }
   */
  useEffect(() => {
    if (!wsClient) return

    // Handle enhanced user status change events (primary handler)
    const handleUserStatusChange = (data: UserStatusChangeEvent) => {
      // Check if this is the new format (has 'status' field) or old format (only 'isOnline')
      if ('status' in data && data.status) {
        // NEW FORMAT with full status details
        const state = data.isOnline ? 'online' : 'offline'
        const timestampString =
          data.timestamp instanceof Date ? data.timestamp.toISOString() : (data.timestamp as string)

        const userStatus: UserStatus = {
          status: data.status,
          isSystemStatus: data.isSystemStatus,
          statusMessage: data.statusMessage,
          isOnline: data.isOnline
        }

        updatePresence(data.userId, state, timestampString, userStatus)
      } else {
        // OLD FORMAT - just online/offline
        const anyData = data as any
        const state = anyData.isOnline ? 'online' : 'offline'
        const timestampString =
          anyData.timestamp instanceof Date ? anyData.timestamp.toISOString() : (anyData.timestamp as string)

        updatePresence(anyData.userId, state, timestampString, undefined)
      }
    }

    const unsubStatusChange = wsClient.onUserStatusChange(handleUserStatusChange)

    // Request initial status for all online users AFTER socket is connected
    // This prevents "Socket not connected" errors
    const requestInitialStatuses = () => {
      if (!currentUserId) return

      wsClient
        .requestAllStatuses()
        .then(() => {})
        .catch(() => {})
    }

    // Check if socket is already connected
    if (wsClient.isConnected()) {
      // Socket already connected, request immediately
      requestInitialStatuses()
    } else {
      // Socket not connected yet, wait for connect event
      const socket = wsClient.getSocket()
      if (socket) {
        socket.on('connect', requestInitialStatuses)
      }
    }

    return () => {
      unsubStatusChange()
      // Cleanup: remove the connect listener
      const socket = wsClient.getSocket()
      if (socket) {
        socket.off('connect', requestInitialStatuses)
      }
      if (process.env.NODE_ENV === 'development') {
        // Unsubscribed from presence updates
      }
    }
  }, [wsClient, updatePresence, currentUserId])

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
      getPresenceMap,
      updatePresence,
      batchUpdatePresence,
      getBatchPresence,
      presenceVersion
    }),
    [
      getUserPresence,
      getPresenceData,
      getPresenceMap,
      updatePresence,
      batchUpdatePresence,
      getBatchPresence,
      presenceVersion
    ]
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
