/**
 * Rejoin call state and handlers: rejoin modal, activeCallInfo, otherUserPresence,
 * handleJoinActiveCall, handleRejoinWithPreferences, handleRejoinCancel.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { rtkDebug } from '../utils/rtkDebug'
import type { Conversation } from '../types'
import type { ActiveCallInfo } from '../components/ConversationHeader'

export type RejoinModalState = {
  roomId: string
  callType: 'audio' | 'video'
  conversationName?: string
  participantCount?: number
} | null

export interface PresenceDataLike {
  state: string
  lastSeen?: string
  userStatus?: unknown
}

export interface UseChatRejoinCallParams {
  stableActiveConversation: Conversation | null
  activeConversationCalls: Map<string, { roomId: string; callType: 'audio' | 'video'; participantIds: string[] }>
  groupCallState: { status: string; roomId?: string | null; callType?: 'audio' | 'video' }
  groupParticipants: Array<{ odName: string }>
  joinGroupCall:
    | ((roomId: string, callType: 'audio' | 'video', initialParticipantsOrPreferences?: unknown) => void)
    | null
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

  const handleJoinActiveCall = useCallback(() => {
    if (!activeCallInfo || !stableActiveConversation) return
    rtkDebug.log('[CHAT] handleJoinActiveCall - showing rejoin modal:', activeCallInfo)
    setRejoinModalState({
      roomId: activeCallInfo.roomId,
      callType: activeCallInfo.callType,
      conversationName: stableActiveConversation.name,
      participantCount: activeCallInfo.participantCount
    })
  }, [activeCallInfo, stableActiveConversation])

  const handleRejoinWithPreferences = useCallback(
    (preferences: { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled: boolean }) => {
      if (!rejoinModalState || !stableActiveConversation) return
      rtkDebug.log('[CHAT] Rejoining call with preferences:', preferences, rejoinModalState)
      const activeCall = (stableActiveConversation as Conversation & { activeCall?: { roomId: string } }).activeCall
      const meetingId = rejoinModalState.roomId || activeCall?.roomId
      if (!meetingId) {
        rtkDebug.error('[CHAT] Cannot rejoin - missing meetingId', { conversationId: stableActiveConversation.id })
        return
      }
      rtkDebug.log('[CHAT] Rejoining existing call:', {
        conversationType: stableActiveConversation.type,
        roomId: meetingId,
        callType: rejoinModalState.callType,
        preferences
      })
      joinGroupCall?.(meetingId, rejoinModalState.callType, preferences)
    },
    [rejoinModalState, stableActiveConversation, joinGroupCall]
  )

  useEffect(() => {
    if (rejoinModalState && groupCallState.status !== 'idle') {
      rtkDebug.log('[CHAT] Call started, closing rejoin modal')
      setRejoinModalState(null)
    }
  }, [rejoinModalState, groupCallState.status])

  const handleRejoinCancel = useCallback(() => {
    rtkDebug.log('[CHAT] Rejoin cancelled')
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
