/**
 * useInboundCustomerMatches — view-time fallback customer resolution.
 *
 * For inbound runs that carry no persisted `customer_ref` (and no derivable
 * `case_ref`), resolve the sender email to a CRM account/contact in the
 * browser with the viewer's token. Results are cached per email for the
 * lifetime of the view, so paging back and forth never re-queries.
 */
import { useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import { readSenderEmail } from './inboundRunFields'
import { resolveCustomerByEmail, type InboundCustomerMatch } from './resolveCustomersByEmail'

/** Cap per render pass — an Inbound page is 25 runs; senders repeat heavily. */
const MAX_LOOKUPS_PER_PASS = 15

function runNeedsFallback(run: WorkforceRun): boolean {
  if (run.customer_ref?.customerId) return false
  const entity = (run.case_ref?.entity_type ?? '').toLowerCase()
  if (run.case_ref?.record_id && (entity === 'account' || entity === 'contact')) return false
  return true
}

/** Map of lowercased sender email -> resolved customer (misses are cached as null). */
export function useInboundCustomerMatches(
  accessToken: string,
  runs: WorkforceRun[]
): Record<string, InboundCustomerMatch> {
  const client = useGraphQLClient(accessToken)
  const cacheRef = useRef<Map<string, InboundCustomerMatch | null>>(new Map())
  const [matches, setMatches] = useState<Record<string, InboundCustomerMatch>>({})

  useEffect(() => {
    if (!accessToken || runs.length === 0) return undefined
    const cache = cacheRef.current
    const pending = Array.from(new Set(runs.filter(runNeedsFallback).map(readSenderEmail).filter(Boolean)))
      .filter(email => !cache.has(email))
      .slice(0, MAX_LOOKUPS_PER_PASS)
    if (pending.length === 0) return undefined

    let cancelled = false
    const resolveAll = async () => {
      await Promise.all(
        pending.map(async email => {
          try {
            const match = await resolveCustomerByEmail(client, email)
            cache.set(email, match)
          } catch {
            // Leave uncached so a later pass can retry transient failures.
          }
        })
      )
      if (cancelled) return
      const resolved: Record<string, InboundCustomerMatch> = {}
      cache.forEach((value, key) => {
        if (value) resolved[key] = value
      })
      setMatches(resolved)
    }
    void resolveAll()
    return () => {
      cancelled = true
    }
  }, [accessToken, client, runs])

  return matches
}
