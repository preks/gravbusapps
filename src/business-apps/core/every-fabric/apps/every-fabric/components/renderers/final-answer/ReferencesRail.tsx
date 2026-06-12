import React, { useMemo } from 'react'
import EntityLink, { SUPPORTED_PROTOCOLS } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import type { EntityReference } from '../../../types/enterpriseAgent'

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

/**
 * Compact "References" rail rendered beneath the final answer. Groups the
 * structured entity references the backend extracted by category and renders
 * each as a clickable `EntityLink` chip (reusing the platform's protocol -> URL
 * / icon resolution). References whose protocol the frontend cannot resolve are
 * filtered out so the rail never shows dead chips.
 */
/**
 * Minimum number of renderable references before the rail is shown. References
 * are extracted from the answer's own inline links, so the rail is always a
 * deduped echo of what is already in the prose. With a single entity that echo
 * is pure duplication (see the "who is my manager" case); the rail only earns
 * its weight as a consolidated jump-list once several entities are referenced.
 */
const MIN_REFERENCES_TO_SHOW = 2

export const ReferencesRail: React.FC<ReferencesRailProps> = ({ references, accessToken = '' }) => {
  const grouped = useMemo(() => {
    const renderable = (references ?? []).filter(ref => supportedProtocols.has(ref.type))
    const byCategory = new Map<string, EntityReference[]>()
    for (const ref of renderable) {
      const list = byCategory.get(ref.category) ?? []
      list.push(ref)
      byCategory.set(ref.category, list)
    }
    return [...byCategory.entries()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a[0])
      const bi = CATEGORY_ORDER.indexOf(b[0])
      return (ai === -1 ? CATEGORY_ORDER.length : ai) - (bi === -1 ? CATEGORY_ORDER.length : bi)
    })
  }, [references])

  const renderableCount = useMemo(() => grouped.reduce((sum, [, refs]) => sum + refs.length, 0), [grouped])

  if (renderableCount < MIN_REFERENCES_TO_SHOW) return null

  return (
    <div className="gba:pt-4 gba:mt-3 gba:border-t gba:border-border/70" data-testid="enterprise-agent-references-rail">
      <p className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground gba:mb-2">
        References
      </p>
      <div className="gba:space-y-2">
        {grouped.map(([category, refs]) => (
          <div key={category} className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:text-muted-foreground gba:min-w-[88px]">
              {CATEGORY_LABELS[category] ?? titleCase(category)}
            </span>
            {refs.map(ref => (
              <EntityLink key={ref.href} href={ref.href} accessToken={accessToken}>
                {ref.label || ref.id}
              </EntityLink>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ReferencesRail
