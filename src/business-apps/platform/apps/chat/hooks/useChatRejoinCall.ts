/**
 * Rejoin call state and handlers: rejoin modal, activeCallInfo, otherUserPresence,
 * handleJoinActiveCall, handleRejoinWithPreferences, handleRejoinCancel.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { ActiveCall, Conversation } from '../types'
import type { ActiveCallInfo } from '../components/ConversationHeader'
import { takePendingJoinMeetingForConversation } from '../pendingJoinMeetingFromPlatform'

export type RejoinModalState = {
  roomId: string
  callType: 'audio' | 'video'
  conversationName?: string
  participantCount?: number
  startedBy?: { id: string; odId: string; odName: string; avatarUrl?: string }
  transcriptionEnabled?: boolean
} | null

export interface PresenceDataLike {
  state: string
  lastSeen?: string
  userStatus?: unknown
}

export interface UseChatRejoinCallParams {
  stableActiveConversation: Conversation | null
  activeConversationCalls: Map<
    string,
    {
      roomId: string
      callType: 'audio' | 'video'
      participantIds: string[]
      conversationName?: string
      startedBy?: string
    }
  >
  groupCallState: { status: string; roomId?: string | null; callType?: 'audio' | 'video' }
  groupParticipants: Array<{ odName: string }>
  joinGroupCall:
    | ((roomId: string, callType: 'audio' | 'video', initialParticipantsOrPreferences?: unknown) => void)
    | null
  realtimeKitApiClient?: { realtimeKitGetMeetingDetails: (meetingId: string) => Promise<any> } | null
  /** When provided (e.g. from ChatWithCalendar), used to resolve transcription for calendar meetings so Join dialog shows recording message */
  calendarApiClient?: { getMeeting: (meetingId: string) => Promise<unknown> } | null
  getUserPresence: (userId: string) => PresenceDataLike
  currentUserId: string | null
}

function getOtherParticipantUserId(conversation: Conversation, currentUserId: string | null): string | null {
  if (conversation.type !== 'direct' || !conversation.participants) return null
  const other = conversation.participants.find(p => p.userId !== currentUserId && p.user?.id !== currentUserId)
  return other?.userId || other?.user?.id || null
}

export interface UseChatRejoinCallReturn {
  rejoinModalState: RejoinModalState
  activeCallInfo: ActiveCallInfo | null
  otherUserPresence: PresenceDataLike | undefined
  handleJoinActiveCall: () => void
  handleRejoinWithPreferences: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
  }) => void
  handleRejoinCancel: () => void
}

