import { Meeting, PendingInvitationGroup } from '../types'

export interface AvatarInfo {
  avatarUrl?: string
  employeeId?: string
}

export type AvatarInfoMap = Map<string, AvatarInfo>

export function collectPendingInvitationUserIds(groups: PendingInvitationGroup[]): string[] {
  const ids = new Set<string>()

  const addMeeting = (meeting: Meeting) => {
    if (meeting.organizer?.id) {
      ids.add(meeting.organizer.id)
    }
    meeting.participants?.forEach(participant => {
      if (participant.userId) {
        ids.add(participant.userId)
      }
    })
  }

  for (const group of groups) {
    if (group.kind === 'single') {
      addMeeting(group.meeting)
    } else {
      group.pendingMeetings.forEach(addMeeting)
    }
  }

  return [...ids]
}

function enrichMeeting(meeting: Meeting, avatarMap: AvatarInfoMap): Meeting {
  const organizerInfo = meeting.organizer?.id ? avatarMap.get(meeting.organizer.id) : undefined

  return {
    ...meeting,
    organizer: meeting.organizer
      ? {
          ...meeting.organizer,
          avatarUrl: organizerInfo?.avatarUrl || meeting.organizer.avatarUrl
        }
      : meeting.organizer,
    participants: meeting.participants?.map(participant => {
      const info = avatarMap.get(participant.userId)
      if (!info?.avatarUrl) {
        return participant
      }
      return {
        ...participant,
        user: {
          id: participant.user?.id ?? participant.userId,
          email: participant.user?.email ?? '',
          firstName: participant.user?.firstName,
          lastName: participant.user?.lastName,
          displayName: participant.user?.displayName,
          avatarUrl: info.avatarUrl
        }
      }
    })
  }
}

export function enrichPendingInvitationGroupsWithAvatars(
  groups: PendingInvitationGroup[],
  avatarMap: AvatarInfoMap
): PendingInvitationGroup[] {
  return groups.map(group =>
    group.kind === 'single'
      ? { ...group, meeting: enrichMeeting(group.meeting, avatarMap) }
      : { ...group, pendingMeetings: group.pendingMeetings.map(meeting => enrichMeeting(meeting, avatarMap)) }
  )
}
