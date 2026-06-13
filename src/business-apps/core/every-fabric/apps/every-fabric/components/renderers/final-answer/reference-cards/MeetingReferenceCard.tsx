import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { IconTile, tileGlyph } from './IconTile'
import { useMeetingReference } from './hooks/commsReferenceHooks'
import {
  countChip,
  dataStr,
  formatClock,
  formatDateTime,
  getField,
  getStr,
  humanizeToken,
  personName,
  type ReferenceCardProps
} from './referenceCardUtils'

const MEETING_GLYPH = tileGlyph(
  'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
)

/**
 * Meeting card: leads with the title and a date + time range, plus organizer
 * and participant count — the calendar essentials at a glance.
 */
export const MeetingReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { data: meeting, loading } = useMeetingReference(reference.id, accessToken)

  const url = getEntityUrl(reference.type, reference.id, reference.href)
  const open = url ? () => navigateTo(url) : undefined
  const icon = <IconTile glyph={MEETING_GLYPH} accent="teal" />

  if (loading) {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-meeting"
      />
    )
  }

  const title =
    getStr(meeting, 'title') ??
    getStr(meeting, 'name') ??
    reference.label ??
    dataStr(reference.data, 'title') ??
    'Meeting'
  const start = getStr(meeting, 'startTime') ?? getStr(meeting, 'startsAt') ?? getStr(meeting, 'scheduledStartTime')
  const end = getStr(meeting, 'endTime') ?? getStr(meeting, 'endsAt') ?? getStr(meeting, 'scheduledEndTime')
  const status = humanizeToken(getStr(meeting, 'status'))

  const startLabel = formatDateTime(start)
  const endLabel = formatClock(end)
  const timeRange = startLabel ? (endLabel ? `${startLabel} – ${endLabel}` : startLabel) : undefined

  const organizer =
    personName(getField(meeting, 'organizer')) ?? getStr(meeting, 'organizerName') ?? getStr(meeting, 'createdByName')
  const participantsRaw = getField(meeting, 'participants') ?? getField(meeting, 'attendees')
  const participantCount = Array.isArray(participantsRaw) ? participantsRaw.length : undefined

  const fields: Array<{ label: string; value: string }> = []
  if (organizer) fields.push({ label: 'Organizer', value: organizer })
  const participantsLabel = countChip(participantCount, 'attendee')
  if (participantsLabel) fields.push({ label: 'Attendees', value: participantsLabel })

  return (
    <EntityCard
      title={title}
      subtitle={timeRange ?? 'Meeting'}
      status={status}
      icon={icon}
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-meeting"
    />
  )
}

export default MeetingReferenceCard