export function useChatRejoinCall({
  stableActiveConversation,
  activeConversationCalls,
  groupCallState,
  groupParticipants,
  joinGroupCall,
  realtimeKitApiClient,
  calendarApiClient,
  getUserPresence,
  currentUserId
}: UseChatRejoinCallParams): UseChatRejoinCallReturn {
  const [rejoinModalState, setRejoinModalState] = useState<RejoinModalState>(null)

  const otherUserId = stableActiveConversation
    ? getOtherParticipantUserId(stableActiveConversation, currentUserId)
    : null
  const otherUserPresence = otherUserId ? getUserPresence(otherUserId) : undefined

  const activeCallInfo: ActiveCallInfo | null = useMemo(() => {
    if (!stableActiveConversation) return null
    const activeCall =
      activeConversationCalls.get(stableActiveConversation.id) ||
      (
        stableActiveConversation as Conversation & {
          activeCall?: { roomId: string; callType: 'audio' | 'video'; participantIds: string[] }
        }
      ).activeCall
    if (activeCall) {
      const participantNames =
        stableActiveConversation.participants
          ?.filter(p => activeCall.participantIds.includes(p.userId || p.user?.id || ''))
          .map(p => {
            const user = p.user
            return user?.displayName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Unknown'
          }) || []
      return {
        roomId: activeCall.roomId,
        callType: activeCall.callType,
        participantCount: activeCall.participantIds.length,
        participantNames:
          participantNames.length > 0 ? participantNames : [`${activeCall.participantIds.length} participant(s)`]
      }
    }
    if (
      stableActiveConversation.type === 'group' &&
      groupCallState.status !== 'idle' &&
      groupCallState.roomId === stableActiveConversation.id
    ) {
      return {
        roomId: groupCallState.roomId ?? stableActiveConversation.id,
        callType: (groupCallState.callType as 'audio' | 'video') || 'video',
        participantCount: groupParticipants.length,
        participantNames: groupParticipants.map(p => p.odName)
      }
    }
    return null
  }, [
    stableActiveConversation,
    activeConversationCalls,
    groupCallState.status,
    groupCallState.roomId,
    groupCallState.callType,
    groupParticipants
  ])

  const handleJoinActiveCall = useCallback(async () => {
    if (!activeCallInfo || !stableActiveConversation) return
    const callFromMap = activeConversationCalls.get(stableActiveConversation.id)
    const conversationActiveCall = (stableActiveConversation as Conversation & { activeCall?: ActiveCall }).activeCall
    const conversationNameFromCall = callFromMap?.conversationName
    const startedByFromConversation = conversationActiveCall?.startedBy
    const baseState: NonNullable<RejoinModalState> = {
      roomId: activeCallInfo.roomId,
      callType: activeCallInfo.callType,
      conversationName: conversationNameFromCall ?? stableActiveConversation.name,
      participantCount: activeCallInfo.participantCount,
      startedBy: startedByFromConversation
    }

    // Resolve transcription before opening dialog so the message shows immediately (same as PreCallSetup)
    let transcriptionEnabled = false
    let meetingIdStr: string | null = null
    const rawMeetingId = stableActiveConversation?.metadata?.meetingId
    if (typeof rawMeetingId === 'string') {
      meetingIdStr = rawMeetingId
    } else if (rawMeetingId != null) {
      meetingIdStr = String(rawMeetingId)
    }
    // Fallback: calendar/join-meeting may have stored meetingId when conversation lacks metadata (e.g. opened from calendar)
    if (stableActiveConversation?.id && meetingIdStr == null) {
      const pendingId = takePendingJoinMeetingForConversation(stableActiveConversation.id)
      if (pendingId) meetingIdStr = pendingId
    }

    if (meetingIdStr && calendarApiClient?.getMeeting) {
      try {
        const response = await calendarApiClient.getMeeting(meetingIdStr)
        const meeting = (response as { meeting?: unknown })?.meeting ?? response
        const raw = meeting as { transcriptionEnabled?: boolean; metadata?: { aiTranscriptionEnabled?: boolean } }
        transcriptionEnabled =
          raw?.transcriptionEnabled === true ||
          raw?.metadata?.aiTranscriptionEnabled === true ||
          Boolean(raw?.metadata?.aiTranscriptionEnabled)
      } catch {
        // Best-effort
      }
    } else if (realtimeKitApiClient) {
      try {
        const res = await realtimeKitApiClient.realtimeKitGetMeetingDetails(activeCallInfo.roomId)
        const data = res?.data ?? res
        transcriptionEnabled = (data as { transcriptionEnabled?: boolean })?.transcriptionEnabled === true
      } catch {
        // Best-effort
      }
    }

    setRejoinModalState({ ...baseState, transcriptionEnabled })
  }, [activeCallInfo, stableActiveConversation, activeConversationCalls, realtimeKitApiClient, calendarApiClient])

  const handleRejoinWithPreferences = useCallback(
    (preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => {
      if (!rejoinModalState || !stableActiveConversation) return
      const conversationId = stableActiveConversation.id
      joinGroupCall?.(conversationId, rejoinModalState.callType, preferences)
    },
    [rejoinModalState, stableActiveConversation, joinGroupCall]
  )

  useEffect(() => {
    if (rejoinModalState && groupCallState.status !== 'idle') {
      setRejoinModalState(null)
    }
  }, [rejoinModalState, groupCallState.status])

  const handleRejoinCancel = useCallback(() => {
    setRejoinModalState(null)
  }, [])

  return {
    rejoinModalState,
    activeCallInfo,
    otherUserPresence,
    handleJoinActiveCall,
    handleRejoinWithPreferences,
    handleRejoinCancel
  }
}
