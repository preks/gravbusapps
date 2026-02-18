import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { PromptODM, PromptPage } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface UseTaskExpertsParams {
  workspaceId?: string | null
  search?: string | null
  sort?: string | null
  limit?: number
  offset?: number
  returnTotalRecords?: boolean
}

export interface UseTaskExpertsState {
  prompts: PromptODM[]
  total: number
  isLoading: boolean
  error: string | null
}

export const useTaskExperts = (context: BusinessAppContextProps, initialParams: UseTaskExpertsParams = {}) => {
  const client = usePromptManagerClient(context.accessToken)
  const [state, setState] = useState<UseTaskExpertsState>({ prompts: [], total: 0, isLoading: false, error: null })

  const params = useMemo(
    () => ({
      workspaceId: initialParams.workspaceId ?? null,
      promptName: initialParams.search ?? null,
      sort: initialParams.sort ?? null,
      limit: initialParams.limit ?? 20,
      offset: initialParams.offset ?? 0,
      returnTotalRecords: initialParams.returnTotalRecords ?? true
    }),
    [
      initialParams.workspaceId,
      initialParams.search,
      initialParams.sort,
      initialParams.limit,
      initialParams.offset,
      initialParams.returnTotalRecords
    ]
  )

  const load = useCallback(
    async (override?: Partial<UseTaskExpertsParams>) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      try {
        const response: PromptPage = await client.getPrompts({
          workspaceId: override?.workspaceId ?? params.workspaceId ?? null,
          promptName: override?.search ?? params.promptName ?? null,
          sort: override?.sort ?? params.sort ?? null,
          limit: override?.limit ?? params.limit,
          offset: override?.offset ?? params.offset,
          returnTotalRecords: override?.returnTotalRecords ?? params.returnTotalRecords
        } as any)

        setState(prev => ({
          ...prev,
          prompts: response.data,
          total: response.paging?.totalRecords ?? response.data.length,
          isLoading: false
        }))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load task experts'
        setState(prev => ({ ...prev, error: message, isLoading: false }))
      }
    },
    [client, params]
  )

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return {
    ...state,
    reload: load
  }
}
