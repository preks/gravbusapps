/**
 * useInboxTasks Hook
 * Fetches tasks from both CFlow and Kogito using the unified API
 *
 * STRATEGY:
 * - Fetch from both sources until we have at least MIN_INITIAL_TASKS (20)
 * - After initial load, user can "Load more" for additional batches
 * - Smart polling: updates in background without disrupting UI
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchAllUserTasks } from '@/business-apps/core/every/apps/every-api'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

type PrefetchState = {
  key: string
  offset: number
  inFlight?: Promise<{ tasks: UnifiedTask[]; hasMore: boolean; totalCount: number }>
  batch?: { tasks: UnifiedTask[]; hasMore: boolean; totalCount: number }
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
  const hasInitialFetchRef = useRef(false)
  const lastTaskKeysRef = useRef<Set<string>>(new Set())
  const previousUserIdRef = useRef<string>('')
  const previousSearchRef = useRef<string>('')
  const previousSortRef = useRef<string>('')
  const isLoadingRef = useRef(false) // Track loading state to prevent duplicate calls
  const prefetchRef = useRef<PrefetchState | null>(null)

  const FETCH_SIZE = 20 // Fetch 20 from each source per batch (40 total per batch)

  /**
   * Fetch a batch of tasks
   * Returns tasks, hasMore flag, and totalCount from API (cflow + kogito combined)
   */
  const fetchBatch = useCallback(
    async (offset: number): Promise<{ tasks: UnifiedTask[]; hasMore: boolean; totalCount: number }> => {
      if (!userId) {
        return { tasks: [], hasMore: false, totalCount: 0 }
      }

      const response = await fetchAllUserTasks(userId, context.accessToken || '', {
        limit: FETCH_SIZE,
        offset,
        ...(search ? { search } : {}),
        sortBy,
        sortOrder
      })

      return { tasks: response.tasks, hasMore: response.hasMore, totalCount: response.totalCount }
    },
    [userId, context.accessToken, search, sortBy, sortOrder]
  )

  const currentKey = `${userId}:${search}:${sortBy}:${sortOrder}`

  const prefetchNext = useCallback(
    (offset: number) => {
      if (!userId) return
      if (search) return // don't prefetch while searching

      const existing = prefetchRef.current
      if (
        existing &&
        existing.key === currentKey &&
        existing.offset === offset &&
        (existing.inFlight || existing.batch)
      ) {
        return
      }

      const inFlight = fetchBatch(offset)
      prefetchRef.current = { key: currentKey, offset, inFlight }
      void inFlight
        .then(batch => {
          // Only store if still relevant
          if (prefetchRef.current?.key === currentKey && prefetchRef.current?.offset === offset) {
            prefetchRef.current = { key: currentKey, offset, batch }
          }
        })
        .catch(() => {
          if (prefetchRef.current?.key === currentKey && prefetchRef.current?.offset === offset) {
            prefetchRef.current = null
          }
        })
    },
    [userId, search, currentKey, fetchBatch]
  )

  /**
   * Load initial tasks - fetch until we have at least MIN_INITIAL_TASKS (20)
   * Uses totalCount from API (cflow + kogito) for accurate badge
   */
  const loadInitial = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      isLoadingRef.current = false
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const batch = await fetchBatch(0)
      lastTaskKeysRef.current = new Set(batch.tasks.map(t => `${t.source}:${t.id}`))
      setAllFetchedTasks(batch.tasks) // Preserve server-side ordering (pinned + priority + sort)
      setTotalCount(batch.totalCount)
      setHasMoreToFetch(batch.hasMore)
      if (batch.hasMore) {
        prefetchNext(FETCH_SIZE)
      } else {
        prefetchRef.current = null
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [userId, fetchBatch])

  /**
   * Background refresh - updates list when new tasks arrive
   */
  const backgroundRefresh = useCallback(async () => {
    if (!userId || isLoadingRef.current) {
      return
    }
    if (search) {
      return
    }

    try {
      const batch = await fetchBatch(0)

      if (batch.tasks.length === 0) {
        return
      }

      const newKeys = new Set(batch.tasks.map(t => `${t.source}:${t.id}`))
      const hasNewTasksDetected = Array.from(newKeys).some(key => !lastTaskKeysRef.current.has(key))
      if (!hasNewTasksDetected) return

      // Merge: keep newest server-ordered first batch, then keep previously loaded tasks without duplicates.
      setAllFetchedTasks(prev => {
        const seen = new Set<string>()
        const merged: UnifiedTask[] = []

        batch.tasks.forEach(t => {
          const k = `${t.source}:${t.id}`
          if (seen.has(k)) return
          seen.add(k)
          merged.push(t)
        })

        prev.forEach(t => {
          const k = `${t.source}:${t.id}`
          if (seen.has(k)) return
          seen.add(k)
          merged.push(t)
        })

        lastTaskKeysRef.current = new Set(merged.map(t => `${t.source}:${t.id}`))
        return merged
      })

      setTotalCount(batch.totalCount)
      setHasMoreToFetch(batch.hasMore)
    } catch {
      // Ignore background refresh errors
    }
  }, [userId, fetchBatch])

  /**
   * Manual refetch - user-triggered full reload
   */
  const refetch = useCallback(async () => {
    setAllFetchedTasks([])
    setHasMoreToFetch(true)
    lastTaskKeysRef.current.clear()
    await loadInitial()
  }, [loadInitial])

  /**
   * Load more tasks - fetches additional batch from backend
   */
  const loadMore = useCallback(async () => {
    // Prevent duplicate calls using ref (avoids stale closure issues)
    if (isLoadingRef.current || !hasMoreToFetch) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)

    try {
      const nextOffset = allFetchedTasks.length
      const prefetched = prefetchRef.current
      let batch: { tasks: UnifiedTask[]; hasMore: boolean; totalCount: number } | null = null

      if (prefetched && prefetched.key === currentKey && prefetched.offset === nextOffset) {
        if (prefetched.batch) {
          batch = prefetched.batch
        } else if (prefetched.inFlight) {
          batch = await prefetched.inFlight
        }
      }

      if (!batch) {
        batch = await fetchBatch(nextOffset)
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

      // Prefetch the next page to make "Load more" feel instant
      prefetchRef.current = null
      if (batch.hasMore) {
        prefetchNext(nextOffset + FETCH_SIZE)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [hasMoreToFetch, fetchBatch, allFetchedTasks.length, search, currentKey, prefetchNext])

  // Reset and refetch on search change
  useEffect(() => {
    if (previousSearchRef.current !== search) {
      previousSearchRef.current = search
      previousSortRef.current = `${sortBy}:${sortOrder}`
      hasInitialFetchRef.current = false
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      lastTaskKeysRef.current.clear()
      prefetchRef.current = null
      loadInitial()
    }
  }, [search, sortBy, sortOrder, loadInitial])

  // Reset and refetch on sort change
  useEffect(() => {
    const next = `${sortBy}:${sortOrder}`
    if (previousSortRef.current !== next) {
      previousSortRef.current = next
      hasInitialFetchRef.current = false
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      lastTaskKeysRef.current.clear()
      prefetchRef.current = null
      loadInitial()
    }
  }, [sortBy, sortOrder, loadInitial])

  /**
   * Initial fetch on mount and when userId changes
   */
  useEffect(() => {
    // Reset when userId changes
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      hasInitialFetchRef.current = false
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      lastTaskKeysRef.current.clear()
      prefetchRef.current = null
    }

    if (!hasInitialFetchRef.current && userId) {
      hasInitialFetchRef.current = true
      previousUserIdRef.current = userId
      loadInitial()
    }
  }, [userId, loadInitial])

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
