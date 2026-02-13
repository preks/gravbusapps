import { useState, useEffect, useCallback } from 'react'
import { UserPresenceStatus, UserStatus, UserStatusChangeEvent, SetUserStatusPayload } from '../types'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { rtkDebug } from '../utils/rtkDebug'

interface UseUserStatusOptions {
  client: ChatWebSocketClient | null
  isConnected: boolean
  currentUserId?: string
}

interface UseUserStatusReturn {
  userStatuses: Record<string, UserStatus>
  myStatus: UserStatus | null
  setStatus: (status: UserPresenceStatus, statusMessage?: string, expiresAt?: Date) => Promise<void>
  getUserStatus: (userId: string) => UserStatus | undefined
  loadBulkStatuses: (userIds: string[]) => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useUserStatus({ client, isConnected, currentUserId }: UseUserStatusOptions): UseUserStatusReturn {
  const [userStatuses, setUserStatuses] = useState<Record<string, UserStatus>>({})
  const [myStatus, setMyStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle status change events
  useEffect(() => {
    if (!client || !isConnected) return

    // Listen for initial status on connection
    const unsubInitialized = client.onUserStatusInitialized((data: UserStatus) => {
      setMyStatus(data)
    })

    // Listen for status changes (including our own!)
    const unsubStatusChange = client.onUserStatusChange((data: UserStatusChangeEvent) => {
      const statusUpdate = {
        status: data.status,
        isSystemStatus: data.isSystemStatus,
        statusMessage: data.statusMessage,
        statusMessageExpiresAt: data.statusMessageExpiresAt,
        isOnline: data.isOnline
      }

      // ✅ CRITICAL: Update myStatus if this event is for the current user
      if (currentUserId && data.userId === currentUserId) {
        rtkDebug.log('[useUserStatus] ✅ Received status update for SELF:', statusUpdate)
        setMyStatus(statusUpdate)
      }

      // Also update userStatuses for all users (including self)
      setUserStatuses(prev => ({
        ...prev,
        [data.userId]: statusUpdate
      }))
    })

    return () => {
      unsubInitialized()
      unsubStatusChange()
    }
  }, [client, isConnected, currentUserId])

  // Auto-clear expired status messages (frontend safeguard)
  useEffect(() => {
    if (!myStatus?.statusMessage || !myStatus?.statusMessageExpiresAt) return

    const checkExpiration = () => {
      try {
        const expiresAt = new Date(myStatus.statusMessageExpiresAt!)
        const now = new Date()

        if (expiresAt.getTime() <= now.getTime()) {
          // Status message has expired - clear it locally
          rtkDebug.log('[useUserStatus] ⏰ Status message expired, clearing locally')
          setMyStatus(prev => ({
            ...prev!,
            statusMessage: undefined,
            statusMessageExpiresAt: undefined
          }))
        }
      } catch (error) {
        console.error('[useUserStatus] Error checking expiration:', error)
      }
    }

    // Check immediately
    checkExpiration()

    // Check every 30 seconds
    const interval = setInterval(checkExpiration, 30000)

    return () => clearInterval(interval)
  }, [myStatus?.statusMessage, myStatus?.statusMessageExpiresAt])

  // Set user's manual status
  const setStatus = useCallback(
    async (status: UserPresenceStatus, statusMessage?: string, expiresAt?: Date) => {
      if (!client) {
        setError('Chat client not available')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const payload: SetUserStatusPayload = {
          status,
          statusMessage,
          expiresAt: expiresAt?.toISOString()
        }

        const response = await client.setUserStatus(payload)

        if (response.success && response.status) {
          // Update local my status
          setMyStatus(prev => ({
            ...prev!,
            status: response.status as any,
            isSystemStatus: false,
            statusMessage,
            statusMessageExpiresAt: expiresAt?.toISOString()
          }))
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to set status'
        setError(errorMsg)
        console.error('[useUserStatus] Error setting status:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [client]
  )

  // Get a specific user's status
  const getUserStatus = useCallback(
    (userId: string): UserStatus | undefined => {
      return userStatuses[userId]
    },
    [userStatuses]
  )

  // Load bulk statuses for contact lists
  const loadBulkStatuses = useCallback(
    async (userIds: string[]) => {
      if (!client || userIds.length === 0) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await client.getBulkUserStatuses(userIds)
        setUserStatuses(prev => ({
          ...prev,
          ...response.statuses
        }))
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load statuses'
        setError(errorMsg)
        console.error('[useUserStatus] Error loading bulk statuses:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [client]
  )

  return {
    userStatuses,
    myStatus,
    setStatus,
    getUserStatus,
    loadBulkStatuses,
    isLoading,
    error
  }
}
