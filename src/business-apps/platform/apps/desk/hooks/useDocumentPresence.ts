/**
 * useDocumentPresence Hook
 *
 * Tracks active users across documents, spreadsheets, and notes.
 * Shows who is currently viewing/editing each item.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createCollaborationClient, CollaborationClient } from '../../shared/services/CollaborationClient'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

export interface DocumentPresence {
  entityType: 'document' | 'spreadsheet' | 'note'
  entityId: string
  participants: PresenceParticipant[]
}

export interface PresenceParticipant {
  odId: string
  userId: string
  userName: string
  userColor: string
  avatar?: string
}

export interface UseDocumentPresenceReturn {
  /** Map of entityKey (entityType:entityId) -> participants */
  presenceMap: Map<string, PresenceParticipant[]>
  /** Get participants for a specific entity */
  getPresence: (entityType: string, entityId: string) => PresenceParticipant[]
  /** Check if anyone is active in an entity */
  hasActiveUsers: (entityType: string, entityId: string) => boolean
  /** Whether the presence service is connected */
  isConnected: boolean
  /** Fetch presence for a list of entities */
  fetchPresence: (entities: { entityType: string; entityId: string }[]) => void
}

/**
 * GraphQL query to fetch employee avatars by user IDs
 */
const GET_EMPLOYEES_AVATARS = `
  query GetEmployeesAvatars($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
      userId
      pictureThumbnail
    }
  }
`

/**
 * Normalize image src (handles base64, URLs, etc.)
 */
function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw) return undefined

  const value = raw.trim()
  if (!value) return undefined

  // Already a full src
  if (
    value.startsWith('data:') ||
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/')
  ) {
    return value
  }

  // Signature-based mime detection
  if (value.startsWith('UklGR')) return `data:image/webp;base64,${value}`
  if (value.startsWith('iVBOR')) return `data:image/png;base64,${value}`
  if (value.startsWith('/9j/')) return `data:image/jpeg;base64,${value}`
  if (value.startsWith('R0lGOD')) return `data:image/gif;base64,${value}`

  // Generic fallback for base64
  const base64Only = /^[A-Za-z0-9+/=]+$/
  if (base64Only.test(value) && value.length > 64) {
    return `data:image/jpeg;base64,${value}`
  }

  return value
}

/**
 * Hook to track presence across multiple documents
 *
 * @example
 * ```tsx
 * const { getPresence, hasActiveUsers, fetchPresence } = useDocumentPresence()
 *
 * // Fetch presence for search results
 * useEffect(() => {
 *   const entities = searchResults.map(item => ({
 *     entityType: item.type,
 *     entityId: item.id
 *   }))
 *   fetchPresence(entities)
 * }, [searchResults])
 *
 * // In search results
 * {hasActiveUsers('document', item.id) && (
 *   <PresenceIndicator participants={getPresence('document', item.id)} />
 * )}
 * ```
 */
