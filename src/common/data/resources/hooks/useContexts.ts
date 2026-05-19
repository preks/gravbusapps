import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { GetContextsParams, ContextWithActions } from '../types/context.types'
import type { ActionAssignmentDTO } from '../types/assignment.types'

interface UseContextsResult {
  contexts: ContextWithActions[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  loadMore: () => Promise<void>
  hasMore: boolean
  reset: () => void
  removeContext: (id: string) => void
}

export const useContexts = (context: BusinessAppContextProps, params?: GetContextsParams): UseContextsResult => {
  const [contexts, setContexts] = useState<ContextWithActions[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)
  const has401Error = useRef(false)
  const paramsRef = useRef(params)
  const hasLoadedRef = useRef(false)
  const currentOffsetRef = useRef(0)
  const isFetchingRef = useRef(false)

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Helper function to process assignments into contexts map
  const processAssignments = useCallback((assignmentsData: ActionAssignmentDTO[]): Map<string, ContextWithActions> => {
    const contextActionsMap = new Map<string, ContextWithActions>()

    assignmentsData.forEach((assignment: ActionAssignmentDTO) => {
      if (!assignment.context?.id) return

      const contextId = assignment.context.id

      if (!contextActionsMap.has(contextId)) {
        contextActionsMap.set(contextId, {
          assignmentId: assignment.id,
          context: assignment.context,
          actions: []
        })
      }

      if (assignment.assignments && Array.isArray(assignment.assignments)) {
        assignment.assignments.forEach(entry => {
          if (entry.flowItem) {
            contextActionsMap.get(contextId)!.actions.push({
              assignmentEntryId: entry.id,
              action: entry.flowItem,
              permission: entry.permission,
              rank: entry.rank,
              translation: entry.translation
            })
          }
        })
      }
    })

    return contextActionsMap
  }, [])

  // Helper function to check if error is 401
  const is401Error = useCallback((err: any): boolean => {
    return err?.response?.status === 401 || err?.status === 401 || err?.message?.includes('401')
  }, [])

  // Helper to update contexts state after successful fetch
  const updateContextsState = useCallback(
    (contextsWithActions: ContextWithActions[], totalRecords: number | undefined, append: boolean) => {
      if (append) {
        currentOffsetRef.current += contextsWithActions.length
        setContexts(prev => [...prev, ...contextsWithActions])
      } else {
        currentOffsetRef.current = contextsWithActions.length
        setContexts(contextsWithActions)
      }

      const total = totalRecords ?? contextsWithActions.length
      setTotalCount(total)
      hasLoadedRef.current = true
    },
    []
  )

  const fetchContexts = useCallback(
    async (append = false) => {
      // Prevent concurrent requests
      if (isFetchingRef.current) {
        return
      }

      if (!context.accessToken) {
        setError('Access token not available')
        setIsLoading(false)
        return
      }

      if (has401Error.current) {
        return
      }

      isFetchingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const currentParams = paramsRef.current || {}
        const restParams = { ...currentParams }
        delete restParams.offset
        delete restParams.limit
        const assignmentsPage = await resourceClient.action.getActionAssignments({
          ...restParams,
          returnTotalRecords: true,
          limit: paramsRef.current?.limit ?? 25,
          offset: append ? currentOffsetRef.current : 0
        })

        has401Error.current = false

        const assignmentsData = assignmentsPage?.data && Array.isArray(assignmentsPage.data) ? assignmentsPage.data : []
        const contextActionsMap = processAssignments(assignmentsData)
        const contextsWithActions: ContextWithActions[] = Array.from(contextActionsMap.values())

        updateContextsState(contextsWithActions, assignmentsPage?.paging?.totalRecords, append)
      } catch (err: any) {
        if (is401Error(err)) {
          has401Error.current = true
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contexts'
        setError(errorMessage)
        console.error('Error fetching contexts:', err)
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, resourceClient, processAssignments, is401Error, updateContextsState]
  )

  const refetch = useCallback(async () => {
    has401Error.current = false
    // Wait for any in-flight fetch (e.g. loadMore) to complete so refetch is not silently dropped
    while (isFetchingRef.current) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    currentOffsetRef.current = 0
    await fetchContexts(false)
  }, [fetchContexts])

  const loadMore = useCallback(async () => {
    if (contexts.length < (totalCount ?? 0)) {
      await fetchContexts(true)
    }
  }, [fetchContexts, contexts.length, totalCount])

  const reset = useCallback(() => {
    setContexts([])
    setTotalCount(null)
    setError(null)
    currentOffsetRef.current = 0
    has401Error.current = false
    hasLoadedRef.current = false
    isFetchingRef.current = false
  }, [])

  const removeContext = useCallback((id: string) => {
    setContexts(prev => prev.filter(item => item.context.id !== id))
    setTotalCount(count => Math.max(0, (count ?? 0) - 1))
    currentOffsetRef.current = Math.max(0, currentOffsetRef.current - 1)
  }, [])

  const hasMore = contexts.length < (totalCount ?? 0)

  return {
    contexts,
    totalCount: totalCount ?? 0,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    reset,
    removeContext
  }
}
