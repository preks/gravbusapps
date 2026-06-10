import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerTransaction, DomainHookResult } from '../types'
import { fetchCustomerTransactions, fibuIntegrationEnabled } from '../network/fibuClient'

/**
 * Fetches the transaction history from NewWork Connect (Fibu). Mirrors
 * `useCustomerInvoices`: empty (no error) until the integration is configured.
 */
export function useCustomerTransactions(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerTransaction[]> {
  const [data, setData] = useState<CustomerTransaction[]>([])
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
    const loadTransactions = async () => {
      setLoading(true)
      setError(null)
      try {
        const transactions = await fetchCustomerTransactions({ accessToken, subjectType, subjectId })
        if (!cancelled) setData(transactions)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTransactions()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId, subjectType])

  return { data, loading, error }
}
