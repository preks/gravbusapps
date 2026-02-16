import { useCallback, useEffect, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  ExecutionRun,
  ExecutionRunPage,
  ExecutionRunStatus
} from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface UseExecutionRunsParams {
  promptId?: string | null
  status?: ExecutionRunStatus | string | null
  policyRootId?: string | null
  tag?: string | null
  toolName?: string | null
  createdAtFrom?: string | null
  createdAtTo?: string | null
  limit?: number
  offset?: number
  returnTotalRecords?: boolean
}

export interface UseExecutionRunsState {
  runs: ExecutionRun[]
  total: number
  isLoading: boolean
  error: string | null
}

export const useExecutionRuns = (context: BusinessAppContextProps, initialParams: UseExecutionRunsParams = {}) => {
  const client = usePromptManagerClient(context.accessToken)
  const [state, setState] = useState<UseExecutionRunsState>({ runs: [], total: 0, isLoading: false, error: null })

  const params = useMemo(
    () => ({
      promptId: initialParams.promptId ?? null,
      status: initialParams.status ?? null,
      policyRootId: initialParams.policyRootId ?? null,
      tag: initialParams.tag ?? null,
      toolName: initialParams.toolName ?? null,
      createdAtFrom: initialParams.createdAtFrom ?? null,
      createdAtTo: initialParams.createdAtTo ?? null,
      limit: initialParams.limit ?? 20,
      offset: initialParams.offset ?? 0,
      returnTotalRecords: initialParams.returnTotalRecords ?? true
    }),
    [
      initialParams.promptId,
      initialParams.status,
      initialParams.policyRootId,
      initialParams.tag,
      initialParams.toolName,
      initialParams.createdAtFrom,
      initialParams.createdAtTo,
      initialParams.limit,
      initialParams.offset,
      initialParams.returnTotalRecords
    ]
  )

  const load = useCallback(
    async (override?: Partial<UseExecutionRunsParams>) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      try {
        const res: ExecutionRunPage = await client.getExecutionRuns({
          promptId: override?.promptId ?? params.promptId,
          status: override?.status ?? params.status,
          policyRootId: override?.policyRootId ?? params.policyRootId,
          tag: override?.tag ?? params.tag,
          toolName: override?.toolName ?? params.toolName,
          createdAtFrom: override?.createdAtFrom ?? params.createdAtFrom,
          createdAtTo: override?.createdAtTo ?? params.createdAtTo,
          limit: override?.limit ?? params.limit,
          offset: override?.offset ?? params.offset,
          returnTotalRecords: override?.returnTotalRecords ?? params.returnTotalRecords
        })
        setState(prev => ({
          ...prev,
          runs: res.data || [],
          total: res.paging?.totalRecords ?? (res.data || []).length,
          isLoading: false
        }))
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load executions'
        setState(prev => ({ ...prev, error: message, isLoading: false }))
      }
    },
    [client, params]
  )

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  return { ...state, reload: load }
}
