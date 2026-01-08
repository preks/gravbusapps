import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { ChatApiClient } from '../services/chatApiClient'
import { debugLog } from '../utils/debugLog'

export type UserPresence = {
  status: 'online' | 'offline'
  lastSeen?: Date | string
}

// Backend sends this format
interface BackendPresenceEvent {
  userId: string
  isOnline: boolean
  timestamp?: Date | string
}

interface UsePresenceOptions {
  wsClient: ChatWebSocketClient | null
  apiClient: ChatApiClient | null
  isConnected: boolean
}

/**
 * Hook to track user presence/online status via chat backend
 * - Listens to WebSocket user_status_change events
 * - Maintains a map of user IDs to their presence status
 * - Provides methods to get presence for specific users
 */
export function usePresence({ wsClient, isConnected }: UsePresenceOptions) {
  // Map of userId -> presence status
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map())
  const presenceMapRef = useRef<Map<string, UserPresence>>(new Map())

  // Keep ref in sync with state
  useEffect(() => {
    presenceMapRef.current = presenceMap
  }, [presenceMap])

  // Handle incoming presence updates from WebSocket
  // Backend sends: { userId, isOnline: boolean, timestamp }
  const handlePresenceUpdate = useCallback((data: BackendPresenceEvent) => {
    // SIMPLIFIED: Trust backend's isOnline status completely
    // Backend is the source of truth for real-time presence
    const status = data.isOnline ? 'online' : 'offline'
    const timestamp = data.timestamp || new Date().toISOString()

    debugLog(
      `[usePresence] WebSocket update: userId=${data.userId}, isOnline=${data.isOnline}, status=${status}, timestamp=${timestamp}`
    )

    setPresenceMap(prev => {
      const newMap = new Map(prev)
      newMap.set(data.userId, {
        status,
        lastSeen: timestamp
      })
      return newMap
    })
  }, [])

  // Setup WebSocket listener for presence events
  useEffect(() => {
    if (!wsClient || !isConnected) {
      return
    }

    // Get the socket directly to register the handler
    const socket = wsClient.getSocket()
    if (!socket) {
      return
    }

    // CRITICAL FIX: Remove ALL existing listeners first to prevent duplicates
    // Socket.IO doesn't deduplicate handlers, so we must manually ensure only one exists
    socket.off('user_status_change')

    // Now add our handler
    socket.on('user_status_change', handlePresenceUpdate)

    debugLog('[usePresence] Registered user_status_change handler')

    return () => {
      if (socket) {
        socket.off('user_status_change', handlePresenceUpdate)
        debugLog('[usePresence] Cleaned up user_status_change handler')
      }
    }
  }, [wsClient, isConnected, handlePresenceUpdate])

  // Get presence for a specific user
  const getUserPresence = useCallback((userId: string): UserPresence => {
    const presence = presenceMapRef.current.get(userId)
    if (presence) {
      return presence
    }
    // Default to offline if we don't have presence info
    return { status: 'offline' }
  }, [])

  // Check if a user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    const presence = presenceMapRef.current.get(userId)
    return presence?.status === 'online'
  }, [])

  // Bulk update presence for multiple users (e.g., when loading conversations)
  const updatePresence = useCallback((userId: string, presence: UserPresence) => {
    setPresenceMap(prev => {
      const newMap = new Map(prev)
      newMap.set(userId, presence)
      return newMap
    })
  }, [])

  // Update presence from user's data (isOnline or lastSeen)
  const updatePresenceFromUser = useCallback(
    (userId: string, lastSeen?: Date | string, isOnline?: boolean) => {
      let status: 'online' | 'offline' = 'offline'

      // Trust backend's isOnline value when provided (backend knows WebSocket connection state)
      if (typeof isOnline === 'boolean') {
        status = isOnline ? 'online' : 'offline'
      }
      // Fallback: Calculate from lastSeen only if isOnline is not provided
      else if (lastSeen) {
        const lastSeenDate = new Date(lastSeen)
        const now = new Date()
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)

        if (diffMinutes < 2) {
          // Seen in last 2 minutes = online
          status = 'online'
        }
        // Otherwise offline (default)
      }

      debugLog(
        `[usePresence] API init: userId=${userId}, status=${status}, isOnline=${isOnline}, lastSeen=${lastSeen}, used isOnline=${typeof isOnline === 'boolean'}`
      )
      updatePresence(userId, { status, lastSeen })
    },
    [updatePresence]
  )

  // Clear all presence data
  // NOTE: This should rarely be called - presence should persist through brief disconnects
  const clearPresence = useCallback(() => {
    debugLog('[usePresence] Clearing all presence data')
    setPresenceMap(new Map())
    presenceMapRef.current = new Map()
  }, [])

  // Version number that increments on every presence change
  // Components can use this to force re-renders when presence changes
  const [presenceVersion, setPresenceVersion] = useState(0)

  // Increment version whenever presenceMap changes
  useEffect(() => {
    setPresenceVersion(v => v + 1)
  }, [presenceMap])

  return {
    presenceMap,
    presenceVersion, // Use this to trigger re-renders: key={presenceVersion}
    getUserPresence,
    isUserOnline,
    updatePresence,
    updatePresenceFromUser,
    clearPresence
  }
}
