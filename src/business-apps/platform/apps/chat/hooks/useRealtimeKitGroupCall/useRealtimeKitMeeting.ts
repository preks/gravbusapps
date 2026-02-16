/**
 * Owns RealtimeKit SDK and sub-hook setup, ref syncing, and combined UI state.
 * Single responsibility: meeting/session and derived state for the call UI.
 */

import { useCallback, useMemo, useRef, type MutableRefObject } from 'react'
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react'
import { useRealtimeKitMedia } from '../useRealtimeKitMedia'
import { useRealtimeKitScreenShare } from '../useRealtimeKitScreenShare'
import { useRealtimeKitWebSocket } from '../useRealtimeKitWebSocket'
import { useRealtimeKitParticipants } from '../useRealtimeKitParticipants'
import { useRealtimeKitDiagnostics } from '../useRealtimeKitDiagnostics'
import { useRealtimeKitActiveSpeaker } from '../useRealtimeKitActiveSpeaker'
import { globalCallManager } from '../../services/globalCallManager'
import type { GroupCallUIState } from '../../services/callTypes'
import type { RealtimeKitCallRefs } from './contextTypes'

/**
 * Needs: options (wsClient, currentUser, translate), callState result (refs, setCallState,
 * restoredStateRef, callState), callPreferences.
 *
 * Does: useRealtimeKitClient, useRealtimeKitMedia, useRealtimeKitScreenShare, useRealtimeKitWebSocket,
 * useRealtimeKitParticipants, useRealtimeKitDiagnostics, useRealtimeKitActiveSpeaker; syncs refs;
 * joinMeetingWithTimeout, handleRnnoiseStateChange, handleScreenShareStateChange, handleReactionReceived,
 * getResolvedNoiseSuppressionEnabled, getResolvedAutoGainControlEnabled; stableMeeting; combinedCallState.
 *
 * Returns: meeting, initMeeting, stableMeeting, media, screenShare, participantsHook, websocket,
 * activeSpeaker, diagnostics, combinedCallState, joinMeetingWithTimeout, getResolvedNoiseSuppressionEnabled,
 * getResolvedAutoGainControlEnabled, participantsHookRef, websocketRef.
 */
