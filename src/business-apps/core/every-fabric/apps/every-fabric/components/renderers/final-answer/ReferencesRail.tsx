import React, { useMemo } from 'react'
import EntityLink, { SUPPORTED_PROTOCOLS } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import type { EntityReference } from '../../../types/enterpriseAgent'
import { EntityReferenceCard } from './reference-cards'
import { isEmphasized } from './reference-cards/referenceCardUtils'

/**
 * Display titles for the backend reference categories. Falls back to the raw
 * category string (title-cased) when a new category appears so the rail never
 * silently drops a group.
 */
const CATEGORY_LABELS: Record<string, string> = {
  person: 'People',
  hr: 'HR & Org',
  crm: 'CRM',
  finance: 'Finance',
  investment: 'Investments',
  document: 'Documents',
  content: 'Content',
  workflow: 'Workflows',
  platform_page: 'Pages',
  other: 'Other'
}

// Stable category ordering for the rail; unknown categories sort last.
const CATEGORY_ORDER = [
  'person',
  'crm',
  'hr',
  'finance',
  'investment',
  'document',
  'content',
  'workflow',
  'platform_page',
  'other'
]

const supportedProtocols = new Set<string>(SUPPORTED_PROTOCOLS)

const titleCase = (value: string): string =>
  value
    .split('_')
    .map(part => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')

export interface ReferencesRailProps {
  references?: EntityReference[]
  accessToken?: string
}

const categoryRank = (category: string): number => {
  const index = CATEGORY_ORDER.indexOf(category)
  return index === -1 ? CATEGORY_ORDER.length : index
}

/**
 * Minimum number of renderable references before the rail is shown. References
 * are extracted from the answer's own inline links, so the rail is always a
 * deduped echo of what is already in the prose. With a single entity that echo
 * is pure duplication (see the "who is my manager" case); the rail only earns
 * its weight as a consolidated jump-list once several entities are referenced.
 */
const MIN_REFERENCES_TO_SHOW = 2

/**
 * Per-category threshold for the rich-card layout. Cards are a high-signal
 * affordance (and each fires one by-id GraphQL request), so they only make
 * sense for a handful of key entities. When a category has more references than
 * this — e.g. "all accounts from Germany" returning 50 — that group degrades to
 * lightweight chips: no fan-out, compact, and still a useful jump-list.
 */
const MAX_CARDS_PER_GROUP = 12

/**
 * "References" rail rendered beneath the final answer. Groups the structured
 * entity references the backend extracted by category. Small, high-signal
 * groups render as rich, data-fetched cards (avatar, role, status, amount, ...)
 * via `EntityReferenceCard`; large groups fall back to lightweight `EntityLink`
 * chips to avoid GraphQL fan-out. References whose protocol the frontend cannot
 * resolve are filtered out so the rail never shows dead entries. Inline prose
 * mentions are untouched.
 */
export const ReferencesRail: React.FC<ReferencesRailProps> = ({ references, accessToken = '' }) => {
  // Renderable references, ordered so emphasized (answer-focus) entries come
  // first, then by category, with original order as a stable tiebreak, then
  // grouped by category preserving that order.
  const groups = useMemo(() => {
    const renderable = (references ?? [])
      .filter(ref => supportedProtocols.has(ref.type))
      .map((ref, index) => ({ ref, index }))
      .sort((a, b) => {
        const emphasis = Number(isEmphasized(b.ref)) - Number(isEmphasized(a.ref))
        if (emphasis !== 0) return emphasis
        const category = categoryRank(a.ref.category) - categoryRank(b.ref.category)
        if (category !== 0) return category
        return a.index - b.index
      })
      .map(entry => entry.ref)

    const grouped: Array<[string, EntityReference[]]> = []
    const indexByCategory = new Map<string, number>()
    for (const ref of renderable) {
      const existing = indexByCategory.get(ref.category)
      if (existing === undefined) {
        indexByCategory.set(ref.category, grouped.length)
        grouped.push([ref.category, [ref]])
      } else {
        grouped[existing][1].push(ref)
      }
    }
    return grouped
  }, [references])

  const renderableCount = useMemo(() => groups.reduce((sum, [, refs]) => sum + refs.length, 0), [groups])

  if (renderableCount < MIN_REFERENCES_TO_SHOW) return null

  return (
    <div className="gba:pt-4 gba:mt-3 gba:border-t gba:border-border/70" data-testid="enterprise-agent-references-rail">
      <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:mb-3">
        References
      </p>
      <div className="gba:space-y-4">
        {groups.map(([category, refs]) => {
          const asChips = refs.length > MAX_CARDS_PER_GROUP
          return (
            <div key={category}>
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                {CATEGORY_LABELS[category] ?? titleCase(category)}
              </p>
              {asChips ? (
                <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid="references-chip-group">
                  {refs.map(ref => (
                    <EntityLink key={ref.href} href={ref.href} accessToken={accessToken}>
                      {ref.label || ref.id}
                    </EntityLink>
                  ))}
                </div>
              ) : (
                <div
                  className="gba:grid gba:grid-cols-1 sm:gba:grid-cols-2 gba:gap-3"
                  data-testid="references-card-group"
                >
                  {refs.map(ref => (
                    <EntityReferenceCard key={ref.href} reference={ref} accessToken={accessToken} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ReferencesRail
