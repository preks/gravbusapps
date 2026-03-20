/**
 * useSpacePresence Hook
 *
 * Manages team presence state for the Space.
 * Listens for presence broadcasts from the chat app's WebSocket.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SpaceMember } from '../types/space.types'

export type PresenceState = 'online' | 'offline' | 'away'

export interface MemberPresence {
  userId: string
  state: PresenceState
  lastSeen?: string
}

export interface UseSpacePresenceResult {
  /** Map of user ID to presence state */
  presenceMap: Map<string, MemberPresence>
  /** Number of members currently online */
  onlineCount: number
  /** Total number of members */
  totalCount: number
  /** Get presence for a specific user */
  getMemberPresence: (userId: string) => MemberPresence
  /** Whether we've received presence data from chat */
  hasPresenceData: boolean
}

interface ChatPresenceBroadcast {
  presenceMap: Record<string, { state: 'online' | 'offline'; lastSeen?: string }>
  timestamp: number
}

/**
 * Hook to track team member presence via chat's WebSocket broadcast
 *
 * @param members - Space members to track
 * @returns Presence information for the team
 */
export function useSpacePresence(members: SpaceMember[]): UseSpacePresenceResult {
  const [presenceMap, setPresenceMap] = useState<Map<string, MemberPresence>>(new Map())
  const [hasPresenceData, setHasPresenceData] = useState(false)
  const membersRef = useRef<SpaceMember[]>(members)
  const memberIdsRef = useRef<Set<string>>(new Set())

  // Update members ref when members change
  useEffect(() => {
    membersRef.current = members
    memberIdsRef.current = new Set(members.map(m => m.userId))
  }, [members])

  // Listen for presence broadcasts from the chat app
  useEffect(() => {
    const handlePresenceBroadcast = (event: CustomEvent<ChatPresenceBroadcast>) => {
      const { presenceMap: chatPresence } = event.detail

      if (!chatPresence) return

      setHasPresenceData(true)

      setPresenceMap(prev => {
        const newMap = new Map<string, MemberPresence>()

        // Update presence for all members
        membersRef.current.forEach(member => {
          const chatStatus = chatPresence[member.userId]
          if (chatStatus) {
            newMap.set(member.userId, {
              userId: member.userId,
              state: chatStatus.state,
              lastSeen: chatStatus.lastSeen
            })
          } else {
            // Keep existing state or default to offline
            const existing = prev.get(member.userId)
            newMap.set(member.userId, existing || { userId: member.userId, state: 'offline' })
          }
        })

        return newMap
      })
    }

    // Listen for presence broadcasts from chat app
    window.addEventListener('chat:presence-broadcast' as any, handlePresenceBroadcast)

    return () => {
      window.removeEventListener('chat:presence-broadcast' as any, handlePresenceBroadcast)
    }
  }, [])

  // Initialize presence map with offline state for all members
  useEffect(() => {
    if (members.length === 0) return

    setPresenceMap(prev => {
      const newMap = new Map<string, MemberPresence>()
      members.forEach(member => {
        // Keep existing presence state if available
        const existing = prev.get(member.userId)
        newMap.set(member.userId, existing || { userId: member.userId, state: 'offline' })
      })
      return newMap
    })
  }, [members])

  // Calculate online count
  const onlineCount = Array.from(presenceMap.values()).filter(p => p.state === 'online').length

  // Get presence for a specific member
  const getMemberPresence = useCallback(
    (userId: string): MemberPresence => {
      return presenceMap.get(userId) || { userId, state: 'offline' }
    },
    [presenceMap]
  )

  return {
    presenceMap,
    onlineCount,
    totalCount: members.length,
    getMemberPresence,
    hasPresenceData
  }
}

export default useSpacePresence
