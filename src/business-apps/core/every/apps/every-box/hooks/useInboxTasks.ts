/**
 * useInboxTasks Hook
 * Fetches tasks from both CFlow and Kogito using the unified API
 *
 * OPTIMIZATION:
 * - Fetch 4 batches upfront (400 tasks) for accurate count
 * - Smart polling: updates in background without disrupting UI
 * - Client-side pagination from merged results
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
  const [displayedTasks, setDisplayedTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreToFetch, setHasMoreToFetch] = useState(true)
  const [hasNewTasks, setHasNewTasks] = useState(false)

  const userId = context.userInfo?.id || ''
  const hasInitialFetchRef = useRef(false)
  const lastTaskIdsRef = useRef<Set<string>>(new Set())
  const previousUserIdRef = useRef<string>('')

  const ITEMS_PER_PAGE = 50
  const FETCH_SIZE = 50 // Fetch 50 from each source (100 total per fetch)
  const INITIAL_BATCH_COUNT = 4 // Fetch 4 batches initially (400 tasks)

  /**
   * Fetch a batch of tasks
   */
  const fetchBatch = useCallback(
    async (offset: number): Promise<{ tasks: UnifiedTask[]; hasMore: boolean }> => {
      if (!userId) {
        return { tasks: [], hasMore: false }
      }

      const response = await fetchAllUserTasks(userId, context.accessToken || '', {
        assignedOnly: true,
        limit: FETCH_SIZE,
        offset
      })

      const hasMore = response.tasks.length >= FETCH_SIZE
      return { tasks: response.tasks, hasMore }
    },
    [userId, context.accessToken]
  )

  /**
   * Load initial batches (4 batches = ~400 tasks for accurate count)
   */
  const loadInitial = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch multiple batches in parallel for accurate count
      const batchPromises = []
      for (let i = 0; i < INITIAL_BATCH_COUNT; i++) {
        batchPromises.push(fetchBatch(i * FETCH_SIZE))
      }

      const batches = await Promise.all(batchPromises)

      // Merge all tasks
      const allTasks = batches.flatMap(b => b.tasks)

      // Sort globally by timestamp (newest first)
      const sortedTasks = [...allTasks].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime()
        const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime()
        return bTime - aTime
      })

      // Store task IDs for change detection
      lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))

      setAllFetchedTasks(sortedTasks)
      setDisplayedTasks(sortedTasks.slice(0, ITEMS_PER_PAGE))
      setCurrentPage(1)
      setTotalCount(sortedTasks.length)
      setHasMoreToFetch(batches[batches.length - 1].hasMore)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId, fetchBatch])

  /**
   * Background refresh - detects new tasks without disrupting UI
   */
  const backgroundRefresh = useCallback(async () => {
    if (!userId || isLoading) {
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
  }, [userId, isLoading, fetchBatch])

  /**
   * Manual refetch - user-triggered full reload
   */
  const refetch = useCallback(async () => {
    setHasNewTasks(false)
    setAllFetchedTasks([])
    setDisplayedTasks([])
    setCurrentPage(1)
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
   * Load more tasks
   */
  const loadMore = useCallback(async () => {
    const nextPage = currentPage + 1
    const startIdx = (nextPage - 1) * ITEMS_PER_PAGE
    const endIdx = startIdx + ITEMS_PER_PAGE

    // Serve from cache if available
    if (endIdx <= allFetchedTasks.length) {
      setDisplayedTasks(allFetchedTasks.slice(0, endIdx))
      setCurrentPage(nextPage)
      return
    }

    // Need to fetch more
    if (!hasMoreToFetch) {
      return
    }

    setIsLoading(true)
    try {
      const nextOffset = allFetchedTasks.length
      const batch = await fetchBatch(nextOffset)

      const newAllTasks = [...allFetchedTasks, ...batch.tasks]
      const sortedTasks = [...newAllTasks].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.scheduledAt || 0).getTime()
        const bTime = new Date(b.createdAt || b.scheduledAt || 0).getTime()
        return bTime - aTime
      })

      // Update task IDs
      lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))

      setAllFetchedTasks(sortedTasks)
      setDisplayedTasks(sortedTasks.slice(0, endIdx))
      setCurrentPage(nextPage)
      setTotalCount(sortedTasks.length)
      setHasMoreToFetch(batch.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, allFetchedTasks, hasMoreToFetch, fetchBatch])

  /**
   * Initial fetch on mount and when userId changes
   */
  useEffect(() => {
    // Reset when userId changes
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      hasInitialFetchRef.current = false
      setAllFetchedTasks([])
      setDisplayedTasks([])
      setCurrentPage(1)
      setHasMoreToFetch(true)
      lastTaskIdsRef.current.clear()
    }

    if (!hasInitialFetchRef.current && userId) {
      hasInitialFetchRef.current = true
      previousUserIdRef.current = userId
      loadInitial()
    }
  }, [userId, loadInitial])

  const hasMore = displayedTasks.length < allFetchedTasks.length || hasMoreToFetch

  return {
    tasks: displayedTasks,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    hasNewTasks,
    backgroundRefresh,
    clearNewTasksFlag
  }
}
