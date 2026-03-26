/**
 * useCompletedTasks Hook
 * Fetches completed tasks from both CFlow and Kogito using the unified API
 *
 * OPTIMIZATION: Cursor-based pagination with accurate totalCount from API
 * - Uses cursor-based pagination for efficient "load more" without O(n²) re-fetching
 * - First batch size matches EVERYBOX_FIRST_PAGE_LIMIT (same as inbox)
 * - Use API totalCount for accurate badge
 * - Load more on demand using nextCursor
 *
 * PERFORMANCE:
 * - Cursor stored in ref for instant access (no stale closures)
 * - Prefetch next page immediately after load for instant scroll
 * - Background refresh throttled and reuses session when possible
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EVERYBOX_FIRST_PAGE_LIMIT, fetchCompletedUserTasks } from '@/business-apps/core/every/apps/every-api'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

type FetchBatchResult = { tasks: UnifiedTask[]; hasMore: boolean; totalCount: number; nextCursor?: string | null }

type PrefetchState = {
  key: string
  cursor: string | null
  inFlight?: Promise<FetchBatchResult>
  batch?: FetchBatchResult
}

interface UseCompletedTasksResult {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  backgroundRefresh: () => Promise<void>
}

export const useCompletedTasks = (
  context: BusinessAppContextProps,
  options?: {
    search?: string
    sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'
    sortOrder?: 'asc' | 'desc'
    dueFilter?: 'any' | 'dueSoon24h' | 'overdue' | 'hasDueDate' | 'noDueDate'
    enabled?: boolean
    initialTotalCount?: number
  }
): UseCompletedTasksResult => {
  const [allFetchedTasks, setAllFetchedTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(options?.initialTotalCount ?? 0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreToFetch, setHasMoreToFetch] = useState(true)

  const userId = context.userInfo?.id || ''
  const search = (options?.search || '').trim()
  const sortBy = options?.sortBy || 'createdAt'
  const sortOrder = options?.sortOrder || 'desc'
  const dueFilter = options?.dueFilter || 'any'
  const enabled = options?.enabled ?? true
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

  const FETCH_SIZE = EVERYBOX_FIRST_PAGE_LIMIT
  const BACKGROUND_REFRESH_THROTTLE_MS = 10000 // Minimum 10s between background refreshes

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setTotalCount(options?.initialTotalCount ?? 0)
    }
  }, [enabled, options?.initialTotalCount])

  // Helper to update cursor (both ref and trigger re-render for hasMore calculation)
  const setCursor = useCallback((cursor: string | null) => {
    nextCursorRef.current = cursor
  }, [])

  /**
   * Fetch a batch of completed tasks using cursor-based pagination
   * Returns tasks, hasMore flag, totalCount, and nextCursor from API
   */
  const fetchBatch = useCallback(
    async (cursor?: string | null): Promise<FetchBatchResult> => {
      if (!userId || !enabled) {
        return { tasks: [], hasMore: false, totalCount: 0, nextCursor: null }
      }

      const response = await fetchCompletedUserTasks(userId, context.accessToken || '', {
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
    [userId, context.accessToken, search, sortBy, sortOrder, dueFilter, enabled]
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
   * Load initial tasks using cursor-based pagination
   * First request has no cursor, subsequent use nextCursor
   */
  const loadInitial = useCallback(async () => {
    if (!userId || !enabled) {
      setIsLoading(false)
      isLoadingRef.current = false
      isRefetchingRef.current = false
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Single batch fetch - use API totalCount for accurate badge
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to load completed tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      isRefetchingRef.current = false
    }
  }, [userId, fetchBatch, prefetchNext, setCursor, enabled])

  /**
   * Background refresh - lightweight check for new tasks
   *
   * PERFORMANCE: Throttled to prevent hammering the backend.
   * Only fetches first page to detect new tasks, preserves existing cursor for pagination.
   */
  const backgroundRefresh = useCallback(async () => {
    // Skip if already loading, refetching, searching, or throttled
    if (!enabled || !userId || isLoadingRef.current || isRefetchingRef.current) {
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
  }, [userId, fetchBatch, search, enabled])

  /**
   * Manual refetch - user-triggered full reload
   * Sets refetching flag to prevent loadMore during transition, then reloads
   */
  const refetch = useCallback(async () => {
    if (!enabled) return
    // Mark as refetching to prevent loadMore during the transition
    isRefetchingRef.current = true
    setAllFetchedTasks([])
    setHasMoreToFetch(true)
    setCursor(null)
    lastTaskKeysRef.current.clear()
    prefetchRef.current = null
    await loadInitial()
    // isRefetchingRef.current is cleared in loadInitial's finally block
  }, [loadInitial, setCursor, enabled])

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
    if (!enabled || isLoadingRef.current || isRefetchingRef.current || !hasMoreToFetch) {
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
          const response = await fetchCompletedUserTasks(userId, context.accessToken || '', {
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

      // Keep using API totalCount (doesn't change with pagination)
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
    enabled,
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
    if (!enabled) return
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
  }, [currentKey, loadInitial, setCursor, enabled])

  useEffect(() => {
    if (!enabled) return
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
  }, [userId, loadInitial, setCursor, enabled])

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
