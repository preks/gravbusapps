// Pure link builders for the run-detail header "linked context" row.
//
// Deliberately domain-agnostic: an agent may act on a CRM account, an HR
// employee, a finance invoice, or something with no navigable record at all.
// We resolve a deep link via the shared entity navigation map when the entity
// type is known (CRM today) and otherwise surface a plain id chip — never
// hardcoding CRM. Policies reuse the same `policy_applied` derivation + intranet
// link helper the body's PolicyUsedChips uses.

import {
  buildEntityNavigationUrl,
  getEntityDefaultTitle
} from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityNavigation'
import { derivePolicies } from '../PolicyUsedChips'
import { buildPolicyDetailUrl, isPolicyUuid } from '../policyLink'
import type { WorkforceRunCaseRef, WorkforceRunTraceEvent } from '../workforceTypes'

export interface RunLink {
  key: string
  /** Human label, e.g. "Account" (entity type) or the policy title. */
  label: string
  /** The record id (entity) — omitted from policy chips, which show the title. */
  value: string | null
  /** Raw entity type ("contact"/"account"/…) for entities; null for policies. */
  entityType: string | null
  /** Resolved display name for an entity (e.g. "Maria Schmidt"), when known. */
  name: string | null
  /** Resolved deep link, or null when the target is not navigable. */
  url: string | null
  kind: 'entity' | 'policy'
}

const NAV_SOURCE = 'workforce-run'

// Turn a `record_ids` key (e.g. "account_id") into its entity type ("account").
function entityTypeFromKey(key: string): string {
  return key.endsWith('_id') ? key.slice(0, -3) : key
}

// Resolve the primary case/entity the run acted on (plus any linkable record
// ids it carries) into header links. The primary entity always renders (as a
// chip if it is not navigable); extra record ids render only when they resolve
// to a real deep link, so non-CRM runs stay clean. A resolved display name
// (when present in `record_labels`) lets the UI show an avatar + name.
export function caseEntityLinks(caseRef: WorkforceRunCaseRef | null | undefined): RunLink[] {
  if (!caseRef) return []
  const links: RunLink[] = []
  const seen = new Set<string>()
  const labels = caseRef.record_labels ?? {}

  const push = (entityType: string | null | undefined, id: string | null | undefined, allowChip: boolean): void => {
    if (!entityType || !id) return
    const dedupKey = `${entityType}:${id}`
    if (seen.has(dedupKey)) return
    const url = buildEntityNavigationUrl(entityType, id, NAV_SOURCE) ?? null
    if (!url && !allowChip) return
    seen.add(dedupKey)
    links.push({
      key: `entity:${dedupKey}`,
      label: getEntityDefaultTitle(entityType),
      value: id,
      entityType,
      name: labels[id]?.trim() || null,
      url,
      kind: 'entity'
    })
  }

  push(caseRef.entity_type ?? caseRef.domain, caseRef.record_id, true)
  for (const [key, id] of Object.entries(caseRef.record_ids ?? {})) {
    push(entityTypeFromKey(key), id, false)
  }
  return links
}

export function policyRunLinks(trace: readonly WorkforceRunTraceEvent[] | undefined): RunLink[] {
  return derivePolicies(trace).map(policy => ({
    key: `policy:${policy.policyId}`,
    label: policy.title,
    value: null,
    entityType: null,
    name: null,
    url: isPolicyUuid(policy.policyId) ? buildPolicyDetailUrl(policy.policyId) : null,
    kind: 'policy'
  }))
}
