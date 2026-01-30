/**
 * useCaseData Hook
 *
 * Hook for fetching and managing case data with auto-refresh
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { Case, LinkedFlow } from '../types'
import { CaseApiClient } from '../services'
import { AUTO_REFRESH_INTERVAL } from '../utils'

const BASE_URL = import.meta.env.VITE_CFLOW_ENGINE_URL || window.location.origin

export const useCaseData = (caseId: string | null, context: BusinessAppContextProps) => {
  const [caseData, setCaseData] = useState<Case | null>(null)
  const [linkedFlows, setLinkedFlows] = useState<LinkedFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCaseData = useCallback(async () => {
    if (!caseId) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const client = new CaseApiClient(BASE_URL, context.accessToken)

      const [data, flows] = await Promise.all([client.getCaseById(caseId), client.getLinkedFlows(caseId)])

      setCaseData(data)
      setLinkedFlows(flows)
    } catch (err) {
      console.error('Error fetching case data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch case data'))
    } finally {
      setIsLoading(false)
    }
  }, [caseId, context.accessToken])

  // Initial fetch
  useEffect(() => {
    fetchCaseData()
  }, [fetchCaseData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!caseId) return

    const interval = setInterval(() => {
      fetchCaseData()
    }, AUTO_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [caseId, fetchCaseData])

  return {
    caseData,
    linkedFlows,
    isLoading,
    error,
    refetch: fetchCaseData
  }
}
