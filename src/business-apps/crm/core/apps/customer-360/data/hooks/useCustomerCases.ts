import { useEffect, useState } from 'react'
import { CaseApiClient } from '@/business-apps/common/apps/case-management/services/CaseApiClient'
import type { Case } from '@/business-apps/common/apps/case-management/types'
import type { Customer360Subject, CustomerCase, DomainHookResult } from '../types'

export const CRM_CASE_APP_TAG = 'AppCatalog:1:CRM'
const RECLAMATION_KEYWORDS = ['reclamation', 'complaint', 'beschwerde', 'reclamatie', 'reklamation']

/** Heuristic: a case is a reclamation/complaint when its title or description matches. */
export function isReclamationCase(customerCase: CustomerCase): boolean {
  return customerCase.type === 'reclamation'
}

function detectReclamation(caseRecord: Case): boolean {
  const title = caseRecord.state.metadata?.title?.toLowerCase() ?? ''
  const description = caseRecord.state.metadata?.description?.toLowerCase() ?? ''
  return RECLAMATION_KEYWORDS.some(keyword => title.includes(keyword) || description.includes(keyword))
}

function toCustomerCase(caseRecord: Case): CustomerCase {
  return {
    id: caseRecord.caseId,
    title: caseRecord.state.metadata?.title,
    status: caseRecord.state.metadata?.status,
    type: detectReclamation(caseRecord) ? 'reclamation' : 'case',
    createdAt: caseRecord.createdAt
  }
}

/**
 * Lists flow-engine cases for the customer subject (tagged for CRM and scoped to
 * the subject via entity tags). Reclamations are flagged via `type` so the
 * orchestrator can surface them in their own slice.
 */
export function useCustomerCases(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerCase[]> {
  const [data, setData] = useState<CustomerCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id
  const subjectType = subject?.type

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
        const client = new CaseApiClient(undefined, accessToken)
        const { cases } = await client.getCasesList({
          tags: { app: CRM_CASE_APP_TAG, entityType: subjectType ?? 'account', entityId: subjectId }
        })
        if (cancelled) return
        setData(cases.map(toCustomerCase))
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
  }, [accessToken, subjectId, subjectType])

  return { data, loading, error }
}
