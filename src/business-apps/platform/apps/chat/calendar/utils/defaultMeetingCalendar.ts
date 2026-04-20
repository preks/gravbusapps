import type { InternalCalendarSummary } from '../types'

export const PERSONAL_CALENDAR_ID = 'personal'

interface GetDefaultMeetingCalendarIdOptions {
  includePersonal: boolean
  requestedMeetingCalendarId?: string
  selectedInternalCalendarIds: string[]
  sharedCalendars: InternalCalendarSummary[]
}

export function getDefaultMeetingCalendarId({
  includePersonal,
  requestedMeetingCalendarId,
  selectedInternalCalendarIds,
  sharedCalendars
}: GetDefaultMeetingCalendarIdOptions): string {
  if (requestedMeetingCalendarId) {
    return requestedMeetingCalendarId
  }

  if (includePersonal) {
    return PERSONAL_CALENDAR_ID
  }

  const selectedEditableSharedCalendars = sharedCalendars.filter(
    calendar => calendar.canEdit && selectedInternalCalendarIds.includes(calendar.id)
  )

  if (selectedEditableSharedCalendars.length === 1) {
    return selectedEditableSharedCalendars[0].id
  }

  return PERSONAL_CALENDAR_ID
}
