/**
 * WebSocket invite and conversation lifecycle listeners for RTK group calls.
 */

import { useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react'
import type { RealtimeKitCallRefs } from './contextTypes'
import type { GroupCallInvite, ActiveConversationCall } from '../../services/callTypes'
import type { CallState } from './useRealtimeKitCallState'
import { isInCallInAnotherTab } from '../../utils/activeCallStorage'
import { tryClaimRingingLeader, clearRingingLeader } from '../../utils/ringingLeader'

export interface UseRealtimeKitInviteListenersParams {
  inviteSocket: any
  currentUser: { id: string; odId: string; odName?: string } | null
  refs: RealtimeKitCallRefs
  setIncomingInvite: Dispatch<SetStateAction<GroupCallInvite | null>>
  setRingingLeader: Dispatch<SetStateAction<boolean>>
  setActiveConversationCalls: Dispatch<SetStateAction<Map<string, ActiveConversationCall>>>
  setCallState: Dispatch<SetStateAction<CallState>>
  clearInviteDedupeFor: (meetingId?: string | null, conversationId?: string | null) => void
  leaveCallRef: MutableRefObject<(() => void) | null>
  media: { stopAllTracks: () => void }
  participantsHook: {
    handleDeclinedInvite: (participantId: string, status?: 'declined' | 'not-answered') => void
  }
}

export function useRealtimeKitInviteListeners(params: UseRealtimeKitInviteListenersParams): void {
  const {
    inviteSocket,
    currentUser,
    refs,
    setIncomingInvite,
    setRingingLeader,
    setActiveConversationCalls,
    setCallState,
    clearInviteDedupeFor,
    leaveCallRef,
    media,
    participantsHook
  } = params

  useEffect(() => {
    const socket = inviteSocket
    if (!socket || !currentUser) return

    const handleInvite = (data: any) => {
      const inviteKey = `${data.meetingId}:${data.conversationId}`
      const now = Date.now()

      const globalSeen: Record<string, number> =
        ((globalThis as any).__RTK_SEEN_INVITES__ as Record<string, number> | undefined) || {}
      const globalLast = globalSeen[inviteKey]
      if (globalLast && now - globalLast < 5000) {
        return
      }
      globalSeen[inviteKey] = now
      ;(globalThis as any).__RTK_SEEN_INVITES__ = globalSeen

      const lastSeen = refs.recentlySeenInviteKeysRef.current.get(inviteKey)
      if (lastSeen && now - lastSeen < 5000) {
        return
      }
      refs.recentlySeenInviteKeysRef.current.set(inviteKey, now)
      if (refs.recentlySeenInviteKeysRef.current.size > 50) {
        for (const [k, ts] of refs.recentlySeenInviteKeysRef.current.entries()) {
          if (now - ts > 60000) refs.recentlySeenInviteKeysRef.current.delete(k)
        }
      }

      const isInActiveCall = refs.callStatusRef.current !== 'idle' && refs.meetingIdRef.current === data.meetingId
      if (isInActiveCall) {
        return
      }

      const isInAnyActiveCall = refs.callStatusRef.current !== 'idle' && refs.callStateRoomIdRef.current
      if (isInAnyActiveCall) {
        return
      }

      if (
        data.conversationId &&
        (refs.conversationIdRef.current === data.conversationId ||
          refs.callStateRoomIdRef.current === data.conversationId)
      ) {
        return
      }

      const isFromSelf = data.from?.id === currentUser?.id || data.from?.odId === currentUser?.odId
      if (isFromSelf) {
        return
      }

      if (currentUser && isInCallInAnotherTab(currentUser.id)) {
        return
      }

      if (!refs.wasIdleRef.current && refs.callStatusRef.current !== 'idle') {
        return
      }

      const isLeader = tryClaimRingingLeader(data.meetingId, data.conversationId)
      setRingingLeader(isLeader)

      setIncomingInvite(prev => {
        if (prev && prev.roomId === data.meetingId && prev.conversationId === data.conversationId) {
          return prev
        }
        return {
          roomId: data.meetingId,
          callType: data.callType,
          from: data.from,
          conversationId: data.conversationId,
          conversationName: data.conversationName || data.conversationId,
          conversationType: data.conversationType as 'direct' | 'group' | 'meeting' | undefined
        }
      })
    }

    const handleCallEnded = (data: { meetingId: string; conversationId: string }) => {
      refs.lastStartEmitRef.current = null
      clearInviteDedupeFor(data.meetingId, data.conversationId)

      if (refs.meetingIdRef.current === data.meetingId) {
        leaveCallRef.current?.()
      }

      if (
        refs.incomingInviteRef.current &&
        (refs.incomingInviteRef.current.roomId === data.meetingId ||
          refs.incomingInviteRef.current.conversationId === data.conversationId)
      ) {
        try {
          media.stopAllTracks()
        } catch {
          // Best-effort
        }
        refs.startTimeRef.current = null
        clearRingingLeader(data.meetingId, data.conversationId)
        setRingingLeader(false)
        setIncomingInvite(null)
      }
    }

    const handleCallCancelled = (data: { meetingId: string; conversationId: string; hostId: string }) => {
      if (
        refs.incomingInviteRef.current &&
        (refs.incomingInviteRef.current.roomId === data.meetingId ||
          refs.incomingInviteRef.current.conversationId === data.conversationId)
      ) {
        try {
          media.stopAllTracks()
        } catch {
          // Best-effort
        }
        refs.startTimeRef.current = null
        clearRingingLeader(data.meetingId, data.conversationId)
        setRingingLeader(false)
        setIncomingInvite(null)
      }
    }

    const handleConversationCallStarted = (data: {
      conversationId: string
      roomId: string
      callType: 'audio' | 'video'
      startedBy: { id: string; odId: string; odName: string; avatarUrl?: string }
      participantIds: string[]
      startedAt?: Date | string
      conversationName?: string
    }) => {
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.set(data.conversationId, {
          roomId: data.roomId,
          callType: data.callType,
          participantIds: data.participantIds,
          startedBy: data.startedBy.id,
          startedAt: data.startedAt,
          conversationName: data.conversationName
        })
        return newMap
      })

      if (
        data?.startedBy?.id &&
        (data.conversationId === refs.callStateRoomIdRef.current ||
          data.roomId === refs.meetingIdRef.current ||
          data.conversationId === refs.conversationIdRef.current)
      ) {
        setCallState(prev => ({ ...prev, hostId: data.startedBy.id }))
      }

      if (
        data.startedAt &&
        (data.roomId === refs.callStateRoomIdRef.current ||
          data.roomId === refs.meetingIdRef.current ||
          data.conversationId === refs.callStateRoomIdRef.current ||
          data.conversationId === refs.conversationIdRef.current ||
          !refs.isInCallRef.current)
      ) {
        const globalStartTime = new Date(data.startedAt).getTime()
        const shouldUpdate =
          !refs.isInCallRef.current || !refs.startTimeRef.current || globalStartTime < refs.startTimeRef.current

        if (shouldUpdate) {
          refs.startTimeRef.current = globalStartTime
          setCallState(prev => ({
            ...prev,
            callStartTime: globalStartTime,
            startTime: globalStartTime
          }))
        }
      }
    }

    const handleConversationCallEnded = (data: { conversationId: string; roomId: string }) => {
      refs.lastStartEmitRef.current = null
      clearInviteDedupeFor(data.roomId, data.conversationId)

      if (
        !refs.isInCallRef.current ||
        data.conversationId === refs.callStateRoomIdRef.current ||
        data.conversationId === refs.conversationIdRef.current ||
        data.roomId === refs.meetingIdRef.current
      ) {
        refs.startTimeRef.current = null
      }

      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.delete(data.conversationId)
        return newMap
      })
    }

    const handleConversationActiveCalls = (calls: any[]) => {
      const seenConversationIds = new Set<string>()
      ;(calls || []).forEach(call => {
        if (call?.conversationId) seenConversationIds.add(call.conversationId)
      })

      setActiveConversationCalls(prev => {
        const next = new Map(prev)
        ;(calls || []).forEach(call => {
          if (!call?.conversationId || !call?.roomId) return
          const existing = next.get(call.conversationId)
          next.set(call.conversationId, {
            roomId: call.roomId,
            callType: call.callType,
            participantIds: call.participantIds || [],
            startedBy: call.startedBy?.id || existing?.startedBy || '',
            startedAt: call.startedAt,
            conversationName: existing?.conversationName
          })
        })
        for (const conversationId of Array.from(next.keys())) {
          if (!seenConversationIds.has(conversationId)) next.delete(conversationId)
        }
        return next
      })
    }

    const resetCallerToIdle = (meetingId: string, conversationId: string) => {
      const isOurCall =
        refs.meetingIdRef.current === meetingId ||
        refs.callStateRoomIdRef.current === meetingId ||
        refs.callStateRoomIdRef.current === conversationId ||
        refs.conversationIdRef.current === conversationId
      const isCaller = isOurCall && (refs.callStatusRef.current === 'setup' || refs.callStatusRef.current === 'joining')
      if (!isCaller) return
      try {
        media.stopAllTracks()
      } catch {
        // Best-effort
      }
      refs.startTimeRef.current = null
      refs.callStateRoomIdRef.current = null
      refs.conversationIdRef.current = null
      refs.meetingIdRef.current = null
      refs.lastStartEmitRef.current = null
      clearInviteDedupeFor(meetingId, conversationId)
      setCallState(prev => ({
        ...prev,
        status: 'idle',
        roomId: null,
        callType: 'audio',
        conversationName: undefined
      }))
    }

    const handleDeclined = (data: {
      conversationId: string
      meetingId: string
      participantId: string
      participantOdId?: string
    }) => {
      const lookupId = data.participantOdId ?? data.participantId
      participantsHook.handleDeclinedInvite(lookupId, 'declined')
      if (data.participantId !== currentUser?.id) {
        resetCallerToIdle(data.meetingId, data.conversationId)
      }
    }

    const handleNotAnswered = (data: {
      conversationId: string
      meetingId: string
      participantId: string
      participantOdId?: string
      participantName: string
    }) => {
      const lookupId = data.participantOdId ?? data.participantId
      participantsHook.handleDeclinedInvite(lookupId, 'not-answered')
      if (data.participantId === currentUser?.id) {
        try {
          media.stopAllTracks()
        } catch {
          // Best-effort
        }
        refs.startTimeRef.current = null
        clearRingingLeader(data.meetingId, data.conversationId)
        setRingingLeader(false)
        setIncomingInvite(null)
      } else {
        resetCallerToIdle(data.meetingId, data.conversationId)
      }
    }

    socket.off('rtk-group-call:invite')
    socket.off('rtk-group-call:ended')
    socket.off('rtk-group-call:cancelled')
    socket.off('rtk-group-call:declined')
    socket.off('rtk-group-call:not-answered')

    socket.on('rtk-group-call:invite', handleInvite)
    socket.on('rtk-group-call:ended', handleCallEnded)
    socket.on('rtk-group-call:cancelled', handleCallCancelled)
    socket.on('rtk-group-call:declined', handleDeclined)
    socket.on('rtk-group-call:not-answered', handleNotAnswered)
    socket.on('conversation:call-started', handleConversationCallStarted)
    socket.on('conversation:call-ended', handleConversationCallEnded)
    socket.on('conversation:active-calls', handleConversationActiveCalls)

    socket.emit('conversation:get-active-calls')

    return () => {
      socket.off('rtk-group-call:invite', handleInvite)
      socket.off('rtk-group-call:ended', handleCallEnded)
      socket.off('rtk-group-call:cancelled', handleCallCancelled)
      socket.off('rtk-group-call:declined', handleDeclined)
      socket.off('rtk-group-call:not-answered', handleNotAnswered)
      socket.off('conversation:call-started', handleConversationCallStarted)
      socket.off('conversation:call-ended', handleConversationCallEnded)
      socket.off('conversation:active-calls', handleConversationActiveCalls)
    }
  }, [inviteSocket, currentUser?.id, currentUser?.odId])
}
