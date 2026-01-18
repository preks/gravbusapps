/**
 * useBlinkTasks Hook
 * Fetches blink tasks from CFlow using tag filtering
 * Returns accurate totalCount for badge and tasks for the Blinks tab
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchCflowBlinkTasks } from '@/business-apps/core/every/apps/every-api/utils/CflowClient'
import { adaptCflowTasks } from '@/business-apps/core/every/apps/every-api/services/TaskAdapterService'
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'

interface UseBlinkTasksResult {
  tasks: UnifiedTask[]
  totalCount: number
  isLoading: boolean
  error: string | null
  hasMore: boolean
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
}

const BLINK_FETCH_SIZE = 20

export const useBlinkCount = (
  context: BusinessAppContextProps
): { count: number; isLoading: boolean; error: string | null; refetch: () => Promise<void> } => {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = context.userInfo?.id || ''
  const hasFetchedRef = useRef(false)

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch with limit=1 just to get the totalCount from the response
      const result = await fetchCflowBlinkTasks(userId, context.accessToken, {
        limit: '1' // We only need the totalCount, not the tasks
      })

      setCount(result.totalCount)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blink count'
      setError(errorMessage)
      console.error('[useBlinkCount] Error:', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [userId, context.accessToken])

  // Initial fetch
  useEffect(() => {
    if (!hasFetchedRef.current && userId) {
      hasFetchedRef.current = true
      fetchCount()
    }
  }, [userId, fetchCount])

  return {
    count,
    isLoading,
    error,
    refetch: fetchCount
  }
}

/**
 * Hook to fetch blink tasks for the Blinks tab
 */
export const useBlinkTasks = (context: BusinessAppContextProps): UseBlinkTasksResult => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  const userId = context.userInfo?.id || ''

  const fetchTasks = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (!userId) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchCflowBlinkTasks(userId, context.accessToken, {
          limit: BLINK_FETCH_SIZE.toString(),
          offset: currentOffset.toString()
        })

        const adaptedTasks = adaptCflowTasks(result.tasks)

        if (append) {
          setTasks(prev => [...prev, ...adaptedTasks])
        } else {
          setTasks(adaptedTasks)
        }

        setTotalCount(result.totalCount)
        setHasMore(result.hasMore)
        setOffset(currentOffset + result.tasks.length)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blink tasks'
        setError(errorMessage)
        console.error('[useBlinkTasks] Error:', errorMessage)
      } finally {
        setIsLoading(false)
      }
    },
    [userId, context.accessToken]
  )

  // Initial fetch on mount
  const blinkFetchedRef = useRef(false)
  useEffect(() => {
    if (!blinkFetchedRef.current && userId) {
      blinkFetchedRef.current = true
      fetchTasks(0, false)
    }
  }, [userId, fetchTasks])

  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchTasks(0, false)
  }, [fetchTasks])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchTasks(offset, true)
  }, [fetchTasks, offset, hasMore, isLoading])

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    hasMore,
    refetch,
    loadMore
  }
}
