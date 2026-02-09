/**
 * useSpaceDocumentActivity Hook
 *
 * Tracks real-time document activity within a Space.
 * Uses both:
 * - BroadcastChannel for cross-tab communication (instant local feedback)
 * - WebSocket collaboration service for server-tracked presence (cross-browser/device)
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createCollaborationClient, CollaborationClient } from '../../shared/services/CollaborationClient'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { SpaceContentItem } from '../types/space.types'

export type ActivityType = 'editing' | 'viewing'
export type DocumentType = 'document' | 'note' | 'spreadsheet' | 'slide'

export interface DocumentActivity {
  /** Unique key for this activity (userId + documentId) */
  key: string
  /** User performing the activity */
  userId: string
  userName: string
  userAvatar?: string
  /** Where this activity came from (internal) */
  source?: 'presence' | 'broadcast'
  /** Document being worked on */
  documentId: string
  documentTitle: string
  documentType: DocumentType
  /** Type of activity */
  activityType: ActivityType
  /** When the activity started */
  startedAt: Date
  /** When the activity was last updated */
  lastUpdatedAt: Date
}

export interface UseSpaceDocumentActivityResult {
  /** Current active activities */
  activities: DocumentActivity[]
  /** Whether there are any active activities */
  hasActivity: boolean
  /** Whether the WebSocket presence service is connected */
  isPresenceConnected: boolean
}

/** Event payload for document activity */
export interface DocumentActivityEvent {
  userId: string
  userName: string
  userAvatar?: string
  documentId: string
  documentTitle: string
  documentType: DocumentType
  activityType: ActivityType
  spaceId?: string
}

// Activity timeout (remove after 60 seconds of no updates)
const ACTIVITY_TIMEOUT_MS = 60000

// BroadcastChannel name for cross-tab activity communication
const ACTIVITY_CHANNEL_NAME = 'newwork-document-activity'

const DEBUG_ACTIVITY_STORAGE_KEY = 'gba:debug:space-activity'

// Interval for fetching presence updates (every 10 seconds)
const PRESENCE_FETCH_INTERVAL_MS = 10000

// Maximum number of entities to fetch presence for at once (to avoid huge requests)
const MAX_PRESENCE_BATCH_SIZE = 50

// Singleton channel for broadcasting activity
let activityChannel: BroadcastChannel | null = null

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

function isActivityDebugEnabled(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(DEBUG_ACTIVITY_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function getActivityChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null
  }
  if (!activityChannel) {
    activityChannel = new BroadcastChannel(ACTIVITY_CHANNEL_NAME)
  }
  return activityChannel
}

function parseMaybeDate(value: unknown): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date && !isNaN(value.getTime())) return value
  if (typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }
  if (typeof value === 'string') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

/**
 * Hook to track real-time document activity in a space
 *
 * @param spaceId - The space to track activity for
 * @param spaceContent - Content items in the space (to filter relevant activity)
 * @param accessToken - Access token for WebSocket authentication
 * @param _currentUserId - Current user ID (used for UI labeling in the caller)
 */
