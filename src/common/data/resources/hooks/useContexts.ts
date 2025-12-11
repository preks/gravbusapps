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
}

export const useContexts = (context: BusinessAppContextProps, params?: GetContextsParams): UseContextsResult => {
  const [contexts, setContexts] = useState<ContextWithActions[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null) // null = not loaded yet
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)
  const has401Error = useRef(false)
  const paramsRef = useRef(params)
  const hasLoadedRef = useRef(false)

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const fetchContexts = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token not available')
      setIsLoading(false)
      return
    }

    // Don't refetch if we have a 401 error
    if (has401Error.current) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use flow assignments as baseline - they already return contexts with their flows
      const assignmentsPage = await resourceClient.action.getActionAssignments({
        returnTotalRecords: true,
        ...paramsRef.current
      })

      // Reset 401 error flag on success
      has401Error.current = false

      // Transform assignments directly into ContextWithActions[]
      // Group by context ID to combine all flows for each context
      const contextActionsMap = new Map<string, ContextWithActions>()

      if (assignmentsPage?.data && Array.isArray(assignmentsPage.data)) {
        assignmentsPage.data.forEach((assignment: ActionAssignmentDTO) => {
          if (assignment.context?.id) {
            const contextId = assignment.context.id

            // Initialize context if not exists
            if (!contextActionsMap.has(contextId)) {
              contextActionsMap.set(contextId, {
                context: assignment.context,
                actions: []
              })
            }

            // Add all flows from this assignment to the context
            if (assignment.assignments && Array.isArray(assignment.assignments)) {
              assignment.assignments.forEach(entry => {
                if (entry.flowItem) {
                  contextActionsMap.get(contextId)!.actions.push({
                    action: entry.flowItem,
                    permission: entry.permission,
                    rank: entry.rank,
                    translation: entry.translation
                  })
                }
              })
            }
          }
        })
      }

      // Convert map to array
      const contextsWithActions: ContextWithActions[] = Array.from(contextActionsMap.values())

      setContexts(contextsWithActions)
      const total = assignmentsPage?.paging?.totalRecords ?? contextsWithActions.length
      setTotalCount(total)
      hasLoadedRef.current = true
    } catch (err: any) {
      // Check if it's a 401 error
      if (err?.response?.status === 401 || err?.status === 401 || (err?.message && err.message.includes('401'))) {
        has401Error.current = true
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contexts'
      setError(errorMessage)
      console.error('Error fetching contexts:', err)
      // Only set to 0 if we've already loaded before (preserve previous count during retry)
      if (hasLoadedRef.current) {
        setContexts([])
        setTotalCount(0)
      }
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, resourceClient])

  // Don't load automatically - only when refetch() is called
  // This enables lazy loading based on active view

  const refetch = useCallback(async () => {
    has401Error.current = false
    await fetchContexts()
  }, [fetchContexts])

  return {
    contexts,
    totalCount: totalCount ?? null, // Return null if not loaded yet (DataDisplay will show loading)
    isLoading,
    error,
    refetch
  }
}
