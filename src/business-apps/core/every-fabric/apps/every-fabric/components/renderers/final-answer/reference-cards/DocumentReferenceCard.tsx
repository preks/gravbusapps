import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useDocumentReference } from './hooks/officeReferenceHooks'
import {
  countChip,
  dataStr,
  getField,
  getNum,
  getStr,
  humanizeToken,
  plainTextPreview,
  relativeOrShortDate,
  type ReferenceCardProps
} from './referenceCardUtils'

const DOCUMENT_GLYPH = tileGlyph('M9 12h6m-6 4h4m4 5H7a2 2 0 01-2-2V5a2 2 0 012-2h6l6 6v10a2 2 0 01-2 2z')

/**
 * Document card: leads with a preview snippet of the body, an approval/status
 * badge, last-updated recency and a page count when the doc is a PDF import.
 */
export const DocumentReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { data: doc, loading } = useDocumentReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={DOCUMENT_GLYPH} accent="blue" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-document"
      />
    )
  }

  const title = getStr(doc, 'title') ?? reference.label ?? dataStr(reference.data, 'title') ?? reference.id
  const status = humanizeToken(getStr(doc, 'status'))
  const updated = relativeOrShortDate(getStr(doc, 'updatedAt'))
  const description = plainTextPreview(getStr(doc, 'description') ?? getStr(doc, 'content'))
  const pageCount = getNum(getField(doc, 'sourceFile'), 'pageCount')

  const fields: Array<{ label: string; value: string }> = []
  if (updated) fields.push({ label: 'Updated', value: updated })
  const pages = countChip(pageCount, 'page')
  if (pages) fields.push({ label: 'Pages', value: pages })

  return (
    <EntityCard
      title={title}
      subtitle="Document"
      status={status}
      description={description}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-document"
    />
  )
}

export default DocumentReferenceCard
