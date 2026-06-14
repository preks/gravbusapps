import { useEffect, useState } from 'react'
import type { Customer360Subject, CustomerCase, DomainHookResult } from '../../types'
import {
  CUSTOMER_SUPPORT_LIFECYCLE,
  listCustomerFlows,
  type CustomerFlowInstance
} from '../../network/customerFlowClient'

const CUSTOMER_SUPPORT_CASE_FALLBACK_TITLE = 'Customer Support Case'

function toCustomerSupportCase(flow: CustomerFlowInstance): CustomerCase {
  return {
    id: flow.id,
    title: flow.title || flow.templateName || CUSTOMER_SUPPORT_CASE_FALLBACK_TITLE,
    status: flow.status,
    type: CUSTOMER_SUPPORT_LIFECYCLE.serviceCase,
    createdAt: flow.createdAt,
    lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceCase
  }
}

/**
 * Lists Services-owned customer-support case workflows for the customer subject.
 * CRM remains source context; ownership comes from Services tags.
 */
export function useCustomerCases(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerCase[]> {
  const [data, setData] = useState<CustomerCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    let cancelled = false
    const loadCases = async () => {
      setLoading(true)
      setError(null)
      try {
        const caseFlows = await listCustomerFlows({
          accessToken,
          subjectId,
          lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceCase
        })
        if (cancelled) return
        setData(caseFlows.map(toCustomerSupportCase))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load cases')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCases()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId])

  return { data, loading, error }
}
