import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ToolODM, ToolPage, ToolDetails } from '@/common/network/ai/prompt-manager/PromptManagerClient'

export interface UseToolsResult {
  items: ToolODM[]
  total: number
  isLoading: boolean
  error: string | null
  reload: (opts?: Partial<{ search: string; limit: number; offset: number }>) => Promise<void>
  create: (entry: ToolDetails) => Promise<ToolODM>
  update: (entryId: string, entry: ToolDetails) => Promise<ToolODM>
}

export const useTaskExpertToolsCatalog = (
  context: BusinessAppContextProps,
  initial: { search?: string; limit?: number; offset?: number } = {}
): UseToolsResult => {
  const client = usePromptManagerClient(context.accessToken)
  const [items, setItems] = useState<ToolODM[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limit = initial.limit ?? 20
  const offset = initial.offset ?? 0
  const search = initial.search ?? ''

  const reload = useCallback(
    async (opts?: Partial<{ search: string; limit: number; offset: number }>) => {
      setIsLoading(true)
      setError(null)
      try {
        const res: ToolPage = await client.getTools({
          toolName: opts?.search !== undefined ? opts.search || null : search || null,
          limit: opts?.limit ?? limit,
          offset: opts?.offset ?? offset,
          returnTotalRecords: true
        })
        setItems(res.data || [])
        setTotal(res.paging?.totalRecords ?? (res.data?.length || 0))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tools')
      } finally {
        setIsLoading(false)
      }
    },
    [client, limit, offset, search]
  )

  useEffect(() => {
    reload().catch(() => undefined)
  }, [reload])

  const create = useCallback(
    async (entry: ToolDetails) => {
      if (entry.type === 'mcp') {
        return client.createMcpTool(entry)
      } else {
        return client.createFunctionTool(entry)
      }
    },
    [client]
  )

  const update = useCallback(
    async (entryId: string, entry: ToolDetails) => {
      if (entry.type === 'mcp') {
        return client.putMcpTool(entryId, entry)
      } else {
        return client.putFunctionTool(entryId, entry)
      }
    },
    [client]
  )

  return {
    items,
    total,
    isLoading,
    error,
    reload,
    create,
    update
  }
}

export default useTaskExpertToolsCatalog