export function useRealtimeKitMeeting(params: {
  options: any
  callState: any
  setCallState: (updater: (prev: any) => any) => void
  refs: RealtimeKitCallRefs
  restoredStateRef: MutableRefObject<{
    handRaised: boolean
    remoteHandsRaised: Record<string, boolean>
    handRaisedOrder: Record<string, { order: number; timestamp: number }>
    isMuted: boolean
    isVideoEnabled: boolean
    rnnoiseEnabled: boolean
  } | null>
  callPreferences: any
}) {
  const { options, callState, refs, restoredStateRef, callPreferences } = params
  const { wsClient, currentUser, translate, onCallEnded } = options

  const participantsHookRef = useRef<any>(null)
  const websocketRef = useRef<any>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- third arg passed by callers for context, not used in implementation
  const joinMeetingWithTimeout = useCallback(async (initializedMeeting: any, timeoutMs: number, _context?: any) => {
    return await new Promise<void>((resolve, reject) => {
      let finished = false
      const timeoutId = setTimeout(() => {
        if (finished) return
        finished = true
        reject(new Error(`Failed to join meeting: join() timeout after ${timeoutMs}ms`))
      }, timeoutMs)
      Promise.resolve()
        .then(() => initializedMeeting.join())
        .then(() => {
          if (finished) return
          finished = true
          clearTimeout(timeoutId)
          resolve()
        })
        .catch(err => {
          if (finished) return
          finished = true
          clearTimeout(timeoutId)
          reject(err)
        })
    })
  }, [])

  const handleRnnoiseStateChange = useCallback((enabled: boolean) => {
    globalCallManager.updateCallState({ rnnoiseEnabled: enabled })
    globalCallManager.setCall({ rnnoiseEnabled: enabled })
  }, [])

  const getResolvedNoiseSuppressionEnabled = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem('chat_call_noise_suppression_enabled')
      return saved === null ? true : saved === 'true'
    } catch {
      return true
    }
  }, [])

  const getResolvedAutoGainControlEnabled = useCallback((): boolean => {
    try {
      const saved = localStorage.getItem('chat_call_auto_gain_control_enabled')
      return saved === null ? false : saved === 'true'
    } catch {
      return false
    }
  }, [])

  const handleScreenShareStateChange = useCallback(() => {
    // No-op; screen share state is handled by SDK/UI
  }, [])

  const handleReactionReceived = useCallback(() => {
    // No-op; reactions are handled by SDK/UI
  }, [])

  const [meeting, initMeeting] = useRealtimeKitClient()

  const stableMeeting = useMemo(() => meeting, [meeting?.self?.roomState, meeting?.self?.roomJoined, callState.status])

  const media = useRealtimeKitMedia({
    meeting: stableMeeting,
    callType: callState.callType,
    initialVideoQuality: callPreferences.videoQuality,
    initialBackgroundEnabled: callPreferences.backgroundEnabled,
    initialNoiseSuppressionEnabled: getResolvedNoiseSuppressionEnabled(),
    initialAutoGainControlEnabled: getResolvedAutoGainControlEnabled(),
    initialRnnoiseEnabled: restoredStateRef.current?.rnnoiseEnabled,
    onRnnoiseStateChange: handleRnnoiseStateChange,
    callStatus: callState.status,
    initialIsMuted: restoredStateRef.current?.isMuted,
    initialIsVideoEnabled: restoredStateRef.current?.isVideoEnabled
  })

  const screenShare = useRealtimeKitScreenShare({
    meeting: stableMeeting,
    onScreenShareStateChange: handleScreenShareStateChange
  })

  const websocket = useRealtimeKitWebSocket({
    wsClient,
    roomId: callState.roomId,
    meetingId: callState.meetingId,
    currentUser,
    meeting: stableMeeting,
    onReactionReceived: handleReactionReceived,
    translate,
    initialHandRaised: restoredStateRef.current?.handRaised,
    initialRemoteHandsRaised: restoredStateRef.current?.remoteHandsRaised,
    initialHandRaisedOrder: restoredStateRef.current?.handRaisedOrder
  })

  const participantsHook = useRealtimeKitParticipants({
    meeting: stableMeeting,
    wsClient,
    roomId: callState.roomId,
    meetingId: callState.meetingId,
    callType: callState.callType,
    currentUser,
    localStream: media.localStream,
    callStatus: callState.status,
    emitSocketEvent: websocket.emitSocketEvent,
    cleanupParticipantHandState: websocket.cleanupParticipantHandState,
    calendarMeetingId: callState.calendarMeetingId
  })

  const diagnostics = useRealtimeKitDiagnostics({
    meeting: stableMeeting,
    participants: participantsHook.participants,
    isInCall: callState.status === 'connected',
    callStatus: callState.status
  })

  const activeSpeaker = useRealtimeKitActiveSpeaker({
    meeting: stableMeeting
  })

  refs.mediaRef.current = media
  refs.screenShareRef.current = screenShare
  refs.isScreenSharingRef.current = screenShare.isScreenSharing
  refs.wsClientRef.current = wsClient
  refs.currentUserRef.current = currentUser
  refs.onCallEndedRef.current = onCallEnded
  participantsHookRef.current = participantsHook
  websocketRef.current = websocket

  const combinedCallState: GroupCallUIState = useMemo(
    () => ({
      roomId: callState.roomId,
      callType: callState.callType,
      status: callState.status,
      isMinimized: callState.isMinimized,
      hasBeenMinimized: callState.hasBeenMinimized,
      isMuted: media.isMuted,
      isVideoEnabled: media.isVideoEnabled,
      isScreenSharing: screenShare.isScreenSharing,
      videoQuality: media.videoQuality,
      backgroundEnabled: media.backgroundEnabled,
      rnnoiseEnabled: media.rnnoiseEnabled,
      handRaised: websocket.handRaised,
      remoteHandsRaised: websocket.remoteHandsRaised || {},
      handRaisedOrder: websocket.handRaisedOrder || {},
      participants: participantsHook.participants,
      hostId: callState.hostId,
      startTime: callState.callStartTime,
      duration: callState.duration,
      callImplementation: 'realtime-kit' as const
    }),
    [
      callState.roomId,
      callState.callType,
      callState.status,
      callState.isMinimized,
      callState.hostId,
      callState.callStartTime,
      media.isMuted,
      media.isVideoEnabled,
      screenShare.isScreenSharing,
      media.videoQuality,
      media.backgroundEnabled,
      media.rnnoiseEnabled,
      websocket.handRaised,
      websocket.remoteHandsRaised,
      websocket.handRaisedOrder,
      participantsHook.participants
    ]
  )

  return {
    meeting,
    initMeeting,
    stableMeeting,
    media,
    screenShare,
    participantsHook,
    websocket,
    activeSpeaker,
    diagnostics,
    combinedCallState,
    joinMeetingWithTimeout,
    getResolvedNoiseSuppressionEnabled,
    getResolvedAutoGainControlEnabled,
    participantsHookRef,
    websocketRef
  }
}
