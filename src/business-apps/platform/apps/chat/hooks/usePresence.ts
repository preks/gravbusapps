import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { ChatApiClient } from '../services/chatApiClient'

export type UserPresence = {
  status: 'online' | 'away' | 'offline'
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
    setPresenceMap(prev => {
      const newMap = new Map(prev)
      newMap.set(data.userId, {
        status: data.isOnline ? 'online' : 'offline',
        lastSeen: data.timestamp || new Date().toISOString()
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
    if (socket) {
      socket.on('user_status_change', handlePresenceUpdate)
    }

    return () => {
      if (socket) {
        socket.off('user_status_change', handlePresenceUpdate)
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
      let status: 'online' | 'away' | 'offline' = 'offline'

      // If we have explicit isOnline from API, use it directly
      if (typeof isOnline === 'boolean') {
        status = isOnline ? 'online' : 'offline'
      } else if (lastSeen) {
        // Fallback: Calculate status based on lastSeen timestamp
        const lastSeenDate = new Date(lastSeen)
        const now = new Date()
        const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)

        if (diffMinutes < 2) {
          // Seen in last 2 minutes = online
          status = 'online'
        } else if (diffMinutes < 15) {
          // Seen in last 15 minutes = away
          status = 'away'
        }
        // Otherwise offline
      }

      updatePresence(userId, { status, lastSeen })
    },
    [updatePresence]
  )

  // Clear all presence data
  const clearPresence = useCallback(() => {
    setPresenceMap(new Map())
    presenceMapRef.current = new Map()
  }, [])

  return {
    presenceMap,
    getUserPresence,
    isUserOnline,
    updatePresence,
    updatePresenceFromUser,
    clearPresence
  }
}
