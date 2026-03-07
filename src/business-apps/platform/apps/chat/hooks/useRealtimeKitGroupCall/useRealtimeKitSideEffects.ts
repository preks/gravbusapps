/**
 * One-off effects for RTK group call: media sync, join completion, logging/metrics,
 * heartbeat, other-tab storage, timer sync, cleanup, debug. Effect-only hook.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { setActiveCallInStorage, ACTIVE_CALL_KEY, DECLINED_INVITE_KEY } from '../../utils/activeCallStorage'
import { clearRingingLeader } from '../../utils/ringingLeader'
import type { RealtimeKitCallRefs } from './contextTypes'
import type { GroupCallInvite } from '../../services/callTypes'

/**
 * Effect-only hook. Runs media sync, join completion, quality metrics, heartbeat,
 * storage listener, timer sync, cleanup, and dev debug helpers.
 *
 * Needs: callState, setCallState, meeting, media, participantsHook, wsClient, currentUser,
 * refs, activeConversationCalls, setIncomingInvite, incomingInvite, stopDurationTimer,
 * combinedCallState, leaveCall, diagnostics, isInCall.
 *
 * Does: Syncs media state into callState; on meeting join sets status to 'connected'; optional
 * log on session start; periodic call quality metrics; heartbeat (setActiveCallInStorage every 1s
 * when connected); storage listener to dismiss invite when user joins in another tab; sync timer
 * from activeConversationCalls; cleanup on unmount; in dev, attach/detach debug helpers on window.
 *
 * Returns: void (effect-only).
 */
export function useRealtimeKitSideEffects(params: {
  callState: any
  setCallState: Dispatch<SetStateAction<any>>
  meeting: any
  media: any
  participantsHook: any
  wsClient: any
  currentUser: any
  refs: RealtimeKitCallRefs
  activeConversationCalls: Map<string, any>
  setIncomingInvite: Dispatch<SetStateAction<GroupCallInvite | null>>
  setRingingLeader: Dispatch<SetStateAction<boolean>>
  incomingInvite: GroupCallInvite | null
  stopDurationTimer: () => void
  combinedCallState: any
  leaveCall: () => void
  diagnostics: { logSimulcastInfo: () => void }
  isInCall: boolean
}): void {
  const {
    callState,
    setCallState,
    meeting,
    media,
    participantsHook,
    currentUser,
    refs,
    activeConversationCalls,
    setIncomingInvite,
    setRingingLeader,
    incomingInvite,
    stopDurationTimer,
    combinedCallState,
    leaveCall,
    diagnostics,
    isInCall
  } = params

  useEffect(() => {
    setCallState((prev: any) => {
      if (
        prev.isMuted !== media.isMuted ||
        prev.isVideoEnabled !== media.isVideoEnabled ||
        prev.backgroundEnabled !== media.backgroundEnabled ||
        prev.videoQuality !== media.videoQuality
      ) {
        return {
          ...prev,
          isMuted: media.isMuted,
          isVideoEnabled: media.isVideoEnabled,
          backgroundEnabled: media.backgroundEnabled,
          videoQuality: media.videoQuality
        }
      }
      return prev
    })
  }, [setCallState, media.isMuted, media.isVideoEnabled, media.backgroundEnabled, media.videoQuality])

  useEffect(() => {
    if (!meeting || callState.status !== 'joining') return
    if (meeting.self?.id) {
      setCallState((prev: any) => ({ ...prev, status: 'connected' }))
    }
  }, [meeting, callState.status, setCallState])

  useEffect(() => {
    if (callState.status !== 'connected') return
  }, [
    callState.status,
    callState.sessionId,
    callState.meetingId,
    callState.roomId,
    callState.callType,
    media,
    participantsHook.participants
  ])

  useEffect(() => {
    if (callState.status !== 'connected' || !currentUser || !callState.roomId) return
    setActiveCallInStorage(currentUser.id, callState.roomId)
    const interval = setInterval(() => {
      if (currentUser && callState.roomId) {
        setActiveCallInStorage(currentUser.id, callState.roomId)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [callState.status, callState.roomId, currentUser])

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key || !incomingInvite || !currentUser) return

      if (event.key === ACTIVE_CALL_KEY && event.newValue) {
        try {
          const data = JSON.parse(event.newValue)
          if (data.userId === currentUser.id && Date.now() - data.timestamp < 5000) {
            try {
              media.stopAllTracks()
            } catch {
              // Best-effort
            }
            refs.startTimeRef.current = null
            clearRingingLeader(incomingInvite.roomId, incomingInvite.conversationId)
            setRingingLeader(false)
            setIncomingInvite(null)
          }
        } catch {
          // ignore
        }
        return
      }

      if (event.key === DECLINED_INVITE_KEY && event.newValue) {
        try {
          const data = JSON.parse(event.newValue)
          if (data.userId !== currentUser.id || Date.now() - data.timestamp > 5000) return
          const inviteRoomId = incomingInvite.roomId
          const inviteConversationId = incomingInvite.conversationId || incomingInvite.roomId
          const matches =
            data.roomId === inviteRoomId ||
            data.conversationId === inviteRoomId ||
            data.roomId === inviteConversationId ||
            data.conversationId === inviteConversationId
          if (matches) {
            try {
              media.stopAllTracks()
            } catch {
              // Best-effort
            }
            refs.startTimeRef.current = null
            clearRingingLeader(incomingInvite.roomId, incomingInvite.conversationId)
            setRingingLeader(false)
            setIncomingInvite(null)
          }
        } catch {
          // ignore
        }
      }
    }
    globalThis.addEventListener('storage', handleStorageChange)
    return () => globalThis.removeEventListener('storage', handleStorageChange)
  }, [incomingInvite, currentUser, media, refs, setIncomingInvite, setRingingLeader])

  useEffect(() => {
    if (!callState.roomId || !isInCall) return
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if ((conversationId === callState.roomId || callInfo.roomId === callState.roomId) && callInfo.startedAt) {
        const globalStartTime = new Date(callInfo.startedAt).getTime()
        if (!refs.startTimeRef.current || globalStartTime < refs.startTimeRef.current) {
          refs.startTimeRef.current = globalStartTime
        }
        break
      }
    }
  }, [callState.roomId, isInCall, activeConversationCalls, refs])

  useEffect(() => {
    return () => {
      stopDurationTimer()
      refs.startTimeRef.current = null
    }
  }, [stopDurationTimer, refs])

  useEffect(() => {
    if (globalThis.window !== undefined && process.env.NODE_ENV === 'development') {
      ;(globalThis as any).rtkLeaveCall = leaveCall
      ;(globalThis as any).rtkToggleMute = media.toggleMute
      ;(globalThis as any).rtkToggleVideo = media.toggleVideo
      ;(globalThis as any).rtkCallState = combinedCallState
      ;(globalThis as any).rtkLogSimulcastInfo = diagnostics.logSimulcastInfo
    }
    return () => {
      if (globalThis.window !== undefined) {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
        delete (globalThis as any).rtkCallState
        delete (globalThis as any).rtkLogSimulcastInfo
      }
    }
  }, [leaveCall, media.toggleMute, media.toggleVideo, combinedCallState, diagnostics.logSimulcastInfo])
}
