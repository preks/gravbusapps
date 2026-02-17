/**
 * Call handlers: handleAudioCall, handleVideoCall, handleGroupCall, and URL action=startCall effect.
 */

import { useCallback, useEffect } from 'react'
import type { CallParticipant } from '../services/webrtcClient'
import type { Conversation, User } from '../types'

export interface UseChatCallHandlersParams {
  activeConversation: Conversation | null
  currentUser: User | null
  initiateGroupCall?:
    | ((
        conversationId: string,
        callType: 'audio' | 'video',
        participants: CallParticipant[],
        conversationName?: string,
        calendarMeetingId?: string | null,
        conversationType?: 'direct' | 'group'
      ) => void)
    | null
  joinGroupCall?:
    | ((roomId: string, callType: 'audio' | 'video', initialParticipants?: CallParticipant[]) => void)
    | null
  activeConversationCalls: Map<string, { roomId: string }>
  isStartingCall: boolean
  setIsStartingCall: (value: boolean) => void
  isConnected: boolean
  urlCallActionProcessed: React.MutableRefObject<boolean>
}

export interface UseChatCallHandlersReturn {
  handleAudioCall: () => void
  handleVideoCall: () => void
  handleGroupCall: (callType: 'audio' | 'video', isJoiningExisting?: boolean) => void
}

export function useChatCallHandlers({
  activeConversation,
  currentUser,
  initiateGroupCall,
  joinGroupCall,
  activeConversationCalls,
  isStartingCall,
  setIsStartingCall,
  isConnected,
  urlCallActionProcessed
}: UseChatCallHandlersParams): UseChatCallHandlersReturn {
  const handleGroupCall = useCallback(
    (callType: 'audio' | 'video', isJoiningExisting: boolean = false) => {
      if (!activeConversation || activeConversation?.type !== 'group' || !currentUser) return
      const existingCall = activeConversationCalls.get(activeConversation.id)
      const shouldJoinExisting = isJoiningExisting || !!existingCall
      if (shouldJoinExisting) {
        if (!existingCall?.roomId) {
          return
        }
        joinGroupCall?.(existingCall.roomId, callType, undefined)
      } else {
        const callParticipants: CallParticipant[] =
          activeConversation.participants
            ?.filter(p => p.userId || p.user)
            .map(p => {
              const user = p.user
              return {
                id: user?.id || p.userId,
                odId: user?.id || p.userId,
                odName: user
                  ? user.displayName ||
                    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() ||
                    user.username ||
                    'Unknown'
                  : 'User',
                avatarUrl: user?.avatarUrl
              }
            }) ?? []
        const calendarMeetingId = activeConversation.metadata?.meetingId ?? null
        initiateGroupCall?.(
          activeConversation.id,
          callType,
          callParticipants,
          activeConversation.name,
          calendarMeetingId,
          'group'
        )
      }
    },
    [activeConversation, activeConversationCalls, initiateGroupCall, joinGroupCall, currentUser]
  )

  const handleAudioCall = useCallback(() => {
    if (isStartingCall || !activeConversation) return
    setIsStartingCall(true)
    try {
      if (activeConversation.type === 'direct') {
        const otherParticipant = activeConversation.participants?.find(
          p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
        )
        if (!otherParticipant?.user) {
          setIsStartingCall(false)
          return
        }
        const user = otherParticipant.user
        const participant: CallParticipant = {
          id: user.id,
          odId: user.id,
          odName:
            user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Unknown',
          avatarUrl: user.avatarUrl
        }
        const calendarMeetingId = activeConversation.metadata?.meetingId ?? null
        initiateGroupCall?.(activeConversation.id, 'audio', [participant], undefined, calendarMeetingId, 'direct')
      } else if (activeConversation.type === 'group') {
        handleGroupCall('audio')
      }
      setTimeout(() => setIsStartingCall(false), 3000)
    } catch (error) {
      console.error('[CHAT] Error starting audio call:', error)
      setIsStartingCall(false)
    }
  }, [activeConversation, currentUser, initiateGroupCall, isStartingCall, setIsStartingCall, handleGroupCall])

  const handleVideoCall = useCallback(() => {
    if (isStartingCall || !activeConversation) return
    setIsStartingCall(true)
    try {
      if (activeConversation.type === 'direct') {
        const otherParticipant = activeConversation.participants?.find(
          p => p.userId !== currentUser?.id && p.user?.id !== currentUser?.id
        )
        if (!otherParticipant?.user) {
          setIsStartingCall(false)
          return
        }
        const user = otherParticipant.user
        const participant: CallParticipant = {
          id: user.id,
          odId: user.id,
          odName:
            user.displayName || `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || 'Unknown',
          avatarUrl: user.avatarUrl
        }
        const calendarMeetingId = activeConversation.metadata?.meetingId ?? null
        initiateGroupCall?.(activeConversation.id, 'video', [participant], undefined, calendarMeetingId, 'direct')
      } else if (activeConversation.type === 'group') {
        handleGroupCall('video')
      }
      setTimeout(() => setIsStartingCall(false), 3000)
    } catch (error) {
      console.error('[CHAT] Error starting video call:', error)
      setIsStartingCall(false)
    }
  }, [activeConversation, currentUser, initiateGroupCall, isStartingCall, setIsStartingCall, handleGroupCall])

  // URL action=startCall: start call when URL has action=startCall&conversationId=...
  useEffect(() => {
    if (urlCallActionProcessed.current) return
    const urlParams = new URLSearchParams(globalThis.location.search)
    if (urlParams.get('action') !== 'startCall' || !urlParams.get('conversationId')) return
    if (!activeConversation || activeConversation?.id !== urlParams.get('conversationId')) return
    if (!initiateGroupCall || !isConnected) return
    urlCallActionProcessed.current = true
    const callTypeParam = urlParams.get('callType') as 'audio' | 'video' | null
    const callParticipants = (activeConversation.participants || [])
      .filter(p => p.userId !== currentUser?.id)
      .map(p => ({
        id: p.userId,
        odId: p.userId,
        odName: p.user?.displayName || p.user?.firstName || 'Unknown',
        avatarUrl: p.user?.avatarUrl
      }))
    const callType = callTypeParam || 'audio'
    setTimeout(() => {
      initiateGroupCall(activeConversation.id, callType, callParticipants, activeConversation.name)
      const url = new URL(globalThis.location.href)
      url.searchParams.delete('action')
      url.searchParams.delete('callType')
      globalThis.history.replaceState({}, '', url.toString())
    }, 500)
  }, [activeConversation, initiateGroupCall, isConnected, currentUser?.id, urlCallActionProcessed])

  return { handleAudioCall, handleVideoCall, handleGroupCall }
}
