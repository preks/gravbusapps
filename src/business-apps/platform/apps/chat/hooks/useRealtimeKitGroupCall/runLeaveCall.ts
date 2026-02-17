/**
 * Pure runner for leaving the current RTK group call.
 */

import type { LeaveCallContext } from './contextTypes'
import type { CallState } from './useRealtimeKitCallState'

interface SocketWithConnect {
  connect?: () => void
  connected?: boolean
  once?: (event: string, fn: () => void) => void
  emit?: (event: string, ...args: unknown[]) => void
}

interface SocketWithTimeout {
  timeout: (ms: number) => { emit: (event: string, ...args: unknown[]) => void }
  emit: (event: string, ...args: unknown[]) => void
}

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
    accessToken
  } = ctx

  const roomId = refs.callStateRoomIdRef.current
  const meetingId = refs.meetingIdRef.current
  const callStartTime = refs.callStartTimeRef.current

  if (!roomId) return

  if (refs.isLeavingRef.current) {
    return
  }

  const sessionIdForEmit = refs.sessionIdRef.current
  const isMeetingForEmit = !!refs.calendarMeetingIdRef.current

  refs.lastStartEmitRef.current = null
  clearInviteDedupeFor(meetingId, roomId)

  // Close modal immediately so UI does not stay open while cleanup runs
  globalCallManager.updateCallState({ status: 'ended' })

  const meetingForLeave = stableMeeting || globalCallManager.getCallData().realtimeKitMeeting

  try {
    refs.isLeavingRef.current = true

    const duration = callStartTime ? Date.now() - callStartTime : 0

    const isEarlyCancellation = !stableMeeting && !refs.isCancelledRef.current

    if (isEarlyCancellation) {
      if (refs.abortControllerRef.current) {
        refs.abortControllerRef.current.abort()
      }

      refs.isCancelledRef.current = true

      if (meetingId) {
        const user = refs.currentUserRef.current
        const socket = refs.wsClientRef.current?.getSocket()
        if (user && socket) {
          socket.emit('rtk-group-call:cancelled', {
            conversationId: roomId,
            meetingId: meetingId,
            hostId: user.id
          })
        }
      }
    }

    try {
      media.stopAllTracks()
    } catch {
      // Best-effort cleanup
    }

    stopDurationTimer()
    setIncomingInvite(null)

    if (refs.isScreenSharingRef.current && meetingForLeave?.self) {
      try {
        await meetingForLeave.self.disableScreenShare()
      } catch {
        // Best-effort cleanup
      }
    }

    if (meetingForLeave) {
      try {
        await meetingForLeave.leave()
      } catch {
        // Best-effort cleanup
      }
    }

    const user = refs.currentUserRef.current
    const wsClientForEmit = refs.wsClientRef.current || globalCallManager.getCallData().wsClient
    let socket = wsClientForEmit?.getSocket()
    const sessionId = sessionIdForEmit
    const isMeeting = isMeetingForEmit

    const socketWithConnect = socket as SocketWithConnect | undefined
    if (socket && !socket.connected && typeof socketWithConnect?.connect === 'function') {
      try {
        socketWithConnect.connect()
      } catch {
        // Best-effort
      }
    }

    if (socket && !socket.connected) {
      await new Promise<void>(resolve => {
        const timeout = setTimeout(() => resolve(), 1500)
        socket.once('connect', () => {
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
              socket.once('connect', () => {
                clearTimeout(timeout)
                resolve()
              })
            })
          }
        } catch {
          // Best-effort
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

      const socketWithTimeout = socket as SocketWithTimeout
      if (typeof socketWithTimeout.timeout === 'function') {
        await new Promise<void>(resolve => {
          socketWithTimeout.timeout(1000).emit('rtk-group-call:left', payload, () => resolve())
        })
      } else {
        socket.emit('rtk-group-call:left', payload)
      }
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

    setCallState((prev: CallState) => ({
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

    if (roomId) {
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        newMap.delete(roomId)
        return newMap
      })
    }

    callPreferences.clearActiveCall()
    clearActiveCallFromStorage()
    refs.onCallEndedRef.current?.(roomId, duration)

    setTimeout(() => {
      setCallState((prev: CallState) => ({ ...prev, status: 'idle' }))
      refs.isLeavingRef.current = false
      refs.isCancelledRef.current = false
    }, 100)
  } catch (error) {
    console.error('[useRealtimeKitGroupCall] Error leaving call:', error)
    try {
      media.stopAllTracks()
    } catch {
      // Best-effort
    }
    stopDurationTimer()
    if (refs.isScreenSharingRef.current && meetingForLeave?.self?.disableScreenShare) {
      try {
        await meetingForLeave.self.disableScreenShare()
      } catch {
        // Best-effort
      }
    }
    if (meetingForLeave?.leave) {
      try {
        await meetingForLeave.leave()
      } catch {
        // Best-effort
      }
    }
    refs.isLeavingRef.current = false
    refs.isCancelledRef.current = false
    refs.startTimeRef.current = null
    refs.conversationIdRef.current = null
    refs.callStateRoomIdRef.current = null
    refs.meetingIdRef.current = null
    refs.sessionIdRef.current = null
    refs.wasIdleRef.current = true
    refs.abortControllerRef.current = null
    refs.pendingCallParticipantsRef.current = []
    refs.calendarMeetingIdRef.current = null
    setCallState((prev: CallState) => ({
      ...prev,
      isMinimized: false,
      status: 'idle',
      roomId: null,
      meetingId: null,
      sessionId: null,
      callType: 'audio',
      callStartTime: null,
      participants: [],
      hostId: null
    }))
    globalCallManager.clearCall()
    if (roomId) {
      setActiveConversationCalls((prev: Map<string, any>) => {
        const newMap = new Map(prev)
        newMap.delete(roomId)
        return newMap
      })
    }
    callPreferences.clearActiveCall()
    clearActiveCallFromStorage()
  }
}
