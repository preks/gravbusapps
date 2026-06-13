import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useNoteReference } from './hooks/officeReferenceHooks'
import {
  dataStr,
  getField,
  getStr,
  plainTextPreview,
  relativeOrShortDate,
  type ReferenceCardProps
} from './referenceCardUtils'

const NOTE_GLYPH = tileGlyph('M5 4h11l3 3v13H5V4zm9 0v4h4M8 12h8M8 16h5')

/**
 * Note card: leads with the note's own emoji (when set), a text preview,
 * pinned/archived state and last-updated recency.
 */
export const NoteReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { data: note, loading } = useNoteReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined

  const emoji = getStr(note, 'icon')
  const icon = emoji ? (
    <IconTile glyph={<span className="gba:text-lg gba:leading-none">{emoji}</span>} accent="amber" />
  ) : (
    <IconTile glyph={NOTE_GLYPH} accent="amber" />
  )

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-note"
      />
    )
  }

  const title = getStr(note, 'title') ?? reference.label ?? dataStr(reference.data, 'title') ?? 'Untitled note'
  const isPinned = getField(note, 'isPinned') === true
  const isArchived = getField(note, 'isArchived') === true
  const status = isArchived ? 'Archived' : isPinned ? 'Pinned' : undefined
  const description = plainTextPreview(getStr(note, 'content'))
  const updated = relativeOrShortDate(getStr(note, 'updatedAt'))

  const fields: Array<{ label: string; value: string }> = []
  if (updated) fields.push({ label: 'Updated', value: updated })

  return (
    <EntityCard
      title={title}
      subtitle="Note"
      status={status}
      description={description}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-note"
    />
  )
}

export default NoteReferenceCard
