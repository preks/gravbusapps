import { InvitationStatus, MeetingRecurrence, MeetingStatus, PendingInvitationGroup } from '../types'
import {
  AvatarInfoMap,
  collectPendingInvitationUserIds,
  enrichPendingInvitationGroupsWithAvatars
} from './enrichPendingInvitationsAvatars'

const buildMeeting = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'meeting-1',
    title: 'Sync',
    startTime: '2026-03-02T10:00:00.000Z',
    endTime: '2026-03-02T10:30:00.000Z',
    timezone: 'UTC',
    status: MeetingStatus.SCHEDULED,
    recurrence: MeetingRecurrence.NONE,
    organizerId: 'organizer-id',
    reminderMinutes: [],
    isAllDay: false,
    color: '#fff',
    createdAt: '',
    updatedAt: '',
    organizer: { id: 'organizer-id', email: 'org@test.com', displayName: 'Org' },
    participants: [
      {
        id: 'p1',
        meetingId: 'meeting-1',
        userId: 'user-1',
        status: InvitationStatus.PENDING,
        isOrganizer: false,
        isOptional: false,
        user: { id: 'user-1', email: 'u1@test.com', displayName: 'User One' }
      }
    ],
    ...overrides
  }) as any

describe('enrichPendingInvitationsAvatars', () => {
  it('collects unique organizer and participant user ids', () => {
    const groups: PendingInvitationGroup[] = [{ kind: 'single', seriesRootId: 'meeting-1', meeting: buildMeeting() }]

    expect(collectPendingInvitationUserIds(groups).sort()).toEqual(['organizer-id', 'user-1'])
  })

  it('applies avatar urls to organizer and participants', () => {
    const groups: PendingInvitationGroup[] = [{ kind: 'single', seriesRootId: 'meeting-1', meeting: buildMeeting() }]
    const map: AvatarInfoMap = new Map([
      ['organizer-id', { avatarUrl: 'https://cdn/org.png' }],
      ['user-1', { avatarUrl: 'https://cdn/user1.png' }]
    ])

    const [group] = enrichPendingInvitationGroupsWithAvatars(groups, map)
    const meeting = group.kind === 'single' ? group.meeting : group.pendingMeetings[0]

    expect(meeting.organizer?.avatarUrl).toBe('https://cdn/org.png')
    expect(meeting.participants?.[0].user?.avatarUrl).toBe('https://cdn/user1.png')
    expect(meeting.participants?.[0].user?.displayName).toBe('User One')
  })
})