export function useSpaceDocumentActivity(
  spaceId: string,
  spaceContent: SpaceContentItem[],
  accessToken: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API param for caller UI labeling
  _currentUserId?: string
): UseSpaceDocumentActivityResult {
  const [activities, setActivities] = useState<DocumentActivity[]>([])
  const [isPresenceConnected, setIsPresenceConnected] = useState(false)
  const contentIdsRef = useRef<Set<string>>(new Set())
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const presenceFetchIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const collaborationClientRef = useRef<CollaborationClient | null>(null)
  const socketRef = useRef<ReturnType<CollaborationClient['connect']> | null>(null)
  const avatarCacheRef = useRef<Map<string, string | undefined>>(new Map())
  // Track when we first saw each activity (key -> first seen timestamp)
  const firstSeenTimesRef = useRef<Map<string, Date>>(new Map())
  const debugEnabledRef = useRef<boolean>(false)

  // Update content IDs ref when content changes
  useEffect(() => {
    contentIdsRef.current = new Set(spaceContent.map(item => item.id))
    debugEnabledRef.current = isActivityDebugEnabled()

    if (debugEnabledRef.current) {
      const sample = spaceContent.slice(0, 3).map(i => ({ id: i.id, type: i.type, title: i.title }))
      console.warn('[SpaceActivity] content updated', {
        spaceId,
        contentCount: spaceContent.length,
        sample
      })
    }
  }, [spaceContent, spaceId])

  // Prepare entities list for presence fetching
  const entitiesForPresence = useMemo(() => {
    return spaceContent.slice(0, MAX_PRESENCE_BATCH_SIZE).map(item => {
      // Map spreadsheet to spreadsheet_app to match server entity types
      const entityType = item.type === 'spreadsheet' ? 'spreadsheet' : item.type
      return {
        entityType,
        entityId: item.id,
        title: item.title
      }
    })
  }, [spaceContent])

  // Fetch avatars for a list of user IDs
  const fetchAvatars = useCallback(
    async (userIds: string[]): Promise<Map<string, string | undefined>> => {
      const cache = avatarCacheRef.current
      const result = new Map<string, string | undefined>()

      // Check cache first
      const uncachedIds = userIds.filter(id => !cache.has(id))

      // Return cached values if all are cached
      if (uncachedIds.length === 0) {
        for (const id of userIds) {
          result.set(id, cache.get(id))
        }
        return result
      }

      // Set access token for GraphQL client
      if (accessToken) {
        graphQLClient.setAccessToken(accessToken)
      }

      try {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] Fetching avatars for', uncachedIds.length, 'users:', uncachedIds)
        }

        const response = await graphQLClient.request<{
          Employee: Array<{ userId?: string; pictureThumbnail?: string }>
        }>(GET_EMPLOYEES_AVATARS, { userIds: uncachedIds })

        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] Avatar response:', response?.Employee?.length, 'employees found')
        }

        for (const emp of response?.Employee ?? []) {
          if (!emp.userId) continue
          const avatar = normalizeImageSrc(emp.pictureThumbnail)
          cache.set(emp.userId, avatar)
          result.set(emp.userId, avatar)

          if (debugEnabledRef.current && !avatar) {
            console.warn('[SpaceActivity] No avatar for user:', emp.userId)
          }
        }

        // Cache undefined for users not found
        for (const id of uncachedIds) {
          if (!cache.has(id)) {
            cache.set(id, undefined)
            if (debugEnabledRef.current) {
              console.warn('[SpaceActivity] User not found in Employee table:', id)
            }
          }
        }

        // Add cached values
        for (const id of userIds) {
          if (!result.has(id)) {
            result.set(id, cache.get(id))
          }
        }
      } catch (error) {
        console.error('[SpaceActivity] Failed to fetch avatars:', error)
      }

      return result
    },
    [accessToken]
  )

  // Process incoming activity data
  const processActivityData = useCallback(
    (data: DocumentActivityEvent, isEnd: boolean = false) => {
      const debug = debugEnabledRef.current

      // Filter to this space:
      // - Prefer explicit spaceId (passed via URL when opening from a Space)
      // - Fallback to matching documentId against current Space content list
      if (data.spaceId) {
        if (data.spaceId !== spaceId) {
          if (debug) {
            console.warn('[SpaceActivity] filtered (spaceId mismatch)', {
              expectedSpaceId: spaceId,
              eventSpaceId: data.spaceId,
              documentId: data.documentId,
              documentType: data.documentType
            })
          }
          return
        }
      } else if (!contentIdsRef.current.has(data.documentId)) {
        if (debug) {
          console.warn('[SpaceActivity] filtered (doc not in content list)', {
            spaceId,
            documentId: data.documentId,
            documentType: data.documentType,
            contentCount: contentIdsRef.current.size
          })
        }
        return
      }

      const key = `${data.userId}:${data.documentId}`
      const now = new Date()

      if (isEnd) {
        if (debug) {
          console.warn('[SpaceActivity] end', {
            spaceId,
            key,
            documentId: data.documentId,
            documentType: data.documentType
          })
        }
        setActivities(prev => prev.filter(a => a.key !== key))
        return
      }

      if (debug) {
        console.warn('[SpaceActivity] activity', {
          spaceId,
          key,
          userId: data.userId,
          documentId: data.documentId,
          documentType: data.documentType,
          activityType: data.activityType,
          hasEventSpaceId: Boolean(data.spaceId)
        })
      }

      setActivities(prev => {
        // Check if activity already exists
        const existingIndex = prev.findIndex(a => a.key === key)

        if (existingIndex >= 0) {
          // Update existing activity
          const updated = [...prev]
          updated[existingIndex] = {
            ...updated[existingIndex],
            activityType: data.activityType,
            lastUpdatedAt: now,
            source: updated[existingIndex].source ?? 'broadcast'
          }
          return updated
        }

        // Add new activity
        return [
          ...prev,
          {
            key,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            documentId: data.documentId,
            documentTitle: data.documentTitle,
            documentType: data.documentType,
            activityType: data.activityType,
            startedAt: now,
            lastUpdatedAt: now,
            source: 'broadcast'
          }
        ]
      })
    },
    [spaceId]
  )

  // Handle activity end
  const processActivityEnd = useCallback((userId: string, documentId: string) => {
    const key = `${userId}:${documentId}`
    setActivities(prev => prev.filter(a => a.key !== key))
  }, [])

  // Listen for BroadcastChannel messages (cross-tab communication)
  useEffect(() => {
    const channel = getActivityChannel()
    if (!channel) {
      if (isActivityDebugEnabled()) {
        console.warn('[SpaceActivity] BroadcastChannel not available', { spaceId })
      }
      return
    }

    channelRef.current = channel
    if (isActivityDebugEnabled()) {
      console.warn('[SpaceActivity] debug enabled (listener mounted)', {
        spaceId,
        channel: ACTIVITY_CHANNEL_NAME,
        href: typeof window !== 'undefined' ? window.location.href : undefined
      })
    }

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {}

      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] channel message', {
          spaceId,
          type,
          documentId: (data as any)?.documentId
        })
      }

      if (type === 'activity') {
        processActivityData(data as DocumentActivityEvent)
      } else if (type === 'activity-end') {
        const { userId, documentId } = data || {}
        if (userId && documentId) {
          processActivityEnd(userId, documentId)
        }
      }
    }

    channel.addEventListener('message', handleMessage)

    return () => {
      channel.removeEventListener('message', handleMessage)
    }
  }, [processActivityData, processActivityEnd])

  // Also listen for window events (same-tab communication, kept for backward compatibility)
  useEffect(() => {
    const handleActivityEvent = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentActivityEvent>
      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] window event activity', {
          spaceId,
          documentId: customEvent.detail?.documentId,
          hasEventSpaceId: Boolean(customEvent.detail?.spaceId)
        })
      }
      processActivityData(customEvent.detail)
    }

    const handleActivityEndEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string; documentId: string }>
      const { userId, documentId } = customEvent.detail
      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] window event end', { spaceId, userId, documentId })
      }
      processActivityEnd(userId, documentId)
    }

    window.addEventListener('document:activity', handleActivityEvent as EventListener)
    window.addEventListener('document:activity-end', handleActivityEndEvent as EventListener)

    return () => {
      window.removeEventListener('document:activity', handleActivityEvent as EventListener)
      window.removeEventListener('document:activity-end', handleActivityEndEvent as EventListener)
    }
  }, [processActivityData, processActivityEnd])

  // Initialize WebSocket collaboration client for presence tracking
  useEffect(() => {
    if (!accessToken) {
      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] No access token, skipping WebSocket presence')
      }
      return
    }

    if (debugEnabledRef.current) {
      console.warn('[SpaceActivity] Initializing WebSocket presence', { spaceId })
    }

    try {
      const client = createCollaborationClient()
      collaborationClientRef.current = client

      const socket = client.connect(accessToken)
      socketRef.current = socket

      socket.on('connect', () => {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] WebSocket connected', { spaceId })
        }
        setIsPresenceConnected(true)
      })

      socket.on('disconnect', reason => {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] WebSocket disconnected', { spaceId, reason })
        }
        setIsPresenceConnected(false)
      })

      socket.on('connect_error', error => {
        console.error('[SpaceActivity] WebSocket connection error:', error.message)
      })

      // Listen for real-time user join/leave events
      socket.on('user_joined', (data: { userId: string; userName: string; userColor: string }) => {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] User joined via WebSocket', { spaceId, userName: data.userName })
        }
      })

      socket.on('user_left', (data: { userId: string }) => {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] User left via WebSocket', { spaceId, userId: data.userId })
        }
        // Remove activities for this user
        setActivities(prev => {
          const filtered = prev.filter(a => a.userId !== data.userId)

          // Clean up firstSeenTimes for removed activities
          const firstSeenTimes = firstSeenTimesRef.current
          for (const activity of prev) {
            if (activity.userId === data.userId) {
              firstSeenTimes.delete(activity.key)
            }
          }

          return filtered
        })
      })
    } catch (error) {
      console.error('[SpaceActivity] Failed to initialize WebSocket presence:', error)
    }

    return () => {
      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] Cleaning up WebSocket presence', { spaceId })
      }
      if (collaborationClientRef.current) {
        collaborationClientRef.current.disconnect()
        socketRef.current = null
        collaborationClientRef.current = null
      }
    }
  }, [accessToken, spaceId])

  // Fetch presence from WebSocket server periodically
  useEffect(() => {
    if (!socketRef.current || entitiesForPresence.length === 0) {
      return
    }

    const fetchPresenceFromServer = () => {
      const socket = socketRef.current
      if (!socket?.connected) {
        if (debugEnabledRef.current) {
          console.warn('[SpaceActivity] Socket not connected, skipping presence fetch')
        }
        return
      }

      if (debugEnabledRef.current) {
        console.warn('[SpaceActivity] Fetching presence for', entitiesForPresence.length, 'entities')
      }

      socket.emit(
        'get_multi_presence',
        { entities: entitiesForPresence },
        async (response: {
          success: boolean
          presence?: Record<
            string,
            Array<{
              odId?: string
              userId?: string
              userName: string
              userColor: string
              avatar?: string
              lastActiveAt?: string | number | Date
              joinedAt?: string | number | Date
              connectedAt?: string | number | Date
            }>
          >
          error?: string
        }) => {
          if (!response?.success || !response.presence) {
            if (debugEnabledRef.current) {
              console.warn('[SpaceActivity] Presence fetch failed:', response?.error || 'Unknown error')
            }
            return
          }

          if (debugEnabledRef.current) {
            console.warn('[SpaceActivity] Presence response:', {
              entityCount: Object.keys(response.presence).length,
              totalUsers: Object.values(response.presence).reduce((sum, users) => sum + users.length, 0)
            })
          }

          // Collect unique IDs we can use to resolve avatars.
          // Some environments use odId as the Employee.userId (same ID as Space members use),
          // while others populate userId. We query with both to be robust.
          const idsForAvatarLookup = new Set<string>()
          for (const participants of Object.values(response.presence)) {
            for (const p of participants) {
              if (p.odId) idsForAvatarLookup.add(p.odId)
              if (p.userId) idsForAvatarLookup.add(p.userId)
            }
          }

          const avatarMap =
            idsForAvatarLookup.size > 0
              ? await fetchAvatars(Array.from(idsForAvatarLookup))
              : new Map<string, string | undefined>()

          // Convert presence response to activities
          const now = new Date()
          const presenceActivities: DocumentActivity[] = []
          const firstSeenTimes = firstSeenTimesRef.current
          const presenceKeys = new Set<string>()

          for (const [entityKey, participants] of Object.entries(response.presence)) {
            // entityKey format: "entityType:entityId"
            const [entityType, entityId] = entityKey.split(':')

            // Find the content item to get the title
            const contentItem = entitiesForPresence.find(e => e.entityId === entityId && e.entityType === entityType)

            for (const participant of participants) {
              const resolvedUserId = participant.odId || participant.userId
              if (!resolvedUserId) continue

              const key = `${resolvedUserId}:${entityId}`
              presenceKeys.add(key)

              // Resolve avatar: prefer resolvedUserId, fallback to the other id if needed
              const avatar =
                avatarMap.get(resolvedUserId) ||
                (participant.odId ? avatarMap.get(participant.userId || '') : avatarMap.get(participant.odId || ''))

              // Prefer server timestamps when available
              const lastActiveAt =
                parseMaybeDate(participant.lastActiveAt) ||
                parseMaybeDate(participant.connectedAt) ||
                parseMaybeDate(participant.joinedAt)

              // Track when we first saw this activity
              if (!firstSeenTimes.has(key)) {
                firstSeenTimes.set(key, now)
              }

              const startedAt =
                parseMaybeDate(participant.joinedAt) ||
                parseMaybeDate(participant.connectedAt) ||
                firstSeenTimes.get(key) ||
                now

              // Use lastActiveAt when provided; otherwise treat presence poll as activity
              const effectiveLastUpdatedAt = lastActiveAt || now

              presenceActivities.push({
                key,
                userId: resolvedUserId,
                userName: participant.userName,
                userAvatar: avatar,
                documentId: entityId,
                documentTitle: contentItem?.title || 'Unknown',
                documentType: entityType as DocumentType,
                activityType: 'editing', // Assume editing since they're connected
                startedAt,
                lastUpdatedAt: effectiveLastUpdatedAt,
                source: 'presence'
              })
            }
          }

          // Apply presence snapshot as authoritative:
          // - Keep broadcast activities (cross-tab local signals)
          // - Replace ALL presence activities with the current snapshot
          setActivities(prev => {
            const next = new Map<string, DocumentActivity>()

            for (const a of prev) {
              if (a.source === 'broadcast' || !a.source) {
                next.set(a.key, a)
              }
            }

            for (const a of presenceActivities) {
              const existing = next.get(a.key)
              if (existing) {
                const earliest = existing.startedAt < a.startedAt ? existing.startedAt : a.startedAt
                next.set(a.key, { ...a, startedAt: earliest })
              } else {
                next.set(a.key, a)
              }
            }

            // Clean up firstSeenTimes for presence keys that disappeared
            for (const [k] of Array.from(firstSeenTimes.entries())) {
              if (!presenceKeys.has(k)) {
                firstSeenTimes.delete(k)
              }
            }

            return Array.from(next.values())
          })
        }
      )
    }

    // Fetch immediately
    fetchPresenceFromServer()

    // Then fetch periodically
    presenceFetchIntervalRef.current = setInterval(fetchPresenceFromServer, PRESENCE_FETCH_INTERVAL_MS)

    return () => {
      if (presenceFetchIntervalRef.current) {
        clearInterval(presenceFetchIntervalRef.current)
      }
    }
  }, [entitiesForPresence])

  // Cleanup stale activities periodically
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now()
      setActivities(prev => prev.filter(activity => now - activity.lastUpdatedAt.getTime() < ACTIVITY_TIMEOUT_MS))
    }, 10000) // Check every 10 seconds

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current)
      }
    }
  }, [])

  return {
    activities,
    hasActivity: activities.length > 0,
    isPresenceConnected
  }
}

