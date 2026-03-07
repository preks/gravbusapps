/**
 * Syncs presence map to parent, active calls to parent, clears presence init on disconnect,
 * and optionally initializes presence from conversation participants.
 */

import { useEffect, useRef } from 'react'

export interface PresenceInfoSimple {
  state: 'online' | 'offline'
  lastSeen?: string
}

export interface UseChatPresenceSyncParams {
  presenceMap: ReadonlyMap<string, { state: string; lastSeen?: string }> | undefined
  presenceVersion: number
  onPresenceMapChange?: (presenceMap: Map<string, PresenceInfoSimple>) => void
  activeCalls: Record<string, unknown> | undefined
  onActiveCallsChange?: (activeCalls: Record<string, unknown>) => void
  isConnected: boolean
  presenceInitializedUsersRef: React.MutableRefObject<Set<string>>
  conversations?: Array<{
    participants?: Array<{
      user?: {
        id: string
        userId?: string
        lastSeen?: string | Date
        lastSeenAt?: string | Date
        isOnline?: boolean
        isActive?: boolean
        currentStatus?: unknown
        isSystemStatus?: boolean
        statusMessage?: string
      }
    }>
  }>
  currentUserId?: string | null
  updatePresence?: (
    userId: string,
    presenceStatus: { state: 'online' | 'offline'; lastSeen?: string; userStatus?: unknown }
  ) => void
}

export function useChatPresenceSync({
  presenceMap,
  presenceVersion,
  onPresenceMapChange,
  activeCalls,
  onActiveCallsChange,
  isConnected,
  presenceInitializedUsersRef,
  conversations,
  currentUserId,
  updatePresence
}: UseChatPresenceSyncParams): void {
  // Notify parent when presence map changes
  useEffect(() => {
    if (presenceMap) {
      const simplifiedMap = new Map<string, PresenceInfoSimple>()
      presenceMap.forEach((value, key) => {
        const state: 'online' | 'offline' = value.state === 'online' ? 'online' : 'offline'
        simplifiedMap.set(key, { state, lastSeen: value.lastSeen })
      })
      if (onPresenceMapChange) {
        onPresenceMapChange(simplifiedMap)
      }
      globalThis.dispatchEvent(
        new CustomEvent('chat:presence-broadcast', {
          detail: { presenceMap: Object.fromEntries(simplifiedMap), timestamp: Date.now() }
        })
      )
    }
  }, [presenceMap, presenceVersion, onPresenceMapChange])

  // Notify parent of active calls changes
  useEffect(() => {
    if (onActiveCallsChange && activeCalls) {
      onActiveCallsChange(activeCalls)
    }
  }, [activeCalls, onActiveCallsChange])

  // Clear presence init tracking when connection drops (500ms delay for remount resilience)
  const isConnectedRef = useRef(isConnected)
  useEffect(() => {
    isConnectedRef.current = isConnected
  }, [isConnected])

  useEffect(() => {
    if (!isConnected) {
      const timeout = setTimeout(() => {
        if (!isConnectedRef.current) {
          presenceInitializedUsersRef.current.clear()
        }
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [isConnected, presenceInitializedUsersRef])

  // Initialize presence from conversation participants (once per user, then rely on WS)
  useEffect(() => {
    try {
      if (!conversations?.length || !updatePresence) return
      conversations.forEach(conv => {
        conv.participants?.forEach(p => {
          const user = p.user
          if (!user || user.id === currentUserId || user.userId === currentUserId) return
          const userId = user.id
          if (presenceInitializedUsersRef.current.has(userId)) return
          presenceInitializedUsersRef.current.add(userId)
          const lastSeen = user.lastSeen ?? user.lastSeenAt
          const isOnline =
            typeof user.isOnline === 'boolean' ? user.isOnline : 'isActive' in user ? Boolean(user.isActive) : false
          const state = isOnline ? 'online' : 'offline'
          const lastSeenString = lastSeen instanceof Date ? lastSeen.toISOString() : (lastSeen as string | undefined)
          const userStatus = user.currentStatus
            ? {
                status: user.currentStatus,
                isSystemStatus: user.isSystemStatus ?? false,
                statusMessage: user.statusMessage,
                isOnline: isOnline ?? false
              }
            : undefined
          updatePresence(userId, { state, lastSeen: lastSeenString, userStatus })
        })
      })
    } catch (error) {
      console.error('[Chat] Error initializing presence:', error)
    }
  }, [conversations, currentUserId, updatePresence, presenceInitializedUsersRef])
}
