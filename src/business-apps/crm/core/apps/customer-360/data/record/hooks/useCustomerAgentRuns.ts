/**
 * useCustomerAgentRuns — inbound-email agent runs that resolved to THIS
 * customer, surfaced under the customer's detail page.
 *
 * Reuses the same opt-in configuration as the home Inbound stream
 * (`useCustomer360InboundAgents`): only agents the user opted into Customer 360
 * are queried. Runs are matched to the subject by the persisted
 * `customer_ref` the backend wrote when the agent resolved the customer, so a
 * single email thread shows up under the exact account it was about.
 */

import { useCallback, useEffect, useState } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  WorkforceRun,
  WorkforceRunListParams
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import type { Customer360Subject, DomainHookResult } from '../../types'
import { useCustomer360InboundAgents } from './useCustomer360InboundAgents'

/** Safety cap on runs pulled per agent before filtering to this customer. */
const MAX_RUNS_PER_AGENT = 200

function runMatchesSubject(run: WorkforceRun, subjectId: string): boolean {
  const ref = run.customer_ref
  if (!ref?.customerId) return false
  return ref.customerId === subjectId && ref.customerType === 'account'
}

export function useCustomerAgentRuns(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<WorkforceRun[]> {
  const client = usePromptManagerClient(accessToken)
  const { agentIds, resolved, error: agentError } = useCustomer360InboundAgents(accessToken)
  const [data, setData] = useState<WorkforceRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  const loadRuns = useCallback(async () => {
    if (!accessToken || !subjectId || !resolved) return
    if (agentIds.length === 0) {
      setData([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const params: WorkforceRunListParams = {
        source: 'inbound_email',
        limit: MAX_RUNS_PER_AGENT,
        offset: 0
      }
      const pages = await Promise.all(agentIds.map(id => client.listWorkforceRuns(id, params)))
      const merged = pages.flatMap(result => result.data ?? [])
      const matched = merged.filter(run => runMatchesSubject(run, subjectId))
      matched.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      setData(matched)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agent runs.')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, agentIds, resolved, subjectId])

  useEffect(() => {
    loadRuns().catch(() => undefined)
  }, [loadRuns])

  return { data, loading: loading || !resolved, error: error ?? agentError }
}
