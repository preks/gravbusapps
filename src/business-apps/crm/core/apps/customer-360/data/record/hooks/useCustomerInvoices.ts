import { useEffect, useState } from 'react'
import { billingApiEnabled, listInvoices } from '@/business-apps/fin/billing/common/invoices/network/invoiceClient'
import type { Invoice } from '@/business-apps/fin/billing/common/types'
import type { Customer360Subject, CustomerInvoice, DomainHookResult } from '../../types'

function toCustomerInvoice(invoice: Invoice): CustomerInvoice {
  return {
    id: invoice.id,
    number: invoice.invoiceNumber ?? undefined,
    status: invoice.status,
    amount: invoice.totals.grossTotal,
    currency: invoice.currency,
    issuedDate: invoice.issueDate ?? undefined,
    dueDate: invoice.dueDate ?? undefined
  }
}

export function useCustomerInvoices(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerInvoice[]> {
  const [data, setData] = useState<CustomerInvoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken || !billingApiEnabled()) {
      setData([])
      return
    }

    let cancelled = false
    const loadInvoices = async () => {
      setLoading(true)
      setError(null)
      try {
        const invoices = await listInvoices(accessToken)
        const accountInvoices = invoices.filter(invoice => invoice.crmAccountId === subjectId).map(toCustomerInvoice)
        if (!cancelled) setData(accountInvoices)
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
  }, [accessToken, subjectId])

  return { data, loading, error }
}
