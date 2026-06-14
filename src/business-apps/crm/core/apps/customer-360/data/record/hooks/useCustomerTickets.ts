import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerTicket, DomainHookResult } from '../../types'
import { CUSTOMER_SUPPORT_LIFECYCLE, listCustomerFlows } from '../../network/customerFlowClient'

const CUSTOMER_SUPPORT_TICKET_FALLBACK_TITLE = 'Customer Support Ticket'

/**
 * Lists Services-owned customer-support ticket workflows correlated to the
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

  useEffect(() => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    let cancelled = false
    const loadTickets = async () => {
      setLoading(true)
      setError(null)
      try {
        const flows = await listCustomerFlows({
          accessToken,
          subjectId,
          lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket
        })
        if (cancelled) return
        setData(
          flows.map(flow => ({
            id: flow.id,
            title: flow.title || flow.templateName || CUSTOMER_SUPPORT_TICKET_FALLBACK_TITLE,
            status: flow.status,
            priority: flow.priority,
            createdAt: flow.createdAt,
            lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket
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
  }, [accessToken, subjectId])

  return { data, loading, error }
}
