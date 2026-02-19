/**
 * Hook to fetch the list of orchestration plans (GET /orchestration/plans).
 */

import { useCallback, useEffect, useState } from 'react'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import type { BuildPlan, ListPlansParams, ListPlansResponse } from '../types'

export interface UseListPlansOptions {
  accessToken: string
  params?: ListPlansParams
  enabled?: boolean
}

export interface UseListPlansResult {
  data: BuildPlan[]
  paging: ListPlansResponse['paging'] | null
  links: ListPlansResponse['_links'] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_PARAMS: ListPlansParams = {
  limit: 25,
  offset: 0,
  sort: '-createdAt'
}

export function useListPlans({
  accessToken,
  params = DEFAULT_PARAMS,
  enabled = true
}: UseListPlansOptions): UseListPlansResult {
  const [data, setData] = useState<BuildPlan[]>([])
  const [paging, setPaging] = useState<ListPlansResponse['paging'] | null>(null)
  const [links, setLinks] = useState<ListPlansResponse['_links'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const client = new OrchestratorClient(accessToken)
      const response = await client.listPlans(params)
      setData(response.data ?? [])
      setPaging(response.paging ?? null)
      setLinks(response._links ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setData([])
      setPaging(null)
      setLinks(null)
    } finally {
      setLoading(false)
    }
  }, [accessToken, params?.limit, params?.offset, params?.sort])

  useEffect(() => {
    if (enabled && accessToken) {
      fetchPlans()
    } else {
      setLoading(false)
    }
  }, [enabled, accessToken, fetchPlans])

  return { data, paging, links, loading, error, refetch: fetchPlans }
}
