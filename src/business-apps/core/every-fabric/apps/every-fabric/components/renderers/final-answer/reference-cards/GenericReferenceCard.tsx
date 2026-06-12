import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import {
  getEntityIcon,
  getDefaultIcon
} from '@/business-apps/platform/apps/every-ai/components/entities/utils/entityIcons'
import { ENTITY_CONFIG } from '@/business-apps/platform/apps/every-ai/components/links/constants'
import { navigateTo } from '@/common/utils/navigationUtils'
import { intentLabel, resolveEffectiveType, type ReferenceCardProps } from './referenceCardUtils'

const humanizeType = (type: string): string =>
  type
    .split('_')
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(' ')

// Wrap the small ENTITY_CONFIG glyph in the same circular chip the rich icons
// use, so document/workflow/note/ticket cards get a meaningful icon instead of
// the generic fallback bolt.
const wrapGlyph = (glyph: React.ReactNode): React.ReactNode => (
  <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-muted/40 gba:flex gba:items-center gba:justify-center gba:text-foreground">
    {glyph}
  </div>
)

/**
 * Fallback card for any reference without a dedicated rich card (documents,
 * workflows, notes, tickets, ...). Shows the type icon + label and opens the
 * record via the shared protocol -> URL resolver, so it is never a dead chip.
 */
export const GenericReferenceCard: React.FC<ReferenceCardProps> = ({ reference }) => {
  const effectiveType = resolveEffectiveType(reference.type)
  const richIcon = getEntityIcon(effectiveType)?.icon
  const glyph = ENTITY_CONFIG[effectiveType]?.icon
  const icon = richIcon ?? (glyph ? wrapGlyph(glyph()) : getDefaultIcon())
  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const context = intentLabel(reference.intent)

  return (
    <EntityCard
      title={reference.label || reference.id}
      subtitle={context ? `${context} · ${humanizeType(effectiveType)}` : humanizeType(effectiveType)}
      icon={icon}
      onClick={url ? () => navigateTo(url) : undefined}
      data-testid={`reference-card-generic-${effectiveType}`}
    />
  )
}

export default GenericReferenceCard
