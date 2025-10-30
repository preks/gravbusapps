/**
 * useCompletedTasks Hook
 * Fetches completed tasks from both CFlow and Kogito using the unified API
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
}

export const useCompletedTasks = (context: BusinessAppContextProps): UseCompletedTasksResult => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentOffset, setCurrentOffset] = useState(0)

  // Use Keycloak user ID
  const userId = context.userInfo?.id || ''

  // Track whether we've made the initial fetch
  const hasInitialFetchRef = useRef(false)

  // Track last task data to avoid unnecessary re-renders
  const lastTaskDataRef = useRef<string>('')

  const ITEMS_PER_PAGE = 50

  /**
   * Load completed tasks from unified API
   */
  const loadTasks = useCallback(
    async (append = false) => {
      if (!userId) {
        console.log('[EveryBox] No userId available, skipping completed tasks fetch')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const offset = append ? currentOffset : 0
        console.log(`[EveryBox] Fetching completed tasks for user: ${userId}, offset: ${offset}`)

        // Fetch COMPLETED tasks using dedicated endpoint
        // This uses the /completed endpoint which filters by task_business_status (not task_conductor_status)
        const response = await fetchCompletedUserTasks(userId, context.accessToken || '', {
          limit: ITEMS_PER_PAGE,
          offset,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })

        console.log(
          `[EveryBox] Fetched ${response.tasks.length} completed tasks using dedicated endpoint, total: ${response.totalCount}`
        )

        // Log source breakdown
        const kogitoCount = response.tasks.filter(t => t.source === 'kogito').length
        const cflowCount = response.tasks.filter(t => t.source === 'cflow').length
        console.log(`[EveryBox] Completed - Kogito tasks: ${kogitoCount}, CFlow tasks: ${cflowCount}`)

        // Only update state if data has actually changed (optimization for polling)
        const newTaskData = JSON.stringify({
          tasks: response.tasks.map(t => ({ id: t.id, status: t.status, createdAt: t.createdAt })),
          totalCount: response.totalCount
        })

        if (newTaskData !== lastTaskDataRef.current || append) {
          console.log('[EveryBox] Completed task data changed, updating state')
          lastTaskDataRef.current = newTaskData
          setTasks(prev => (append ? [...prev, ...response.tasks] : response.tasks))
          setTotalCount(response.totalCount)
          setCurrentOffset(append ? offset + response.tasks.length : response.tasks.length)
        } else {
          console.log('[EveryBox] No changes in completed task data, skipping state update')
        }

        // Log any warnings or errors
        if (response.warnings && response.warnings.length > 0) {
          console.warn('[EveryBox] Warnings:', response.warnings)
        }
        if (response.errors && response.errors.length > 0) {
          console.error('[EveryBox] Errors:', response.errors)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load completed tasks'
        setError(errorMessage)
        console.error('[EveryBox] Error loading completed tasks:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [userId, context.accessToken, currentOffset]
  )

  /**
   * Load more tasks (pagination)
   */
  const loadMore = useCallback(async () => {
    await loadTasks(true)
  }, [loadTasks])

  /**
   * Refetch from start
   */
  const refetch = useCallback(async () => {
    setCurrentOffset(0)
    await loadTasks(false)
  }, [loadTasks])

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (!hasInitialFetchRef.current && userId) {
      hasInitialFetchRef.current = true
      loadTasks(false)
    }
  }, [userId, loadTasks])

  const hasMore = currentOffset < totalCount

  return {
    tasks,
    totalCount,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore
  }
}
