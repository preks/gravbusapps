export type CallHistoryFilter = 'all' | 'missed' | 'declined' | 'incoming' | 'outgoing'

export type CallHistoryTypeFilter = 'all' | 'direct' | 'group' | 'meeting'

export type CallHistoryEntry =
  | { type: 'joined'; item: CallSessionItem }
  | { type: 'outcome'; item: CallInviteOutcomeItem }

export interface CallInviteOutcomeItem {
  id: string
  conversationId: string
  roomId: string
  inviterId: string
  inviteeId: string
  invitedAt: string
  outcome: 'declined' | 'not_answered' | 'missed'
  callEndedAt?: string
  callSessionId?: string
  callType?: string
  inviter?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    avatarUrl?: string
  }
  conversation?: {
    id: string
    name?: string
  }
}

export interface CallSessionItem {
  id: string
  callType: string
  mediaType: string
  startedAt: string
  endedAt?: string | null
  actualDurationSeconds?: number | null
  conversationId?: string | null
  meetingId?: string | null
  hostId?: string
  sessionName?: string | null
  participants?: Array<{ userId: string; user?: { firstName?: string; lastName?: string; displayName?: string } }>
  conversation?: { id: string; name?: string }
  meeting?: { meetingName?: string; title?: string }
  host?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    avatarUrl?: string
  }
}
