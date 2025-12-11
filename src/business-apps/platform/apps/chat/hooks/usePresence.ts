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
    // SIMPLIFIED: Trust backend's isOnline status completely
    // Backend is the source of truth for real-time presence
    const status = data.isOnline ? 'online' : 'offline'
    const timestamp = data.timestamp || new Date().toISOString()

    console.log(
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

    // NOTE: If you need 'away' status back, uncomment this code:
    // let status: 'online' | 'away' | 'offline'
    // if (data.isOnline) {
    //   status = 'online'
    // } else {
    //   const lastSeenDate = new Date(timestamp)
    //   const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / (1000 * 60)
    //   if (diffMinutes < 2) status = 'online'
    //   else if (diffMinutes < 15) status = 'away'
    //   else status = 'offline'
    // }
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

    console.log('[usePresence] Registered user_status_change handler')

    return () => {
      if (socket) {
        socket.off('user_status_change', handlePresenceUpdate)
        console.log('[usePresence] Cleaned up user_status_change handler')
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

      // CRITICAL FIX: Always prefer lastSeen calculation over isOnline
      // The isOnline field from API can be stale (cached), but lastSeen is more reliable
      // WebSocket events will override this with real-time data anyway
      if (lastSeen) {
        // Calculate status based on lastSeen timestamp
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
        // Otherwise offline (default)
      } else if (typeof isOnline === 'boolean') {
        // Only use isOnline as last resort if no lastSeen available
        status = isOnline ? 'online' : 'offline'
      }

      console.log(
        `[usePresence] API init: userId=${userId}, status=${status}, isOnline=${isOnline}, lastSeen=${lastSeen}, calculated from lastSeen=${!!lastSeen}`
      )
      updatePresence(userId, { status, lastSeen })
    },
    [updatePresence]
  )

  // Clear all presence data
  // NOTE: This should rarely be called - presence should persist through brief disconnects
  const clearPresence = useCallback(() => {
    console.log('[usePresence] Clearing all presence data')
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
