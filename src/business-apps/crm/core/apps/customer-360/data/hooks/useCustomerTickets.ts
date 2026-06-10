import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerTicket, DomainHookResult } from '../types'
import { listCustomerFlows } from '../network/customerFlowClient'

/**
 * Lists service tickets as custom-flow-engine flow instances correlated to the
 * customer subject. See `listCustomerFlows` for the correlation contract.
 */
export function useCustomerTickets(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerTicket[]> {
  const [data, setData] = useState<CustomerTicket[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id
  const subjectType = subject?.type

  useEffect(() => {
    if (!subjectId || !subjectType || !accessToken) {
      setData([])
      return
    }

    let cancelled = false
    const loadTickets = async () => {
      setLoading(true)
      setError(null)
      try {
        const flows = await listCustomerFlows({ accessToken, subjectType, subjectId })
        if (cancelled) return
        setData(
          flows.map(flow => ({
            id: flow.id,
            title: flow.title || flow.templateName,
            status: flow.status,
            priority: flow.priority,
            createdAt: flow.createdAt
          }))
        )
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load tickets')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTickets()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId, subjectType])

  return { data, loading, error }
}
