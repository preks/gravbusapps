/**
 * useCompletedTasks Hook
 * Fetches completed tasks from both CFlow and Kogito using the unified API
 *
 * OPTIMIZATION: Single batch fetch with accurate totalCount from API
 * - Fetch 1 batch of 20 tasks initially
 * - Use API totalCount for accurate badge
 * - Load more on demand
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchCompletedUserTasks } from '@/business-apps/core/every/apps/every-api'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

interface UseCompletedTasksResult {
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

export const useCompletedTasks = (context: BusinessAppContextProps): UseCompletedTasksResult => {
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

  const FETCH_SIZE = 20 // Match useInboxTasks

  const fetchBatch = useCallback(
    async (offset: number): Promise<{ tasks: UnifiedTask[]; hasMore: boolean; totalCount: number }> => {
      if (!userId) {
        return { tasks: [], hasMore: false, totalCount: 0 }
      }

      const response = await fetchCompletedUserTasks(userId, context.accessToken || '', {
        limit: FETCH_SIZE,
        offset
      })

      // Check if there are more tasks based on total count AND if we received any tasks
      // If we got 0 tasks, there's no point trying again at the same offset
      const hasMore = response.tasks.length > 0 && offset + response.tasks.length < response.totalCount
      return { tasks: response.tasks, hasMore, totalCount: response.totalCount }
    },
    [userId, context.accessToken]
  )

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
      // Single batch fetch - use API totalCount for accurate badge
      const batch = await fetchBatch(0)

      const sortedTasks = [...batch.tasks].sort((a, b) => {
        const aTime = new Date(a.completedAt || a.createdAt || 0).getTime()
        const bTime = new Date(b.completedAt || b.createdAt || 0).getTime()
        return bTime - aTime
      })

      lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))

      setAllFetchedTasks(sortedTasks)
      // Use accurate totalCount from API (cflow + kogito combined)
      setTotalCount(batch.totalCount)
      setHasMoreToFetch(batch.hasMore)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load completed tasks'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [userId, fetchBatch])

  const backgroundRefresh = useCallback(async () => {
    if (!userId || isLoadingRef.current) {
      return
    }

    try {
      const batch = await fetchBatch(0)

      if (batch.tasks.length === 0) {
        return
      }

      const newTaskIds = new Set(batch.tasks.map(t => t.id))
      const hasNewTasksDetected = Array.from(newTaskIds).some(id => !lastTaskIdsRef.current.has(id))

      if (hasNewTasksDetected) {
        setHasNewTasks(true)
      }
    } catch {
      // Ignore background refresh errors
    }
  }, [userId, fetchBatch])

  const refetch = useCallback(async () => {
    setHasNewTasks(false)
    setAllFetchedTasks([])
    setHasMoreToFetch(true)
    lastTaskIdsRef.current.clear()
    await loadInitial()
  }, [loadInitial])

  const clearNewTasksFlag = useCallback(() => {
    setHasNewTasks(false)
    refetch()
  }, [refetch])

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
          const aTime = new Date(a.completedAt || a.createdAt || 0).getTime()
          const bTime = new Date(b.completedAt || b.createdAt || 0).getTime()
          return bTime - aTime
        })

        lastTaskIdsRef.current = new Set(sortedTasks.map(t => t.id))
        return sortedTasks
      })

      // Keep using API totalCount (doesn't change with pagination)
      setHasMoreToFetch(batch.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [hasMoreToFetch, fetchBatch, allFetchedTasks.length])

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
