import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useResourceClient } from '@/common/network/resources/useResourceClient'
import type { ActionDTO, GetActionsParams, ActionWithContexts } from '../types/action.types'

interface UseActionsResult {
  actions: ActionWithContexts[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useActions = (context: BusinessAppContextProps, params?: GetActionsParams): UseActionsResult => {
  const [actions, setActions] = useState<ActionWithContexts[]>([])
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

  const fetchActions = useCallback(async () => {
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
      // Always set returnTotalRecords=true and ensure limit/offset are included
      const actionParams: GetActionsParams = {
        ...paramsRef.current,
        returnTotalRecords: true,
        limit: paramsRef.current?.limit ?? 20,
        offset: paramsRef.current?.offset ?? 0
      }

      // Fetch actions only (contexts are managed in context sub-view)
      const actionsPage = await resourceClient.action.getActions(actionParams)

      // Reset 401 error flag on success
      has401Error.current = false

      // Combine actions with empty contexts (contexts are managed separately in context sub-view)
      const actionsWithContexts: ActionWithContexts[] = (actionsPage?.data || []).map((action: ActionDTO) => ({
        action,
        contexts: []
      }))

      setActions(actionsWithContexts)
      const total = actionsPage?.paging?.totalRecords ?? 0
      setTotalCount(total)
      hasLoadedRef.current = true
    } catch (err: any) {
      // Check if it's a 401 error
      if (err?.response?.status === 401 || err?.status === 401 || (err?.message && err.message.includes('401'))) {
        has401Error.current = true
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch actions'
      setError(errorMessage)
      console.error('Error fetching actions:', err)
      // Only set to 0 if we've already loaded before (preserve previous count during retry)
      if (hasLoadedRef.current) {
        setActions([])
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
    await fetchActions()
  }, [fetchActions])

  return {
    actions,
    totalCount: totalCount ?? null, // Return null if not loaded yet (DataDisplay will show loading)
    isLoading,
    error,
    refetch
  }
}
