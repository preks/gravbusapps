/**
 * useDocumentPresence Hook
 *
 * Tracks active users across documents, spreadsheets, and notes.
 * Shows who is currently viewing/editing each item.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createCollaborationClient, CollaborationClient } from '../../shared/services/CollaborationClient'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

type AvatarCache = Map<string, string | undefined>

function getUncachedIds(cache: AvatarCache, userIds: string[]): string[] {
  return userIds.filter(id => !cache.has(id))
}

function readCachedAvatars(cache: AvatarCache, userIds: string[]): Map<string, string | undefined> {
  const result = new Map<string, string | undefined>()
  for (const id of userIds) {
    if (cache.has(id)) {
      result.set(id, cache.get(id))
    }
  }
  return result
}

function mergeMissingFromCache(
  cache: AvatarCache,
  userIds: string[],
  partial: Map<string, string | undefined>
): Map<string, string | undefined> {
  for (const id of userIds) {
    if (!partial.has(id)) {
      partial.set(id, cache.get(id))
    }
  }
  return partial
}

function removeUserFromPresenceMap(
  prev: Map<string, PresenceParticipant[]>,
  userId: string
): Map<string, PresenceParticipant[]> {
  const next = new Map(prev)
  let changed = false

  for (const [key, participants] of next) {
    const filtered = participants.filter(p => p.userId !== userId && p.odId !== userId)
    if (filtered.length === participants.length) continue

    changed = true
    if (filtered.length > 0) {
      next.set(key, filtered)
    } else {
      next.delete(key)
    }
  }

  return changed ? next : prev
}

function collectUniqueUserIds(presence: Record<string, PresenceParticipant[]>): string[] {
  const ids = new Set<string>()
  for (const participants of Object.values(presence)) {
    for (const p of participants) {
      if (p.odId) ids.add(p.odId)
      if (p.userId) ids.add(p.userId)
    }
  }
  return Array.from(ids)
}

function buildPresenceMapWithAvatars(
  presence: Record<string, PresenceParticipant[]>,
  avatarMap: Map<string, string | undefined>
): Map<string, PresenceParticipant[]> {
  const next = new Map<string, PresenceParticipant[]>()

  for (const [key, participants] of Object.entries(presence)) {
    if (!participants?.length) continue
    next.set(
      key,
      participants.map(p => ({
        ...p,
        avatar: avatarMap.get(p.odId) || avatarMap.get(p.userId)
      }))
    )
  }

  return next
}

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

export interface UseDocumentPresenceOptions {
  /** Access token for authentication */
  accessToken: string | undefined
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
 * const { getPresence, hasActiveUsers, fetchPresence } = useDocumentPresence({ accessToken })
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
export function useDocumentPresence(options: UseDocumentPresenceOptions = {}): UseDocumentPresenceReturn {
  const { accessToken: providedToken } = options
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceParticipant[]>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<CollaborationClient | null>(null)
  const socketRef = useRef<ReturnType<CollaborationClient['connect']> | null>(null)
  const pendingFetchRef = useRef<{ entityType: string; entityId: string }[] | null>(null)
  const avatarCacheRef = useRef<Map<string, string | undefined>>(new Map())
  const tokenRef = useRef<string | null>(null)

  // Set auth token when provided
  useEffect(() => {
    if (providedToken) {
      tokenRef.current = providedToken
      graphQLClient.setAccessToken(providedToken)
    }
  }, [providedToken])

  // Fetch avatars for a list of user IDs
  const fetchAvatars = useCallback(async (userIds: string[]): Promise<Map<string, string | undefined>> => {
    const cache = avatarCacheRef.current
    const cached = readCachedAvatars(cache, userIds)
    const uncachedIds = getUncachedIds(cache, userIds)

    if (uncachedIds.length === 0) {
      return mergeMissingFromCache(cache, userIds, cached)
    }

    if (tokenRef.current) {
      graphQLClient.setAccessToken(tokenRef.current)
    }

    try {
      const response = await graphQLClient.request<{
        Employee: Array<{ userId?: string; pictureThumbnail?: string }>
      }>(GET_EMPLOYEES_AVATARS, { userIds: uncachedIds })

      for (const emp of response?.Employee ?? []) {
        if (!emp.userId) continue
        const avatar = normalizeImageSrc(emp.pictureThumbnail)
        cache.set(emp.userId, avatar)
        cached.set(emp.userId, avatar)
      }

      for (const id of uncachedIds) {
        if (!cache.has(id)) {
          cache.set(id, undefined)
        }
      }
    } catch (error) {
      console.error('[useDocumentPresence] Failed to fetch avatars:', error)
    }

    return mergeMissingFromCache(cache, userIds, cached)
  }, [])

  // Initialize collaboration client - with retry logic
  useEffect(() => {
    let retryCount = 0
    const maxRetries = 3
    let retryTimeout: NodeJS.Timeout | null = null

    const attemptConnection = () => {
      if (!providedToken) {
        console.warn('[useDocumentPresence] No auth token provided, attempt', retryCount + 1)

        // Retry after a delay if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++
          retryTimeout = setTimeout(attemptConnection, 1000 * retryCount)
        }
        return
      }

      const token = providedToken

      console.log('[useDocumentPresence] Attempting to connect')

      try {
        const client = createCollaborationClient()
        clientRef.current = client

        const socket = client.connect(token)
        socketRef.current = socket

        socket.on('connect', () => {
          console.log('[useDocumentPresence] Connected to collaboration server')
          setIsConnected(true)
          retryCount = 0 // Reset retry count on successful connection

          // If there's a pending fetch, execute it now
          if (pendingFetchRef.current && pendingFetchRef.current.length > 0) {
            console.log('[useDocumentPresence] Executing pending fetch for', pendingFetchRef.current.length, 'entities')
            fetchPresenceInternal(pendingFetchRef.current)
            pendingFetchRef.current = null
          }
        })

        socket.on('disconnect', reason => {
          console.log('[useDocumentPresence] Disconnected from collaboration server. Reason:', reason)
          setIsConnected(false)
        })

        socket.on('connect_error', error => {
          console.error('[useDocumentPresence] Connection error:', error.message)

          // Retry connection if we haven't exceeded max retries
          if (retryCount < maxRetries) {
            retryCount++
            console.log('[useDocumentPresence] Retrying connection in', retryCount, 'seconds...')
            retryTimeout = setTimeout(attemptConnection, 1000 * retryCount)
          }
        })

        // Listen for individual user join/leave events to update presence in real-time
        socket.on('user_joined', (data: { userId: string; userName: string; userColor: string }) => {
          console.log('[useDocumentPresence] User joined:', data.userName)
        })

        socket.on('user_left', (data: { userId: string }) => {
          console.log('[useDocumentPresence] User left:', data.userId)
          setPresenceMap(prev => removeUserFromPresenceMap(prev, data.userId))
        })
      } catch (error) {
        console.error('[useDocumentPresence] Failed to initialize:', error)

        // Retry connection if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          retryCount++
          console.log('[useDocumentPresence] Retrying connection in', retryCount, 'seconds...')
          retryTimeout = setTimeout(attemptConnection, 1000 * retryCount)
        }
      }
    }

    // Start connection attempt
    attemptConnection()

    return () => {
      console.log('[useDocumentPresence] Cleaning up...')
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (clientRef.current) {
        clientRef.current.disconnect()
        socketRef.current = null
        clientRef.current = null
      }
    }
  }, [providedToken])

  const handleMultiPresenceResponse = useCallback(
    async (response: { success: boolean; presence?: Record<string, PresenceParticipant[]>; error?: string }) => {
      if (!response?.success || !response.presence) {
        console.warn('[useDocumentPresence] Failed to fetch presence:', response?.error || 'Unknown error')
        return
      }

      const userIds = collectUniqueUserIds(response.presence)
      const avatarMap = userIds.length > 0 ? await fetchAvatars(userIds) : new Map<string, string | undefined>()

      setPresenceMap(buildPresenceMapWithAvatars(response.presence, avatarMap))
    },
    [fetchAvatars]
  )

  // Internal fetch function
  const fetchPresenceInternal = useCallback(
    async (entities: { entityType: string; entityId: string }[]) => {
      const socket = socketRef.current
      if (!socket?.connected) {
        console.warn('[useDocumentPresence] Socket not connected, queuing fetch for', entities.length, 'entities')
        pendingFetchRef.current = entities
        return
      }

      if (entities.length === 0) {
        return
      }

      socket.emit(
        'get_multi_presence',
        { entities },
        (response: { success: boolean; presence?: Record<string, PresenceParticipant[]>; error?: string }) => {
          handleMultiPresenceResponse(response).catch(error => {
            console.error('[useDocumentPresence] Failed to handle presence response:', error)
          })
        }
      )
    },
    [handleMultiPresenceResponse]
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
