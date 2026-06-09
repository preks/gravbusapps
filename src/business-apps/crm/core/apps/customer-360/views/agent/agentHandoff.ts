/**
 * Customer360 → Every Fabric / Every AI context handoff.
 *
 * Builds the payload that pre-loads the current customer as agent context:
 *   - a user-visible `prompt` asking for a 360° briefing,
 *   - a hidden `additionInfo` block with a COMPACT, PII-safe snapshot summary
 *     (counts + numeric KPIs only — never journal/contract free-text or
 *     customer personal data beyond the display name),
 *   - the default `skills` for the customer_360 page context,
 *   - a `deepLinkBack` URL so an agent run can return the user to this app.
 *
 * The agent reads the full normalized snapshot via the `getCustomer360`
 * provider tool; this handoff only seeds the run with enough context to start.
 */

import { getDefaultSkillsForPage } from '@/business-apps/platform/apps/every-ai/utils/pageSkills'
import { buildCustomer360Url } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/crmRecordLinks'
import type { Customer360Snapshot, Customer360Subject } from '../../data/types'

export interface Customer360HandoffPayload {
  /** User-visible message seeded into the agent composer. */
  prompt: string
  /** Hidden, PII-safe context block forwarded with the request. */
  additionInfo: string
  /** Default skills to force-enable for the customer_360 page context. */
  skills: string[]
  /** Deep-link back into this Customer360 view (for the agent to reference). */
  deepLinkBack?: string
}

const CUSTOMER_360_ENTITY_NAME = 'customer_360'

function countOf(items: unknown[] | undefined): number {
  return items?.length ?? 0
}

function metric(label: string, value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') return null
  return `- ${label}: ${value}`
}

/**
 * Compact, PII-safe snapshot summary. Intentionally excludes free-text fields
 * (names, titles, summaries) to avoid leaking customer PII into hidden context.
 */
export function buildSnapshotContext(subject: Customer360Subject, snapshot: Customer360Snapshot): string {
  const lines: (string | null)[] = [
    `Customer 360 context for "${subject.displayName}"`,
    `- Subject type: ${subject.type}`,
    `- Subject id: ${subject.id}`,
    metric('Status', subject.status),
    metric('ICP score', snapshot.scores?.icpScore),
    metric('AI score', snapshot.scores?.aiScore),
    metric('Score label', snapshot.scores?.scoreLabel),
    metric('CSAT', snapshot.satisfaction?.csat),
    metric('NPS', snapshot.satisfaction?.nps),
    metric('Active contracts', countOf(snapshot.contracts)),
    metric('Open tickets', countOf(snapshot.tickets)),
    metric('Service cases', countOf(snapshot.cases)),
    metric('Reclamations', countOf(snapshot.reclamations)),
    metric('Invoices', countOf(snapshot.invoices)),
    metric('Open balance', snapshot.balance?.openAmount),
    metric('Overdue balance', snapshot.balance?.overdueAmount),
    metric('Lifetime value', snapshot.balance?.lifetimeValue),
    metric('Transactions', countOf(snapshot.transactions)),
    metric('Journal entries', countOf(snapshot.journal))
  ]

  return lines.filter((line): line is string => line !== null).join('\n')
}

/**
 * Build the full handoff payload for the current customer subject + snapshot.
 */
export function buildCustomer360Handoff(
  subject: Customer360Subject,
  snapshot: Customer360Snapshot
): Customer360HandoffPayload {
  const deepLinkBack = buildCustomer360Url(subject.type, subject.id, 'every-fabric')
  const skills = getDefaultSkillsForPage({
    type: 'entity',
    entity_name: CUSTOMER_360_ENTITY_NAME,
    id: subject.id
  })

  const prompt =
    `Give me a 360° briefing on ${subject.displayName} (${subject.type}). ` +
    `Summarize overall health, open service tickets/cases, contracts, and finances, then recommend next actions. ` +
    `Use the getCustomer360 tool with customerType="${subject.type}" and customerId="${subject.id}" to load the full snapshot.`

  const deepLinkLine = deepLinkBack ? `\n\nReturn link: ${deepLinkBack}` : ''
  const additionInfo = `${buildSnapshotContext(subject, snapshot)}${deepLinkLine}`

  return { prompt, additionInfo, skills, deepLinkBack }
}
