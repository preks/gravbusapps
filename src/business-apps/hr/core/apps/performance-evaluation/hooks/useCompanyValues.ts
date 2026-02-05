import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_COMPANY_VALUES,
  type GetCompanyValuesResponse,
  type CompanyValueApi
} from '../queries/performanceCycleQueries'
import type { ValueItemStored } from '../types'

function mapApiValueToUi(api: CompanyValueApi): ValueItemStored {
  return {
    id: api.id,
    version: api.version ?? undefined,
    title: api.title ?? '',
    description: api.description ?? '',
    recordState: api.recordState ?? ''
  }
}

export interface UseCompanyValuesResult {
  values: ValueItemStored[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCompanyValues(accessToken: string | undefined): UseCompanyValuesResult {
  const graphqlClient = useGraphqlClient(accessToken)
  const [values, setValues] = useState<ValueItemStored[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchValues = useCallback(async () => {
    if (!accessToken) {
      setValues([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const result = await graphqlClient.request<GetCompanyValuesResponse>(GET_COMPANY_VALUES)
      const list = result?.CompanyValue ?? []
      setValues(list.map(mapApiValueToUi))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load company values'
      setError(message)
      setValues([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchValues()
  }, [fetchValues])

  return { values, loading, error, refetch: fetchValues }
}
