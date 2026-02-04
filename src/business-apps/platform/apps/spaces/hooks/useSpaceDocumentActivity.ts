/**
 * useSpaceDocumentActivity Hook
 *
 * Tracks real-time document activity within a Space.
 * Uses BroadcastChannel for cross-tab communication so activity from other tabs/pages is visible.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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

// Singleton channel for broadcasting activity
let activityChannel: BroadcastChannel | null = null

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

/**
 * Hook to track real-time document activity in a space
 *
 * @param spaceId - The space to track activity for
 * @param spaceContent - Content items in the space (to filter relevant activity)
 * @param _currentUserId - Current user ID (used for UI labeling in the caller)
 */
export function useSpaceDocumentActivity(
  spaceId: string,
  spaceContent: SpaceContentItem[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API param for caller UI labeling
  _currentUserId?: string
): UseSpaceDocumentActivityResult {
  const [activities, setActivities] = useState<DocumentActivity[]>([])
  const contentIdsRef = useRef<Set<string>>(new Set())
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
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
  }, [spaceContent])

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
            lastUpdatedAt: now
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
            lastUpdatedAt: now
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
    hasActivity: activities.length > 0
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
