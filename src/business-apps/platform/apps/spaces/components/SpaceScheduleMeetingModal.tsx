import React from 'react'
import { CreateMeetingModal } from '@/business-apps/platform/apps/chat/calendar/components'
import { useCreateMeeting, useInternalCalendars } from '@/business-apps/platform/apps/chat/calendar/hooks'
import type { CalendarEmployee } from '@/business-apps/platform/apps/chat/calendar/services/employeeSearchService'

export interface SpaceScheduleMeetingModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  accessToken: string
  currentUser?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
  }
  defaultCalendarId?: string
  initialTitle?: string
  initialParticipants?: CalendarEmployee[]
  onMeetingCreated?: () => Promise<void> | void
}

export const SpaceScheduleMeetingModal: React.FC<SpaceScheduleMeetingModalProps> = ({
  isOpen,
  onOpenChange,
  accessToken,
  currentUser,
  defaultCalendarId,
  initialTitle,
  initialParticipants = [],
  onMeetingCreated
}) => {
  const { calendars } = useInternalCalendars(accessToken)
  const createMeeting = useCreateMeeting(accessToken, onMeetingCreated)
  const linkedCalendar = calendars.find(calendar => calendar.id === defaultCalendarId)

  return (
    <CreateMeetingModal
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
      onSubmit={createMeeting}
      accessToken={accessToken}
      currentUser={currentUser}
      availableCalendars={linkedCalendar ? [linkedCalendar] : []}
      includePersonal
      defaultCalendarId={defaultCalendarId}
      initialTitle={initialTitle}
      initialParticipants={initialParticipants}
    />
  )
}
