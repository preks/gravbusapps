import { useEffect, useState } from 'react'
import type { DomainHookResult } from '../types'
import { getCustomerFlowDetail, type CustomerFlowDetail } from '../network/customerFlowClient'

/**
 * Lazily loads the flow detail (steps + statuses + progress) for one service
 * ticket. Pass `flowId = null` while the row is collapsed — the fetch only
 * fires once a ticket is expanded.
 */
export function useCustomerTicketDetail(
  accessToken: string,
  flowId: string | null
): DomainHookResult<CustomerFlowDetail | null> {
  const [data, setData] = useState<CustomerFlowDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!flowId || !accessToken) {
      setData(null)
      return
    }

    let cancelled = false
    const loadDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const detail = await getCustomerFlowDetail({ accessToken, flowId })
        if (cancelled) return
        setData(detail)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load ticket detail')
        setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadDetail()
    return () => {
      cancelled = true
    }
  }, [accessToken, flowId])

  return { data, loading, error }
}
