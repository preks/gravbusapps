import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerReclamation, DomainHookResult } from '../../types'
import {
  CUSTOMER_SUPPORT_LIFECYCLE,
  listCustomerFlows,
  type CustomerFlowInstance
} from '../../network/customerFlowClient'

const CUSTOMER_RECLAMATION_FALLBACK_TITLE = 'Customer Reclamation'

function toCustomerReclamation(flow: CustomerFlowInstance): CustomerReclamation {
  return {
    id: flow.id,
    title: flow.title || flow.templateName || CUSTOMER_RECLAMATION_FALLBACK_TITLE,
    status: flow.status,
    createdAt: flow.createdAt,
    lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.reclamation
  }
}

/**
 * Lists Services-owned customer reclamation workflows for the customer subject.
 * CRM remains source context; ownership comes from Services tags.
 */
export function useCustomerReclamations(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerReclamation[]> {
  const [data, setData] = useState<CustomerReclamation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    let cancelled = false
    const loadReclamations = async () => {
      setLoading(true)
      setError(null)
      try {
        const flows = await listCustomerFlows({
          accessToken,
          subjectId,
          lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.reclamation
        })
        if (cancelled) return
        setData(flows.map(toCustomerReclamation))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load reclamations')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReclamations()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId])

  return { data, loading, error }
}
