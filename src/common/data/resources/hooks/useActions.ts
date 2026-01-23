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
  loadMore: () => Promise<void>
  hasMore: boolean
  reset: () => void
}

export const useActions = (context: BusinessAppContextProps, params?: GetActionsParams): UseActionsResult => {
  const [actions, setActions] = useState<ActionWithContexts[]>([])
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resourceClient = useResourceClient(context.accessToken)
  const has401Error = useRef(false)
  const paramsRef = useRef(params)
  const hasLoadedRef = useRef(false)
  const currentOffsetRef = useRef(0)
  const lastSearchSortRef = useRef<string>('')
  const isFetchingRef = useRef(false)

  // Update params ref when params change
  useEffect(() => {
    paramsRef.current = params
  }, [params])

  // Check if search/sort params changed (requires reset)
  useEffect(() => {
    const searchSortKey = `${params?.flowName || ''}-${params?.sort || ''}`
    if (searchSortKey !== lastSearchSortRef.current) {
      lastSearchSortRef.current = searchSortKey
      currentOffsetRef.current = 0
      setActions([])
    }
  }, [params?.flowName, params?.sort])

  const fetchActions = useCallback(
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
        const { ...restParams } = paramsRef.current || {}
        const actionParams: GetActionsParams = {
          ...restParams,
          returnTotalRecords: true,
          limit: paramsRef.current?.limit ?? 20,
          offset: append ? currentOffsetRef.current : 0
        }

        const actionsPage = await resourceClient.action.getActions(actionParams)
        has401Error.current = false

        const actionsWithContexts: ActionWithContexts[] = (actionsPage?.data || []).map((action: ActionDTO) => ({
          action,
          contexts: []
        }))

        const total = actionsPage?.paging?.totalRecords ?? 0

        // Update offset IMMEDIATELY before setState to prevent race conditions with IntersectionObserver
        if (append) {
          currentOffsetRef.current += actionsWithContexts.length
          setActions(prev => [...prev, ...actionsWithContexts])
        } else {
          currentOffsetRef.current = actionsWithContexts.length
          setActions(actionsWithContexts)
        }

        setTotalCount(total)
        hasLoadedRef.current = true
      } catch (err: any) {
        if (err?.response?.status === 401 || err?.status === 401 || (err?.message && err.message.includes('401'))) {
          has401Error.current = true
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch actions'
        setError(errorMessage)
        console.error('Error fetching actions:', err)

        if (!append && hasLoadedRef.current) {
          setActions([])
          setTotalCount(0)
        }
      } finally {
        setIsLoading(false)
        isFetchingRef.current = false
      }
    },
    [context.accessToken, resourceClient]
  )

  const refetch = useCallback(async () => {
    has401Error.current = false
    currentOffsetRef.current = 0
    await fetchActions(false)
  }, [fetchActions])

  const loadMore = useCallback(async () => {
    if (actions.length < (totalCount ?? 0)) {
      await fetchActions(true)
    }
  }, [fetchActions, actions.length, totalCount])

  const reset = useCallback(() => {
    setActions([])
    setTotalCount(null)
    setError(null)
    currentOffsetRef.current = 0
    has401Error.current = false
    hasLoadedRef.current = false
    isFetchingRef.current = false
  }, [])

  const hasMore = actions.length < (totalCount ?? 0)

  return {
    actions,
    totalCount: totalCount ?? 0,
    isLoading,
    error,
    refetch,
    loadMore,
    hasMore,
    reset
  }
}
