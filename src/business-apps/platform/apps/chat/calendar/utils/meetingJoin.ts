interface MeetingJoinable {
  id: string
  title: string
  status?: string
  meetingLink?: string
  conversationId?: string
  isVideoCall?: boolean
  callType?: 'audio' | 'video'
  metadata?: Record<string, unknown>
}

interface MeetingJoinEventOptions {
  participants?: unknown[]
}

export function hasExternalMeetingLink(meeting: Pick<MeetingJoinable, 'meetingLink'>): boolean {
  return Boolean(meeting.meetingLink && meeting.meetingLink !== 'auto-generate')
}

export function getMeetingCallType(
  meeting: Pick<MeetingJoinable, 'meetingLink' | 'isVideoCall' | 'callType' | 'metadata'>
): 'audio' | 'video' | null {
  if (meeting.callType === 'audio' || meeting.callType === 'video') {
    return meeting.callType
  }

  const metadataCallType = meeting.metadata?.callType
  if (metadataCallType === 'audio' || metadataCallType === 'video') {
    return metadataCallType
  }

  if (meeting.isVideoCall === true || meeting.meetingLink) {
    return 'video'
  }

  return null
}

export function canJoinMeeting(
  meeting: Pick<MeetingJoinable, 'meetingLink' | 'status' | 'isVideoCall' | 'callType' | 'metadata'>
): boolean {
  if (!getMeetingCallType(meeting)) {
    return false
  }

  if (!hasExternalMeetingLink(meeting)) {
    return meeting.status === 'scheduled' || meeting.status === 'in_progress'
  }

  return true
}

export function dispatchJoinMeetingEvent(
  meeting: Pick<MeetingJoinable, 'id' | 'title' | 'conversationId'>,
  options: MeetingJoinEventOptions = {}
): void {
  globalThis.window.dispatchEvent(
    new CustomEvent('chat:join-meeting', {
      detail: {
        meetingId: meeting.id,
        conversationId: meeting.conversationId ?? meeting.id,
        title: meeting.title,
        ...(options.participants ? { participants: options.participants } : {})
      }
    })
  )
}

export function handleMeetingJoin<T extends MeetingJoinable>(meeting: T, onInternalJoin?: (meeting: T) => void): void {
  if (hasExternalMeetingLink(meeting)) {
    const meetingLink = meeting.meetingLink

    if (!meetingLink) {
      return
    }

    globalThis.window.open(meetingLink, '_blank', 'noopener,noreferrer')
    return
  }

  if (!canJoinMeeting(meeting)) {
    return
  }

  if (onInternalJoin) {
    onInternalJoin(meeting)
    return
  }

  dispatchJoinMeetingEvent(meeting)
}