export function useDocumentPresence(): UseDocumentPresenceReturn {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceParticipant[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<CollaborationClient | null>(null)
  const socketRef = useRef<ReturnType<CollaborationClient['connect']> | null>(null)
  const pendingFetchRef = useRef<{ entityType: string; entityId: string }[] | null>(null)
  const avatarCacheRef = useRef<Map<string, string | undefined>>(new Map())
  const tokenRef = useRef<string | null>(null)

  // Get auth token
  useEffect(() => {
    const token =
      localStorage.getItem('business-app-ide-access-token') ||
      localStorage.getItem('keycloak-token') ||
      sessionStorage.getItem('auth_token')

    if (token) {
      tokenRef.current = token
      graphQLClient.setAccessToken(token)
    }
  }, [])

  // Fetch avatars for a list of user IDs
  const fetchAvatars = useCallback(async (userIds: string[]): Promise<Map<string, string | undefined>> => {
    const result = new Map<string, string | undefined>()

    // Check cache first
    const uncachedIds = userIds.filter(id => !avatarCacheRef.current.has(id))

    // Return cached results if all are cached
    if (uncachedIds.length === 0) {
      for (const id of userIds) {
        result.set(id, avatarCacheRef.current.get(id))
      }
      return result
    }

    // Make sure token is set
    if (tokenRef.current) {
      graphQLClient.setAccessToken(tokenRef.current)
    }

    try {
      const response = await graphQLClient.request<{
        Employee: Array<{ userId?: string; pictureThumbnail?: string }>
      }>(GET_EMPLOYEES_AVATARS, { userIds: uncachedIds })

      if (response?.Employee) {
        for (const emp of response.Employee) {
          if (emp.userId) {
            const avatar = normalizeImageSrc(emp.pictureThumbnail)
            avatarCacheRef.current.set(emp.userId, avatar)
            result.set(emp.userId, avatar)
          }
        }
      }

      // Cache undefined for IDs not found
      for (const id of uncachedIds) {
        if (!result.has(id)) {
          avatarCacheRef.current.set(id, undefined)
        }
      }
    } catch (error) {
      console.error('[useDocumentPresence] Failed to fetch avatars:', error)
    }

    // Merge with cached results
    for (const id of userIds) {
      if (!result.has(id)) {
        result.set(id, avatarCacheRef.current.get(id))
      }
    }

    return result
  }, [])

  // Initialize collaboration client
  useEffect(() => {
    const token =
      localStorage.getItem('business-app-ide-access-token') ||
      localStorage.getItem('keycloak-token') ||
      sessionStorage.getItem('auth_token')

    if (!token) {
      console.warn('[useDocumentPresence] No auth token found')
      return
    }

    try {
      const client = createCollaborationClient()
      clientRef.current = client

      const socket = client.connect(token)
      socketRef.current = socket

      socket.on('connect', () => {
        console.log('[useDocumentPresence] Connected to collaboration server')
        setIsConnected(true)

        // If there's a pending fetch, execute it now
        if (pendingFetchRef.current && pendingFetchRef.current.length > 0) {
          fetchPresenceInternal(pendingFetchRef.current)
          pendingFetchRef.current = null
        }
      })

      socket.on('disconnect', () => {
        console.log('[useDocumentPresence] Disconnected from collaboration server')
        setIsConnected(false)
      })

      socket.on('connect_error', error => {
        console.error('[useDocumentPresence] Connection error:', error.message)
      })

      // Listen for individual user join/leave events to update presence in real-time
      socket.on('user_joined', (data: { userId: string; userName: string; userColor: string }) => {
        console.log('[useDocumentPresence] User joined:', data.userName)
      })

      socket.on('user_left', (data: { userId: string }) => {
        // Remove user from all entries in presence map
        setPresenceMap(prev => {
          const newMap = new Map(prev)
          let changed = false
          for (const [key, participants] of newMap) {
            const filtered = participants.filter(p => p.userId !== data.userId && p.odId !== data.userId)
            if (filtered.length !== participants.length) {
              changed = true
              if (filtered.length > 0) {
                newMap.set(key, filtered)
              } else {
                newMap.delete(key)
              }
            }
          }
          return changed ? newMap : prev
        })
      })

      return () => {
        console.log('[useDocumentPresence] Cleaning up...')
        client.disconnect()
        socketRef.current = null
        clientRef.current = null
      }
    } catch (error) {
      console.error('[useDocumentPresence] Failed to initialize:', error)
    }
  }, [])

  // Internal fetch function
  const fetchPresenceInternal = useCallback(
    async (entities: { entityType: string; entityId: string }[]) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        console.warn('[useDocumentPresence] Socket not connected, queuing fetch')
        pendingFetchRef.current = entities
        return
      }

      if (entities.length === 0) {
        return
      }

      console.log('[useDocumentPresence] Fetching presence for', entities.length, 'entities')

      socket.emit(
        'get_multi_presence',
        { entities },
        async (response: { success: boolean; presence?: Record<string, PresenceParticipant[]>; error?: string }) => {
          if (response?.success && response?.presence) {
            console.log(
              '[useDocumentPresence] Received presence data:',
              Object.keys(response.presence).length,
              'entities have active users'
            )

            // Collect all unique user IDs to fetch avatars
            const allUserIds = new Set<string>()
            for (const participants of Object.values(response.presence)) {
              for (const p of participants) {
                if (p.odId) allUserIds.add(p.odId)
                if (p.userId) allUserIds.add(p.userId)
              }
            }

            // Fetch avatars for all users
            let avatarMap = new Map<string, string | undefined>()
            if (allUserIds.size > 0) {
              avatarMap = await fetchAvatars(Array.from(allUserIds))
            }

            // Build presence map with avatars
            const newMap = new Map<string, PresenceParticipant[]>()
            for (const [key, participants] of Object.entries(response.presence)) {
              if (participants && participants.length > 0) {
                const enrichedParticipants = participants.map(p => ({
                  ...p,
                  avatar: avatarMap.get(p.odId) || avatarMap.get(p.userId)
                }))
                newMap.set(key, enrichedParticipants)
              }
            }
            setPresenceMap(newMap)
          } else {
            console.warn('[useDocumentPresence] Failed to fetch presence:', response?.error)
          }
        }
      )
    },
    [fetchAvatars]
  )

  // Public fetch function
  const fetchPresence = useCallback(
    (entities: { entityType: string; entityId: string }[]) => {
      fetchPresenceInternal(entities)
    },
    [fetchPresenceInternal]
  )

  // Get participants for a specific entity
  const getPresence = useCallback(
    (entityType: string, entityId: string): PresenceParticipant[] => {
      const key = `${entityType}:${entityId}`
      return presenceMap.get(key) || []
    },
    [presenceMap]
  )

  // Check if anyone is active in an entity
  const hasActiveUsers = useCallback(
    (entityType: string, entityId: string): boolean => {
      const key = `${entityType}:${entityId}`
      const participants = presenceMap.get(key)
      return !!participants && participants.length > 0
    },
    [presenceMap]
  )

  return {
    presenceMap,
    getPresence,
    hasActiveUsers,
    isConnected,
    fetchPresence
  }
}

export default useDocumentPresence