/**
 * Utility function to emit document activity events
 * Broadcasts to both same-tab (window event) and cross-tab (BroadcastChannel)
 */
export function emitDocumentActivity(data: DocumentActivityEvent): void {
  const debug = isActivityDebugEnabled()
  if (debug) {
    console.warn('[SpaceActivity] emit', {
      documentId: data.documentId,
      documentType: data.documentType,
      activityType: data.activityType,
      hasSpaceId: Boolean(data.spaceId),
      spaceId: data.spaceId
    })
  }
  // Window event for same-tab listeners
  window.dispatchEvent(new CustomEvent('document:activity', { detail: data }))

  // BroadcastChannel for cross-tab listeners
  const channel = getActivityChannel()
  if (channel) {
    if (debug) {
      console.warn('[SpaceActivity] channel postMessage', { type: 'activity', documentId: data.documentId })
    }
    channel.postMessage({ type: 'activity', data })
  } else if (debug) {
    console.warn('[SpaceActivity] channel missing (emit)', { documentId: data.documentId })
  }
}

/**
 * Utility function to emit activity end events
 * Broadcasts to both same-tab (window event) and cross-tab (BroadcastChannel)
 */
export function emitDocumentActivityEnd(userId: string, documentId: string): void {
  const debug = isActivityDebugEnabled()
  if (debug) {
    console.warn('[SpaceActivity] emit end', { userId, documentId })
  }
  // Window event for same-tab listeners
  window.dispatchEvent(new CustomEvent('document:activity-end', { detail: { userId, documentId } }))

  // BroadcastChannel for cross-tab listeners
  const channel = getActivityChannel()
  if (channel) {
    if (debug) {
      console.warn('[SpaceActivity] channel postMessage', { type: 'activity-end', documentId })
    }
    channel.postMessage({ type: 'activity-end', data: { userId, documentId } })
  } else if (debug) {
    console.warn('[SpaceActivity] channel missing (end)', { documentId })
  }
}

export default useSpaceDocumentActivity
