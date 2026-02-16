/**
 * One-off effects for RTK group call: media sync, join completion, logging/metrics,
 * transcript-ready, heartbeat, other-tab storage, timer sync, cleanup, debug. Effect-only hook.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react'
import { toast } from '@newwork/nw-design-system'
import { setActiveCallInStorage } from '../../utils/activeCallStorage'
import type { RealtimeKitCallRefs } from './contextTypes'
import type { GroupCallInvite } from '../../services/callTypes'

const ACTIVE_CALL_KEY = 'newwork_active_call'

/**
 * Effect-only hook. Runs media sync, join completion, quality metrics, transcript listener,
 * heartbeat, storage listener, timer sync, cleanup, and dev debug helpers.
 *
 * Needs: callState, setCallState, meeting, media, participantsHook, wsClient, currentUser,
 * refs, activeConversationCalls, setIncomingInvite, incomingInvite, stopDurationTimer,
 * combinedCallState, leaveCall, diagnostics, isInCall, rtkDebug.
 *
 * Does: Syncs media state into callState; on meeting join sets status to 'connected'; optional
 * log on session start; periodic call quality metrics; transcript-ready socket listener + toast;
 * heartbeat (setActiveCallInStorage every 1s when connected); storage listener to dismiss invite
 * when user joins in another tab; sync timer from activeConversationCalls; cleanup on unmount;
 * in dev, attach/detach debug helpers on window.
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
  incomingInvite: GroupCallInvite | null
  stopDurationTimer: () => void
  combinedCallState: any
  leaveCall: () => void
  diagnostics: { logSimulcastInfo: () => void }
  isInCall: boolean
  rtkDebug: { log: (...args: any[]) => void; error: (...args: any[]) => void }
}): void {
  const {
    callState,
    setCallState,
    meeting,
    media,
    participantsHook,
    wsClient,
    currentUser,
    refs,
    activeConversationCalls,
    setIncomingInvite,
    incomingInvite,
    stopDurationTimer,
    combinedCallState,
    leaveCall,
    diagnostics,
    isInCall,
    rtkDebug
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
      rtkDebug.log('[RTK] Meeting joined successfully')
      setCallState((prev: any) => ({ ...prev, status: 'connected' }))
    }
  }, [meeting, callState.status, setCallState, rtkDebug])

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
    if (callState.status !== 'connected') return
    const logInterval = setInterval(() => {
      const stats = media.rnnoiseStats
      const callDuration = Date.now() - (callState.callStartTime ?? Date.now())
      console.log('[RTK Session] Call quality metrics', {
        duration: (callDuration / 1000).toFixed(0) + 's',
        rnnoiseEnabled: media.rnnoiseEnabled,
        rnnoiseStats: stats
          ? {
              framesProcessed: stats.framesProcessed,
              averageLatency: stats.averageLatency.toFixed(2) + 'ms',
              isActive: stats.isActive
            }
          : null,
        participants: participantsHook.participants.length
      })
    }, 30000)
    return () => clearInterval(logInterval)
  }, [callState.status, callState.callStartTime, media, participantsHook.participants])

  const transcriptSocket = wsClient?.getSocket()
  useEffect(() => {
    const socket = transcriptSocket
    if (!socket) return
    const handleTranscriptReady = (data: { noteId: string; meetingId: string; meetingTitle: string }) => {
      rtkDebug.log('[RTK] 📝 Transcript ready:', data)
      toast.success('Meeting Transcript Ready', {
        description: `${data.meetingTitle} - Transcript has been saved and shared with all participants`,
        duration: 1000000
      })
      rtkDebug.log('[RTK] 📝 View transcript at:', `/note-apps?noteId=${data.noteId}`)
    }
    rtkDebug.log('[RTK] 🎧 Registering transcript-ready listener', {
      socketId: socket.id ?? 'pending',
      connected: socket.connected
    })
    socket.off('transcript-ready')
    socket.on('transcript-ready', handleTranscriptReady)
    return () => socket.off('transcript-ready', handleTranscriptReady)
  }, [transcriptSocket, rtkDebug])

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
      if (event.key !== ACTIVE_CALL_KEY) return
      if (event.newValue && incomingInvite && currentUser) {
        try {
          const data = JSON.parse(event.newValue)
          if (data.userId === currentUser.id && Date.now() - data.timestamp < 5000) {
            rtkDebug.log('[RTK] User joined call in another tab, dismissing incoming invite')
            try {
              media.stopAllTracks()
              rtkDebug.log('[RTK] ✅ Media tracks stopped when dismissing invite (other tab joined)')
            } catch (err) {
              rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks when dismissing invite:', err)
            }
            refs.startTimeRef.current = null
            rtkDebug.log('[RTK] ⏱️ Cleared start time when dismissing invite (other tab joined)')
            setIncomingInvite(null)
          }
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [incomingInvite, currentUser, media, refs, setIncomingInvite, rtkDebug])

  useEffect(() => {
    if (!callState.roomId || !isInCall) return
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if ((conversationId === callState.roomId || callInfo.roomId === callState.roomId) && callInfo.startedAt) {
        const globalStartTime = new Date(callInfo.startedAt).getTime()
        if (!refs.startTimeRef.current || globalStartTime < refs.startTimeRef.current) {
          rtkDebug.log('[RTK] ⏱️ 🔄 Syncing timer from activeConversationCalls:', {
            conversationId,
            roomId: callState.roomId,
            backendRoomId: callInfo.roomId,
            previousStartTime: refs.startTimeRef.current,
            globalStartTime
          })
          refs.startTimeRef.current = globalStartTime
        }
        break
      }
    }
  }, [callState.roomId, isInCall, activeConversationCalls, refs, rtkDebug])

  useEffect(() => {
    return () => {
      stopDurationTimer()
      refs.startTimeRef.current = null
    }
  }, [stopDurationTimer, refs])

  useEffect(() => {
    if (typeof globalThis.window !== 'undefined' && process.env.NODE_ENV === 'development') {
      ;(globalThis as any).rtkLeaveCall = leaveCall
      ;(globalThis as any).rtkToggleMute = media.toggleMute
      ;(globalThis as any).rtkToggleVideo = media.toggleVideo
      ;(globalThis as any).rtkCallState = combinedCallState
      ;(globalThis as any).rtkLogSimulcastInfo = diagnostics.logSimulcastInfo
      rtkDebug.log('[RTK] 🔧 Debug functions exposed to console')
    }
    return () => {
      if (typeof globalThis.window !== 'undefined') {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
        delete (globalThis as any).rtkCallState
        delete (globalThis as any).rtkLogSimulcastInfo
      }
    }
  }, [leaveCall, media.toggleMute, media.toggleVideo, combinedCallState, diagnostics.logSimulcastInfo, rtkDebug])
}
