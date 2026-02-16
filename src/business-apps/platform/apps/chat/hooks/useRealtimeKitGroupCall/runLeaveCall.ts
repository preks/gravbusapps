/**
 * Pure runner for leaving the current RTK group call.
 */

import type { LeaveCallContext } from './contextTypes'

export async function runLeaveCall(ctx: LeaveCallContext): Promise<void> {
  const {
    refs,
    stableMeeting,
    globalCallManager,
    stopDurationTimer,
    setCallState,
    setIncomingInvite,
    setActiveConversationCalls,
    clearActiveCallFromStorage,
    callPreferences,
    clearInviteDedupeFor,
    media,
    rtkDebug,
    accessToken
  } = ctx

  const roomId = refs.callStateRoomIdRef.current
  const meetingId = refs.meetingIdRef.current
  const callStartTime = refs.callStartTimeRef.current
  const currentStatus = refs.callStatusRef.current

  if (!roomId) return

  if (refs.isLeavingRef.current) {
    rtkDebug.warn('[RTK] ⚠️ leaveCall already in progress, ignoring duplicate call')
    return
  }

  const sessionIdForEmit = refs.sessionIdRef.current
  const isMeetingForEmit = !!refs.calendarMeetingIdRef.current

  refs.lastStartEmitRef.current = null
  clearInviteDedupeFor(meetingId, roomId)

  try {
    refs.isLeavingRef.current = true

    const meetingForLeave = stableMeeting || globalCallManager.getCallData().realtimeKitMeeting

    rtkDebug.log('[RTK] 🚪 Leaving call...', {
      roomId,
      meetingId,
      hasMeeting: !!meetingForLeave,
      status: currentStatus,
      wasCancelled: refs.isCancelledRef.current
    })

    const duration = callStartTime ? Date.now() - callStartTime : 0
    const rnnoiseStats = refs.mediaRef.current?.rnnoiseStats

    rtkDebug.log('[RTK Session] Call ended', {
      sessionId: sessionIdForEmit,
      meetingId,
      duration: (duration / 1000).toFixed(2) + 's',
      rnnoiseStats: rnnoiseStats
        ? {
            framesProcessed: rnnoiseStats.framesProcessed,
            totalProcessingTime: rnnoiseStats.totalProcessingTime.toFixed(2) + 's',
            averageLatency: rnnoiseStats.averageLatency.toFixed(2) + 'ms'
          }
        : null,
      timestamp: new Date().toISOString()
    })

    const isEarlyCancellation = !stableMeeting && !refs.isCancelledRef.current

    if (isEarlyCancellation) {
      if (refs.abortControllerRef.current) {
        refs.abortControllerRef.current.abort()
        rtkDebug.log('[RTK] 🚫 Aborted in-flight call creation')
      }

      refs.isCancelledRef.current = true

      rtkDebug.log('[RTK] 🚫 Detected early cancellation during setup', {
        roomId,
        meetingId: meetingId || 'not-yet-created',
        hasMeeting: !!stableMeeting,
        status: currentStatus
      })

      if (meetingId) {
        const user = refs.currentUserRef.current
        const socket = refs.wsClientRef.current?.getSocket()
        if (user && socket) {
          socket.emit('rtk-group-call:cancelled', {
            conversationId: roomId,
            meetingId: meetingId,
            hostId: user.id
          })
          rtkDebug.log('[RTK] 📤 Emitted rtk-group-call:cancelled event', {
            conversationId: roomId,
            meetingId: meetingId
          })
        }
      } else {
        rtkDebug.log('[RTK] ⏭️ Skipping cancellation event - meeting not created yet, no invites sent')
      }
    }

    try {
      media.stopAllTracks()
      rtkDebug.log('[RTK] ✅ All media tracks stopped', {
        phase: currentStatus,
        hadMeeting: !!stableMeeting
      })
    } catch (err) {
      rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during cleanup:', err)
    }

    stopDurationTimer()
    setIncomingInvite(null)

    if (refs.isScreenSharingRef.current && meetingForLeave?.self) {
      try {
        await meetingForLeave.self.disableScreenShare()
        rtkDebug.log('[RTK] ✅ Screen share stopped during cleanup')
      } catch (err) {
        rtkDebug.error('[RTK] ⚠️ Failed to stop screen share during cleanup:', err)
      }
    }

    if (meetingForLeave) {
      try {
        await meetingForLeave.leave()
        rtkDebug.log('[RTK] ✅ SDK meeting.leave() completed')
      } catch (err) {
        rtkDebug.error('[RTK] ❌ SDK meeting.leave() error:', err)
      }
    }

    const user = refs.currentUserRef.current
    const wsClientForEmit = refs.wsClientRef.current || globalCallManager.getCallData().wsClient
    let socket = wsClientForEmit?.getSocket()
    const sessionId = sessionIdForEmit
    const isMeeting = isMeetingForEmit

    if (socket && !socket.connected && typeof (socket as any).connect === 'function') {
      try {
        ;(socket as any).connect()
      } catch {
        // Best-effort
      }
    }

    if (socket && !socket.connected) {
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 1500)
        socket!.once('connect', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    if (wsClientForEmit && !socket) {
      const token = accessToken ?? globalCallManager.getCallData().accessToken
      if (token) {
        try {
          wsClientForEmit.connect(token)
          socket = wsClientForEmit.getSocket()

          if (socket && !socket.connected) {
            await new Promise<void>(resolve => {
              const timeout = setTimeout(() => resolve(), 1500)
              socket!.once('connect', () => {
                clearTimeout(timeout)
                resolve()
              })
            })
          }
        } catch (err) {
          rtkDebug.warn('[RTK] ⚠️ Failed to re-establish socket for leave event', err)
        }
      }
    }

    if (user && socket) {
      const payload = {
        conversationId: roomId,
        meetingId: meetingId,
        sessionId: sessionId,
        isMeeting: isMeeting,
        participantId: user.id
      }

      if (typeof (socket as any).timeout === 'function') {
        await new Promise<void>(resolve => {
          ;(socket as any).timeout(1000).emit('rtk-group-call:left', payload, () => resolve())
        })
      } else {
        socket.emit('rtk-group-call:left', payload)
      }
    } else {
      rtkDebug.warn('[RTK] ⚠️ Skipping leave event - missing user or socket')
    }

    refs.startTimeRef.current = null
    refs.conversationIdRef.current = null
    refs.callStateRoomIdRef.current = null
    refs.meetingIdRef.current = null
    refs.sessionIdRef.current = null
    refs.wasIdleRef.current = true
    refs.abortControllerRef.current = null
    refs.pendingCallParticipantsRef.current = []
    refs.calendarMeetingIdRef.current = null

    setCallState(prev => ({
      ...prev,
      isMinimized: false,
      status: 'ended',
      roomId: null,
      meetingId: null,
      sessionId: null,
      callType: 'audio',
      callStartTime: null,
      participants: [],
      hostId: null
    }))

    globalCallManager.clearCall()
    rtkDebug.log('[RTK] 🧹 Cleared globalCallManager on leave')

    if (roomId) {
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.delete(roomId)
        rtkDebug.log('[RTK] 🧹 Cleared activeConversationCalls entry on leave:', {
          conversationId: roomId,
          hadEntry: prev.has(roomId),
          remainingEntries: newMap.size
        })
        return newMap
      })
    }

    callPreferences.clearActiveCall()
    clearActiveCallFromStorage()
    refs.onCallEndedRef.current?.(roomId, duration)

    setTimeout(() => {
      setCallState(prev => ({ ...prev, status: 'idle' }))
      refs.isLeavingRef.current = false
      refs.isCancelledRef.current = false
    }, 100)
  } catch (error) {
    console.error('[useRealtimeKitGroupCall] ❌ Error leaving call:', error)
    rtkDebug.error('[RTK] Error leaving call:', error)
    refs.isLeavingRef.current = false
  }
}
