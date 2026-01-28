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

interface UseInboxTasksResult {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  hasNewTasks: boolean
  backgroundRefresh: () => Promise<void>
  clearNewTasksFlag: () => void
}

export const useInboxTasks = (context: BusinessAppContextProps): UseInboxTasksResult => {
  const [allFetchedTasks, setAllFetchedTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreToFetch, setHasMoreToFetch] = useState(true)
  const [hasNewTasks, setHasNewTasks] = useState(false)

  const userId = context.userInfo?.id || ''
  const hasInitialFetchRef = useRef(false)
  const lastTaskIdsRef = useRef<Set<string>>(new Set())
  const previousUserIdRef = useRef<string>('')
  const isLoadingRef = useRef(false) // Track loading state to prevent duplicate calls

  const FETCH_SIZE = 20 // Fetch 20 from each source per batch (40 total per batch)
  const MIN_INITIAL_TASKS = 20 // Keep fetching until we have at least this many tasks
  const MAX_INITIAL_BATCHES = 3 // Safety limit to prevent infinite fetching

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
        offset
      })

      // Has more if we got a full batch (and at least some tasks)
      const hasMore = response.tasks.length > 0 && response.tasks.length >= FETCH_SIZE
      return { tasks: response.tasks, hasMore, totalCount: response.totalCount }
    },
    [userId, context.accessToken]
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
      let collectedTasks: UnifiedTask[] = []
      let currentOffset = 0
      let batchCount = 0
      let hasMore = true
      let apiTotalCount = 0 // Total from API (cflow + kogito combined)

      // Keep fetching until we have enough tasks or no more data
      while (collectedTasks.length < MIN_INITIAL_TASKS && hasMore && batchCount < MAX_INITIAL_BATCHES) {
        const batch = await fetchBatch(currentOffset)
        collectedTasks = [...collectedTasks, ...batch.tasks]
        hasMore = batch.hasMore
        apiTotalCount = batch.totalCount // Use the accurate totalCount from API
        currentOffset += FETCH_SIZE
        batchCount++

        console.log(
          `[useInboxTasks] Batch ${batchCount}: fetched ${batch.tasks.length}, total: ${collectedTasks.length}, apiTotalCount: ${apiTotalCount}`
        )
      }

      // Sort globally by timestamp (newest first)
      const sortedTasks = [...collectedTasks].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime()
        const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime()
        return bTime - aTime
      })

      // Store task IDs for change detection
      lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))

      setAllFetchedTasks(sortedTasks)
      // Use the accurate totalCount from API (cflow + kogito combined)
      setTotalCount(apiTotalCount)
      setHasMoreToFetch(hasMore)

      console.log(
        `[useInboxTasks] Initial load complete: ${sortedTasks.length} tasks displayed, totalCount: ${apiTotalCount}, hasMore: ${hasMore}`
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [userId, fetchBatch])

  /**
   * Background refresh - detects new tasks without disrupting UI
   */
  const backgroundRefresh = useCallback(async () => {
    if (!userId || isLoadingRef.current) {
      return
    }

    try {
      // Fetch only first batch to check for new tasks
      const batch = await fetchBatch(0)

      if (batch.tasks.length === 0) {
        return
      }

      // Check if there are any new task IDs
      const newTaskIds = new Set(batch.tasks.map(t => t.id))
      const hasNewTasksDetected = Array.from(newTaskIds).some(id => !lastTaskIdsRef.current.has(id))

      if (hasNewTasksDetected) {
        setHasNewTasks(true)
      }
    } catch {
      // Ignore background refresh errors
    }
  }, [userId, fetchBatch])

  /**
   * Manual refetch - user-triggered full reload
   */
  const refetch = useCallback(async () => {
    setHasNewTasks(false)
    setAllFetchedTasks([])
    setHasMoreToFetch(true)
    lastTaskIdsRef.current.clear()
    await loadInitial()
  }, [loadInitial])

  /**
   * Clear new tasks flag (when user clicks "Load new tasks")
   */
  const clearNewTasksFlag = useCallback(() => {
    setHasNewTasks(false)
    refetch()
  }, [refetch])

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
      const batch = await fetchBatch(nextOffset)

      setAllFetchedTasks(prevTasks => {
        const newAllTasks = [...prevTasks, ...batch.tasks]
        const sortedTasks = [...newAllTasks].sort((a, b) => {
          const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime()
          const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime()
          return bTime - aTime
        })

        // Update task IDs
        lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))
        return sortedTasks
      })

      setTotalCount(prevCount => prevCount + batch.tasks.length)
      setHasMoreToFetch(batch.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [hasMoreToFetch, fetchBatch, allFetchedTasks.length])

  /**
   * Initial fetch on mount and when userId changes
   */
  useEffect(() => {
    // Reset when userId changes
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      hasInitialFetchRef.current = false
      setAllFetchedTasks([])
      setHasMoreToFetch(true)
      lastTaskIdsRef.current.clear()
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
    hasNewTasks,
    backgroundRefresh,
    clearNewTasksFlag
  }
}
