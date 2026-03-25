/**
 * useInboxTasks Hook
 * Fetches tasks from both CFlow and Kogito using the unified API
 *
 * STRATEGY:
 * - Uses cursor-based pagination for efficient "load more" without O(n²) re-fetching
 * - Fetch from both sources until we have at least MIN_INITIAL_TASKS (20)
 * - After initial load, user can "Load more" for additional batches
 * - Smart polling: lightweight background refresh without session recreation
 *
 * PERFORMANCE:
 * - Cursor stored in ref for instant access (no stale closures)
 * - Prefetch next page immediately after load for instant scroll
 * - Background refresh reuses session when possible
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchAllUserTasks } from '@/business-apps/core/every/apps/every-api'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

type FetchBatchResult = { tasks: UnifiedTask[]; hasMore: boolean; totalCount: number; nextCursor?: string | null }

type PrefetchState = {
  key: string
  cursor: string | null
  inFlight?: Promise<FetchBatchResult>
  batch?: FetchBatchResult
}

interface UseInboxTasksResult {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  backgroundRefresh: () => Promise<void>
}

export const useInboxTasks = (
  context: BusinessAppContextProps,
  options?: {
    search?: string
    sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'
    sortOrder?: 'asc' | 'desc'
    dueFilter?: 'any' | 'dueSoon24h' | 'overdue' | 'hasDueDate' | 'noDueDate'
  }
): UseInboxTasksResult => {
  const [allFetchedTasks, setAllFetchedTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreToFetch, setHasMoreToFetch] = useState(true)

  const userId = context.userInfo?.id || ''
  const search = (options?.search || '').trim()
  const sortBy = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder || 'desc'
  const dueFilter = options?.dueFilter || 'any'
  const hasInitialFetchRef = useRef(false)
  const lastTaskKeysRef = useRef<Set<string>>(new Set())
  const previousUserIdRef = useRef<string>('')
  const isLoadingRef = useRef(false) // Track loading state to prevent duplicate calls
  const prefetchRef = useRef<PrefetchState | null>(null)
  // Store cursor in ref for instant, synchronous access (avoids stale closure issues)
  const nextCursorRef = useRef<string | null>(null)
  // Track if we're in the middle of a full refetch (prevents loadMore during transition)
  const isRefetchingRef = useRef(false)
  // Last successful background refresh timestamp (throttle polling)
  const lastBackgroundRefreshRef = useRef<number>(0)

  const FETCH_SIZE = 20 // Fetch 20 from each source per batch (40 total per batch)
  const BACKGROUND_REFRESH_THROTTLE_MS = 10000 // Minimum 10s between background refreshes

  // Helper to update cursor (both ref and trigger re-render for hasMore calculation)
  const setCursor = useCallback((cursor: string | null) => {
    nextCursorRef.current = cursor
  }, [])

  /**
   * Fetch a batch of tasks using cursor-based pagination
   * Returns tasks, hasMore flag, totalCount, and nextCursor from API
   */
  const fetchBatch = useCallback(
    async (cursor?: string | null): Promise<FetchBatchResult> => {
      if (!userId) {
        return { tasks: [], hasMore: false, totalCount: 0, nextCursor: null }
      }

      const response = await fetchAllUserTasks(userId, context.accessToken || '', {
        limit: FETCH_SIZE,
        ...(cursor ? { cursor } : {}),
        ...(search ? { search } : {}),
        sortBy,
        sortOrder,
        dueFilter
      })

      return {
        tasks: response.tasks,
        hasMore: response.hasMore,
        totalCount: response.totalCount,
        nextCursor: response.nextCursor
      }
    },
    [userId, context.accessToken, search, sortBy, sortOrder, dueFilter]
  )

  const currentKey = `${userId}:${search}:${sortBy}:${sortOrder}:${dueFilter}`

  const prefetchNext = useCallback(
    (cursor: string | null) => {
      if (!userId) return
      if (search) return // don't prefetch while searching
      if (!cursor) return // no cursor means no more pages

      const existing = prefetchRef.current
      if (
        existing &&
        existing.key === currentKey &&
        existing.cursor === cursor &&
        (existing.inFlight || existing.batch)
      ) {
        return
      }

      const inFlight = fetchBatch(cursor)
      prefetchRef.current = { key: currentKey, cursor, inFlight }
      void inFlight
        .then(batch => {
          // Only store if still relevant
          if (prefetchRef.current?.key === currentKey && prefetchRef.current?.cursor === cursor) {
            prefetchRef.current = { key: currentKey, cursor, batch }
          }
        })
        .catch(() => {
          if (prefetchRef.current?.key === currentKey && prefetchRef.current?.cursor === cursor) {
            prefetchRef.current = null
          }
        })
    },
    [userId, search, currentKey, fetchBatch]
  )

  /**
   * Load initial tasks - fetch until we have at least MIN_INITIAL_TASKS (20)
   * Uses totalCount from API (cflow + kogito) for accurate badge
   * Uses cursor-based pagination - first request has no cursor, subsequent use nextCursor
   */
  const loadInitial = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      isLoadingRef.current = false
      isRefetchingRef.current = false
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const batch = await fetchBatch(null) // null cursor = start fresh
      lastTaskKeysRef.current = new Set(batch.tasks.map(t => `${t.source}:${t.id}`))
      setAllFetchedTasks(batch.tasks) // Preserve server-side ordering (pinned + priority + sort)
      setTotalCount(batch.totalCount)
      setHasMoreToFetch(batch.hasMore)
      setCursor(batch.nextCursor ?? null)
      if (batch.hasMore && batch.nextCursor) {
        prefetchNext(batch.nextCursor)
      } else {
        prefetchRef.current = null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      isRefetchingRef.current = false
    }
  }, [userId, fetchBatch, prefetchNext, setCursor])

  /**
   * Background refresh - lightweight check for new tasks
   *
   * PERFORMANCE: Throttled to prevent hammering the backend.
   * Only fetches first page to detect new tasks, preserves existing cursor for pagination.
   * If new tasks detected, merges them into the top of the list.
   */
  const backgroundRefresh = useCallback(async () => {
    // Skip if already loading, refetching, searching, or throttled
    if (!userId || isLoadingRef.current || isRefetchingRef.current) {
      return
    }
    if (search) {
      return
    }

    // Throttle: don't refresh more often than every 10s
    const now = Date.now()
    if (now - lastBackgroundRefreshRef.current < BACKGROUND_REFRESH_THROTTLE_MS) {
      return
    }
    lastBackgroundRefreshRef.current = now

    try {
      // Fetch first page only (no cursor = check for new tasks at the top)
      const batch = await fetchBatch(null)

      if (batch.tasks.length === 0) {
        return
      }

      const newKeys = new Set(batch.tasks.map(t => `${t.source}:${t.id}`))
      const hasNewTasksDetected = Array.from(newKeys).some(key => !lastTaskKeysRef.current.has(key))
      if (!hasNewTasksDetected) return

      // Merge: keep newest server-ordered first batch, then keep previously loaded tasks without duplicates
      // PERF: Cap merged array to prevent unbounded memory growth from repeated polling
      const MAX_TASKS_IN_MEMORY = 500
      setAllFetchedTasks(prev => {
        const seen = new Set<string>()
        const merged: UnifiedTask[] = []

        // New batch first (freshest data)
        batch.tasks.forEach(t => {
          const k = `${t.source}:${t.id}`
          if (seen.has(k)) return
          seen.add(k)
          merged.push(t)
        })

        // Then existing tasks (up to limit)
        for (const t of prev) {
          if (merged.length >= MAX_TASKS_IN_MEMORY) break
          const k = `${t.source}:${t.id}`
          if (seen.has(k)) continue
          seen.add(k)
          merged.push(t)
        }

        lastTaskKeysRef.current = new Set(merged.map(t => `${t.source}:${t.id}`))
        return merged
      })

      setTotalCount(batch.totalCount)
      // IMPORTANT: Do NOT update hasMoreToFetch here!
      // Background refresh only merges new tasks - pagination state must stay intact
      // hasMoreToFetch and cursor are only updated by loadInitial and loadMore
    } catch {
      // Ignore background refresh errors silently
    }
  }, [userId, fetchBatch, search])

  /**
   * Manual refetch - user-triggered full reload
   * Sets refetching flag to prevent loadMore during transition, then reloads
   */
  const refetch = useCallback(async () => {
    // Mark as refetching to prevent loadMore during the transition
    isRefetchingRef.current = true
    setAllFetchedTasks([])
    setHasMoreToFetch(true)
    setCursor(null)
    lastTaskKeysRef.current.clear()
    prefetchRef.current = null
    await loadInitial()
    // isRefetchingRef.current is cleared in loadInitial's finally block
  }, [loadInitial, setCursor])

  /**
   * Load more tasks - fetches additional batch using cursor-based pagination
   * Falls back to offset-based if cursor not available (backward compatibility)
   *
   * PERFORMANCE: Uses cursor ref for instant synchronous access, checks prefetch cache first
   */
  const loadMore = useCallback(async () => {
    // Get cursor from ref (always current, no stale closure)
    const cursor = nextCursorRef.current

    // Prevent duplicate calls
    // Also block during refetch to prevent race conditions
    if (isLoadingRef.current || isRefetchingRef.current || !hasMoreToFetch) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const prefetched = prefetchRef.current
      let batch: FetchBatchResult | null = null

      // Check if we have a prefetched batch for this cursor (instant response)
      if (cursor && prefetched && prefetched.key === currentKey && prefetched.cursor === cursor) {
        if (prefetched.batch) {
          batch = prefetched.batch
        } else if (prefetched.inFlight) {
          batch = await prefetched.inFlight
        }
      }

      // Fetch if no prefetch available
      // If no cursor, use offset-based pagination (backward compatibility with old backend)
      if (!batch) {
        if (cursor) {
          batch = await fetchBatch(cursor)
        } else {
          // Fallback: use current task count as offset for legacy backend
          const currentCount = lastTaskKeysRef.current.size
          const response = await fetchAllUserTasks(userId, context.accessToken || '', {
            limit: FETCH_SIZE,
            offset: currentCount,
            ...(search ? { search } : {}),
            sortBy,
            sortOrder,
            dueFilter
          })
          batch = {
            tasks: response.tasks,
            hasMore: response.hasMore,
            totalCount: response.totalCount,
            nextCursor: response.nextCursor
          }
        }
      }

      setAllFetchedTasks(prevTasks => {
        // Keep server ordering; ensure uniqueness (source:id)
        const seen = new Set(prevTasks.map(t => `${t.source}:${t.id}`))
        const appended = batch.tasks.filter(t => {
          const k = `${t.source}:${t.id}`
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        const newAllTasks = [...prevTasks, ...appended]
        lastTaskKeysRef.current = new Set(newAllTasks.map(t => `${t.source}:${t.id}`))
        return newAllTasks
      })

      setTotalCount(batch.totalCount)
      setHasMoreToFetch(batch.hasMore)
      setCursor(batch.nextCursor ?? null)

      // Prefetch the next page immediately for instant scroll experience
      prefetchRef.current = null
      if (batch.hasMore && batch.nextCursor) {
        prefetchNext(batch.nextCursor)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [
    hasMoreToFetch,
    fetchBatch,
    currentKey,
    prefetchNext,
    setCursor,
    userId,
    context.accessToken,
    search,
    sortBy,
    sortOrder,
    dueFilter
  ])

  // Reset and refetch when any query parameter changes (search, sort, filter)
  // Single effect keyed on currentKey prevents double-fire when multiple params change simultaneously
  const previousKeyRef = useRef<string>('')
  useEffect(() => {
    if (previousKeyRef.current && previousKeyRef.current !== currentKey) {
      isRefetchingRef.current = true
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      setCursor(null)
      lastTaskKeysRef.current.clear()
      prefetchRef.current = null
      loadInitial()
      // Mark as fetched so the userId effect below doesn't also trigger loadInitial
      hasInitialFetchRef.current = true
    }
    previousKeyRef.current = currentKey
  }, [currentKey, loadInitial, setCursor])

  /**
   * Initial fetch on mount and when userId changes
   */
  useEffect(() => {
    // Reset when userId changes
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      hasInitialFetchRef.current = false
      isRefetchingRef.current = true
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      setCursor(null)
      lastTaskKeysRef.current.clear()
      prefetchRef.current = null
    }

    if (!hasInitialFetchRef.current && userId) {
      hasInitialFetchRef.current = true
      previousUserIdRef.current = userId
      loadInitial()
    }
  }, [userId, loadInitial, setCursor])

  // Return all fetched tasks - InboxView handles filtering and display
  return {
    tasks: allFetchedTasks,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore: hasMoreToFetch,
    backgroundRefresh
  }
}
