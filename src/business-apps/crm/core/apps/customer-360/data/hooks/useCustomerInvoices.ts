import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerInvoice, DomainHookResult } from '../types'
import { fetchCustomerInvoices, fibuIntegrationEnabled } from '../network/fibuClient'

/**
 * Fetches invoices from NewWork Connect (Fibu). When the integration is not
 * configured the hook resolves to an empty slice without erroring, so the
 * Transactions & Fibu tab renders an awaiting-backend state.
 */
export function useCustomerInvoices(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerInvoice[]> {
  const [data, setData] = useState<CustomerInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id
  const subjectType = subject?.type

  useEffect(() => {
    if (!subjectId || !subjectType || !accessToken || !fibuIntegrationEnabled()) {
      setData([])
      return
    }

    let cancelled = false
    const loadInvoices = async () => {
      setLoading(true)
      setError(null)
      try {
        const invoices = await fetchCustomerInvoices({ accessToken, subjectType, subjectId })
        if (!cancelled) setData(invoices)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load invoices')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInvoices()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId, subjectType])

  return { data, loading, error }
}
