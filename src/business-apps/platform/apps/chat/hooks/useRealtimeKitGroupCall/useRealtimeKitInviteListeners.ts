/**
 * WebSocket invite and conversation lifecycle listeners for RTK group calls.
 */

import { useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react'
import type { RealtimeKitCallRefs } from './contextTypes'
import type { GroupCallInvite, ActiveConversationCall } from '../../services/callTypes'
import type { CallState } from './useRealtimeKitCallState'
import { isInCallInAnotherTab } from '../../utils/activeCallStorage'

export interface UseRealtimeKitInviteListenersParams {
  inviteSocket: any
  currentUser: { id: string; odId: string; odName?: string } | null
  refs: RealtimeKitCallRefs
  setIncomingInvite: Dispatch<SetStateAction<GroupCallInvite | null>>
  setActiveConversationCalls: Dispatch<SetStateAction<Map<string, ActiveConversationCall>>>
  setCallState: Dispatch<SetStateAction<CallState>>
  clearInviteDedupeFor: (meetingId?: string | null, conversationId?: string | null) => void
  leaveCallRef: MutableRefObject<(() => void) | null>
  media: { stopAllTracks: () => void }
  participantsHook: {
    handleDeclinedInvite: (participantId: string, status?: 'declined' | 'not-answered') => void
  }
  rtkDebug: { log: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
}

export function useRealtimeKitInviteListeners(params: UseRealtimeKitInviteListenersParams): void {
  const {
    inviteSocket,
    currentUser,
    refs,
    setIncomingInvite,
    setActiveConversationCalls,
    setCallState,
    clearInviteDedupeFor,
    leaveCallRef,
    media,
    participantsHook,
    rtkDebug: rtk
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
        rtk.warn('[RTK] ⚠️ Ignoring duplicate invite event (global)', { inviteKey, ageMs: now - globalLast })
        return
      }
      globalSeen[inviteKey] = now
      ;(globalThis as any).__RTK_SEEN_INVITES__ = globalSeen

      const lastSeen = refs.recentlySeenInviteKeysRef.current.get(inviteKey)
      if (lastSeen && now - lastSeen < 5000) {
        rtk.warn('[RTK] ⚠️ Ignoring duplicate invite event', { inviteKey, ageMs: now - lastSeen })
        return
      }
      refs.recentlySeenInviteKeysRef.current.set(inviteKey, now)
      if (refs.recentlySeenInviteKeysRef.current.size > 50) {
        for (const [k, ts] of refs.recentlySeenInviteKeysRef.current.entries()) {
          if (now - ts > 60000) refs.recentlySeenInviteKeysRef.current.delete(k)
        }
      }

      rtk.log('[RTK] 📨 Received call invite:', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        from: data.from,
        currentStatus: refs.callStatusRef.current,
        meetingIdRef: refs.meetingIdRef.current,
        callStateRoomIdRef: refs.callStateRoomIdRef.current,
        wasIdleRef: refs.wasIdleRef.current
      })

      const isInActiveCall = refs.callStatusRef.current !== 'idle' && refs.meetingIdRef.current === data.meetingId
      if (isInActiveCall) {
        rtk.log('[RTK] ❌ Ignoring invite - already in this call', {
          currentMeetingId: refs.meetingIdRef.current,
          inviteMeetingId: data.meetingId,
          callStatus: refs.callStatusRef.current
        })
        return
      }

      const isInAnyActiveCall = refs.callStatusRef.current !== 'idle' && refs.callStateRoomIdRef.current
      if (isInAnyActiveCall) {
        rtk.log('[RTK] ❌ Ignoring invite - already in another call', {
          currentRoomId: refs.callStateRoomIdRef.current,
          callStatus: refs.callStatusRef.current
        })
        return
      }

      const isFromSelf = data.from?.id === currentUser?.id || data.from?.odId === currentUser?.odId
      if (isFromSelf) {
        rtk.log('[RTK] ❌ Ignoring invite - from self', {
          fromId: data.from?.id,
          fromOdId: data.from?.odId,
          currentUserId: currentUser?.id,
          currentUserOdId: currentUser?.odId
        })
        return
      }

      if (currentUser && isInCallInAnotherTab(currentUser.id)) {
        rtk.log('[RTK] ❌ Ignoring invite - user is in call in another tab')
        return
      }

      if (!refs.wasIdleRef.current && refs.callStatusRef.current !== 'idle') {
        rtk.log('[RTK] ❌ Ignoring invite - not in idle state', {
          wasIdleRef: refs.wasIdleRef.current,
          callStatus: refs.callStatusRef.current
        })
        return
      }

      rtk.log('[RTK] ✅ Accepting invite - call is idle', {
        meetingId: data.meetingId,
        conversationId: data.conversationId,
        callStatus: refs.callStatusRef.current,
        wasIdleRef: refs.wasIdleRef.current
      })

      setIncomingInvite(prev => {
        if (prev && prev.roomId === data.meetingId && prev.conversationId === data.conversationId) {
          return prev
        }
        rtk.log('[RTK] 📥 Setting incoming invite:', {
          hasPrevious: !!prev,
          conversationId: data.conversationId,
          meetingId: data.meetingId
        })
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
      rtk.log('[RTK] Call ended by host', data)
      refs.lastStartEmitRef.current = null
      clearInviteDedupeFor(data.meetingId, data.conversationId)

      rtk.log('[RTK] Current incomingInvite state:', {
        hasInvite: !!refs.incomingInviteRef.current,
        inviteRoomId: refs.incomingInviteRef.current?.roomId,
        inviteConversationId: refs.incomingInviteRef.current?.conversationId,
        eventMeetingId: data.meetingId,
        eventConversationId: data.conversationId
      })

      if (refs.meetingIdRef.current === data.meetingId) {
        leaveCallRef.current?.()
      }

      if (
        refs.incomingInviteRef.current &&
        (refs.incomingInviteRef.current.roomId === data.meetingId ||
          refs.incomingInviteRef.current.conversationId === data.conversationId)
      ) {
        rtk.log('[RTK] 📵 Dismissing incoming invite - call ended')
        try {
          media.stopAllTracks()
          rtk.log('[RTK] ✅ Media tracks stopped when dismissing expired invite')
        } catch (err) {
          rtk.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
        }
        refs.startTimeRef.current = null
        rtk.log('[RTK] ⏱️ Cleared start time when dismissing invite (call ended)')
        setIncomingInvite(null)
      } else if (refs.incomingInviteRef.current) {
        rtk.log("[RTK] ⚠️ Have incoming invite but IDs don't match - NOT dismissing")
      } else {
        rtk.log('[RTK] ℹ️ No incoming invite to dismiss')
      }
    }

    const handleCallCancelled = (data: { meetingId: string; conversationId: string; hostId: string }) => {
      rtk.log('[RTK] Call cancelled by host', data)
      if (
        refs.incomingInviteRef.current &&
        (refs.incomingInviteRef.current.roomId === data.meetingId ||
          refs.incomingInviteRef.current.conversationId === data.conversationId)
      ) {
        rtk.log('[RTK] 📵 Dismissing incoming invite - call cancelled by host')
        try {
          media.stopAllTracks()
          rtk.log('[RTK] ✅ Media tracks stopped when dismissing cancelled invite')
        } catch (err) {
          rtk.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
        }
        refs.startTimeRef.current = null
        rtk.log('[RTK] ⏱️ Cleared start time when dismissing invite (call cancelled)')
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
      rtk.log('[RTK] 📞 Conversation call started/updated:', {
        conversationId: data.conversationId,
        roomId: data.roomId,
        callType: data.callType,
        participantCount: data.participantIds.length,
        startedAt: data.startedAt,
        currentStartTimeRef: refs.startTimeRef.current,
        isInCall: refs.isInCallRef.current
      })

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
        rtk.log('[RTK] 📥 Received conversation:call-started event', {
          roomId: data.roomId,
          conversationId: data.conversationId,
          startedAt: data.startedAt,
          globalStartTime,
          currentRoomId: refs.callStateRoomIdRef.current,
          currentMeetingId: refs.meetingIdRef.current,
          currentStartTime: refs.startTimeRef.current,
          isInCall: refs.isInCallRef.current,
          matchesCurrentCall:
            data.roomId === refs.callStateRoomIdRef.current ||
            data.roomId === refs.meetingIdRef.current ||
            data.conversationId === refs.callStateRoomIdRef.current
        })

        const shouldUpdate =
          !refs.isInCallRef.current || !refs.startTimeRef.current || globalStartTime < refs.startTimeRef.current

        if (shouldUpdate) {
          const previousTime = refs.startTimeRef.current
          refs.startTimeRef.current = globalStartTime
          setCallState(prev => ({
            ...prev,
            callStartTime: globalStartTime,
            startTime: globalStartTime
          }))
          rtk.log('[RTK] ⏱️ Synced to backend start time:', {
            previousStartTime: previousTime,
            newStartTime: globalStartTime,
            diff: previousTime ? (previousTime - globalStartTime) / 1000 : 0,
            reason: !previousTime ? 'first-sync' : 'catching-up-to-earlier-time'
          })
        } else {
          rtk.log('[RTK] ⏱️ Keeping current start time (backend time is same or later):', {
            currentStartTime: refs.startTimeRef.current,
            backendStartTime: globalStartTime,
            diff: refs.startTimeRef.current ? (refs.startTimeRef.current - globalStartTime) / 1000 : 0,
            reason: 'already-have-earlier-or-equal-time'
          })
        }
      } else {
        rtk.log('[RTK] ⏱️ ⏭️ Skipping timer sync - not for current call or no startedAt:', {
          hasStartedAt: !!data.startedAt,
          eventRoomId: data.roomId,
          eventConversationId: data.conversationId,
          currentRoomId: refs.callStateRoomIdRef.current,
          currentMeetingId: refs.meetingIdRef.current,
          isInCall: refs.isInCallRef.current
        })
      }
    }

    const handleConversationCallEnded = (data: { conversationId: string; roomId: string }) => {
      rtk.log('[RTK] 📴 Conversation call ended:', data)
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

    const handleDeclined = (data: { conversationId: string; meetingId: string; participantId: string }) => {
      rtk.log('[RTK] 📵 Participant declined invite:', data)
      participantsHook.handleDeclinedInvite(data.participantId, 'declined')
    }

    const handleNotAnswered = (data: {
      conversationId: string
      meetingId: string
      participantId: string
      participantName: string
    }) => {
      rtk.log('[RTK] ⏱️ Participant did not answer invite:', data)
      participantsHook.handleDeclinedInvite(data.participantId, 'not-answered')
      if (currentUser && data.participantId === currentUser.id) {
        rtk.log('[RTK] ⏱️ Current user did not answer - dismissing invite')
        try {
          media.stopAllTracks()
          rtk.log('[RTK] ✅ Media tracks stopped when dismissing timed-out invite')
        } catch (err) {
          rtk.error('[RTK] ⚠️ Failed to stop media tracks when dismissing timed-out invite:', err)
        }
        refs.startTimeRef.current = null
        rtk.log('[RTK] ⏱️ Cleared start time when dismissing invite (timeout)')
        setIncomingInvite(null)
      }
    }

    rtk.log('[RTK] 🎧 Registering WebSocket listeners', {
      socketId: socket.id ?? 'pending',
      connected: socket.connected
    })

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
