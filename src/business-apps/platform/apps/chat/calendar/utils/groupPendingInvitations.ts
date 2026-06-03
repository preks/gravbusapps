import { Meeting, MeetingRecurrence, PendingInvitationGroup } from '../types'

export function groupPendingInvitations(meetings: Meeting[]): PendingInvitationGroup[] {
  const groupsBySeriesRootId = new Map<string, Meeting[]>()

  for (const meeting of meetings) {
    const seriesRootId = meeting.parentMeetingId || meeting.id
    const seriesMeetings = groupsBySeriesRootId.get(seriesRootId) || []
    seriesMeetings.push(meeting)
    groupsBySeriesRootId.set(seriesRootId, seriesMeetings)
  }

  return Array.from(groupsBySeriesRootId.entries())
    .map(([seriesRootId, seriesMeetings]) => {
      const sortedMeetings = [...seriesMeetings].sort(
        (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
      )
      const [firstMeeting] = sortedMeetings

      if (!firstMeeting) {
        return null
      }

      if (sortedMeetings.length === 1) {
        return {
          kind: 'single' as const,
          seriesRootId,
          meeting: firstMeeting
        }
      }

      return {
        kind: 'series' as const,
        seriesRootId,
        title: firstMeeting.title,
        organizer: firstMeeting.organizer,
        recurrence: firstMeeting.parentMeetingId ? MeetingRecurrence.NONE : firstMeeting.recurrence,
        pendingMeetings: sortedMeetings,
        pendingCount: sortedMeetings.length,
        dateRange: {
          start: firstMeeting.startTime,
          end: sortedMeetings[sortedMeetings.length - 1]?.endTime || firstMeeting.endTime
        }
      }
    })
    .filter((group): group is PendingInvitationGroup => group !== null)
    .sort((left, right) => {
      const leftStart =
        left.kind === 'single' ? new Date(left.meeting.startTime).getTime() : new Date(left.dateRange.start).getTime()
      const rightStart =
        right.kind === 'single'
          ? new Date(right.meeting.startTime).getTime()
          : new Date(right.dateRange.start).getTime()

      return leftStart - rightStart
    })
}
