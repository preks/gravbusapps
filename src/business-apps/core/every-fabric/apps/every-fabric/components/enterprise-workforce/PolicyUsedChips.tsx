// "Policies used" chips for a Workforce run.
//
// Surfaces every `policy_applied` trace event the agent emitted so a reviewer
// can see, at a glance, which intranet policies informed the run — with a
// deep-link back to the policy/knowledge ref when one is resolvable.

import { BookOpenTextIcon } from '@phosphor-icons/react'
import React, { useMemo } from 'react'
import { buildPolicyDetailUrl, isPolicyUuid } from './policyLink'
import type { WorkforceRunTraceEvent } from './workforceTypes'

export interface PolicyUsedChipsProps {
  trace: readonly WorkforceRunTraceEvent[] | undefined
}

export interface PolicyChip {
  policyId: string
  title: string
}

// Turn a policy ref into a human label. Prefer a real provided title; otherwise
// humanise the slug: `policy.insurance.disclosure.v1` -> "Insurance Disclosure · v1".
export function humanizePolicyTitle(policyId: string, rawTitle?: string | null): string {
  const title = typeof rawTitle === 'string' ? rawTitle.trim() : ''
  if (title && title !== policyId) return title

  const parts = policyId
    .replace(/^policy\./i, '')
    .split('.')
    .filter(Boolean)
  const versionIndex = parts.findIndex(part => /^v\d+$/i.test(part))
  let version = ''
  if (versionIndex >= 0) {
    version = parts[versionIndex].toLowerCase()
    parts.splice(versionIndex, 1)
  }
  const words = parts
    .join(' ')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase())
  const label = words || policyId
  return version ? `${label} · ${version}` : label
}

// Parse the `policy_list` tool result (a JSON array of `{policy_id, title}`)
// the agent emits when it consults the available policies for a run.
function parsePolicyList(content: unknown): Array<{ policyId: string; title?: string }> {
  if (typeof content !== 'string') return []
  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(item => {
        const row = (item ?? {}) as Record<string, unknown>
        const policyId = typeof row.policy_id === 'string' ? row.policy_id : ''
        const title = typeof row.title === 'string' ? row.title : undefined
        return { policyId, title }
      })
      .filter(row => row.policyId)
  } catch {
    return []
  }
}

// Surface every policy the run *applied* (`policy_applied`) or *consulted*
// (`policy_list` tool call) so reviewers see which intranet policies informed
// the decision — deep-linked when the ref resolves to an intranet uuid.
export function derivePolicies(trace: readonly WorkforceRunTraceEvent[] | undefined): PolicyChip[] {
  if (!trace || trace.length === 0) return []
  const byId = new Map<string, PolicyChip>()
  const add = (policyId: string, rawTitle?: string | null): void => {
    if (!policyId || byId.has(policyId)) return
    byId.set(policyId, { policyId, title: humanizePolicyTitle(policyId, rawTitle) })
  }

  for (const event of trace) {
    if (event.type === 'policy_applied') {
      const policy = (event.policy as Record<string, unknown> | undefined) ?? {}
      const policyId = typeof policy.policy_id === 'string' ? policy.policy_id : ''
      add(policyId, typeof policy.title === 'string' ? policy.title : undefined)
      continue
    }
    if (event.type === 'agent_chunk' && event.tool_name === 'policy_list') {
      for (const row of parsePolicyList(event.content)) {
        add(row.policyId, row.title)
      }
    }
  }
  return Array.from(byId.values())
}

export const PolicyUsedChips: React.FC<PolicyUsedChipsProps> = ({ trace }) => {
  const policies = useMemo(() => derivePolicies(trace), [trace])
  if (policies.length === 0) return null

  return (
    <section data-testid="workforce-run-detail-policies">
      <h3 className="gba:mb-1.5 gba:text-xs gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        Policies
      </h3>
      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        {policies.map(policy => {
          const chipClass =
            'gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-sky-500/30 gba:bg-sky-500/5 gba:px-2.5 gba:py-1 gba:text-[11px] gba:font-medium gba:text-sky-700 gba:dark:text-sky-300'
          if (isPolicyUuid(policy.policyId)) {
            return (
              <a
                key={policy.policyId}
                href={buildPolicyDetailUrl(policy.policyId)}
                target="_blank"
                rel="noreferrer"
                className={`${chipClass} gba:hover:bg-sky-500/10`}
                title={`Open policy in a new tab (ID: ${policy.policyId})`}
                data-testid="workforce-policy-chip"
              >
                <BookOpenTextIcon className="gba:h-3.5 gba:w-3.5" />
                {policy.title}
              </a>
            )
          }
          return (
            <span
              key={policy.policyId}
              className={chipClass}
              title={policy.policyId}
              data-testid="workforce-policy-chip"
            >
              <BookOpenTextIcon className="gba:h-3.5 gba:w-3.5" />
              {policy.title}
            </span>
          )
        })}
      </div>
    </section>
  )
}
