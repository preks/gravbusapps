/**
 * useCaseAnalytics Hook
 *
 * Hook for fetching case analytics and KPIs
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { CaseAnalytics } from '../types'
import { CaseApiClient } from '../services'

const BASE_URL =
  import.meta.env.VITE_CFLOW_ENGINE_URL ||
  import.meta.env.NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL ||
  'http://localhost:3000'

export const useCaseAnalytics = (appTag: string, context: BusinessAppContextProps) => {
  const [analytics, setAnalytics] = useState<CaseAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)

      const client = new CaseApiClient(BASE_URL, context.accessToken)
      const data = await client.getCaseAnalytics({ tags: { app: appTag } })

      setAnalytics(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'))
    } finally {
      setIsLoading(false)
    }
  }, [appTag, context.accessToken])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics
  }
}
