import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useSlideReference } from './hooks/officeReferenceHooks'
import { dataStr, getField, getStr, type ReferenceCardProps } from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

const SLIDE_GLYPH = tileGlyph('M3 4h18v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm9 13v3m-3 0h6')

/** Slide deck card: leads with deck title, slide count and last-updated. */
export const SlideReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, countChip, humanizeToken, relativeOrShortDate, t } = useReferenceCardI18n()
  const { data: slide, loading } = useSlideReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={SLIDE_GLYPH} accent="rose" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-slide"
      />
    )
  }

  const title = getStr(slide, 'title') ?? reference.label ?? dataStr(reference.data, 'title') ?? reference.id
  const status = humanizeToken(getStr(slide, 'status'))
  const updated = relativeOrShortDate(getStr(slide, 'updatedAt'))
  const contentJson = getField(slide, 'contentJson')
  const slidesArray = getField(contentJson, 'slides')
  const slideCount = Array.isArray(slidesArray) ? slidesArray.length : undefined

  const fields: Array<{ label: string; value: string }> = []
  const slidesLabel = countChip(slideCount, 'slide')
  if (slidesLabel) fields.push({ label: field('slides'), value: slidesLabel })
  if (updated) fields.push({ label: field('updated'), value: updated })

  return (
    <EntityCard
      title={title}
      subtitle={t('renderer-ref-type-presentation')}
      status={status}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-slide"
    />
  )
}

export default SlideReferenceCard
