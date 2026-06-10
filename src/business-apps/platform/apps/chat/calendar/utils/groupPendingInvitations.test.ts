import { groupPendingInvitations } from './groupPendingInvitations'
import { InvitationStatus, MeetingRecurrence, MeetingStatus } from '../types'

describe('groupPendingInvitations', () => {
  it('groups recurring meetings by their series root id', () => {
    const groups = groupPendingInvitations([
      {
        id: 'series-root-id',
        title: 'Weekly sync',
        startTime: '2026-03-02T10:00:00.000Z',
        endTime: '2026-03-02T10:30:00.000Z',
        timezone: 'UTC',
        status: MeetingStatus.SCHEDULED,
        recurrence: MeetingRecurrence.WEEKLY,
        organizerId: 'organizer-id',
        reminderMinutes: [15],
        isAllDay: false,
        color: '#3B82F6',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
        organizer: { id: 'organizer-id', email: 'organizer@test.com', displayName: 'Organizer' },
        participants: []
      },
      {
        id: 'series-child-id',
        title: 'Weekly sync',
        startTime: '2026-03-09T10:00:00.000Z',
        endTime: '2026-03-09T10:30:00.000Z',
        timezone: 'UTC',
        status: MeetingStatus.SCHEDULED,
        recurrence: MeetingRecurrence.NONE,
        parentMeetingId: 'series-root-id',
        organizerId: 'organizer-id',
        reminderMinutes: [15],
        isAllDay: false,
        color: '#3B82F6',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
        organizer: { id: 'organizer-id', email: 'organizer@test.com', displayName: 'Organizer' },
        participants: []
      }
    ])

    expect(groups).toEqual([
      {
        kind: 'series',
        seriesRootId: 'series-root-id',
        title: 'Weekly sync',
        organizer: { id: 'organizer-id', email: 'organizer@test.com', displayName: 'Organizer' },
        recurrence: MeetingRecurrence.WEEKLY,
        pendingMeetings: [
          expect.objectContaining({ id: 'series-root-id' }),
          expect.objectContaining({ id: 'series-child-id' })
        ],
        pendingCount: 2,
        dateRange: {
          start: '2026-03-02T10:00:00.000Z',
          end: '2026-03-09T10:30:00.000Z'
        }
      }
    ])
  })

  it('keeps one-off meetings as single groups', () => {
    const groups = groupPendingInvitations([
      {
        id: 'single-meeting-id',
        title: 'Interview prep',
        startTime: '2026-03-02T08:00:00.000Z',
        endTime: '2026-03-02T08:30:00.000Z',
        timezone: 'UTC',
        status: MeetingStatus.SCHEDULED,
        recurrence: MeetingRecurrence.NONE,
        organizerId: 'organizer-id',
        reminderMinutes: [15],
        isAllDay: false,
        color: '#14B8A6',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:00:00.000Z',
        organizer: { id: 'organizer-id', email: 'organizer@test.com' },
        participants: [
          {
            id: 'participant-id',
            meetingId: 'single-meeting-id',
            userId: 'invitee-id',
            status: InvitationStatus.PENDING,
            isOrganizer: false,
            isOptional: false
          }
        ]
      }
    ])

    expect(groups).toEqual([
      {
        kind: 'single',
        seriesRootId: 'single-meeting-id',
        meeting: expect.objectContaining({ id: 'single-meeting-id' })
      }
    ])
  })
})
