/**
 * Composes RTK group call: call state, meeting (SDK + sub-hooks), actions (join/leave/…),
 * invite listeners, globalCallManager sync, and side effects. Returns UseGroupCallReturn
 * built by buildReturnValue. No business logic; wiring only.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { ChatWebSocketClient } from '@/common/network/chat/ChatWebSocketClient'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import type { CallParticipant } from '../services/webrtcClient'
import type { UseGroupCallReturn } from '../services/callTypes'
import { useCallPreferences } from './useCallPreferences'
import { setActiveCallInStorage, clearActiveCallFromStorage } from '../utils/activeCallStorage'
import { useRealtimeKitCallState } from './useRealtimeKitGroupCall/useRealtimeKitCallState'
import { useRealtimeKitInviteListeners } from './useRealtimeKitGroupCall/useRealtimeKitInviteListeners'
import { buildReturnValue } from './useRealtimeKitGroupCall/buildReturnValue'
import { useRealtimeKitGlobalCallManager } from './useRealtimeKitGroupCall/useRealtimeKitGlobalCallManager'
import { useRealtimeKitSideEffects } from './useRealtimeKitGroupCall/useRealtimeKitSideEffects'
import { useRealtimeKitMeeting } from './useRealtimeKitGroupCall/useRealtimeKitMeeting'
import { useRealtimeKitCallActions } from './useRealtimeKitGroupCall/useRealtimeKitCallActions'

export interface UseRealtimeKitGroupCallOptions {
  wsClient: ChatWebSocketClient | null
  apiClient?: ChatClient | null
  chatApiClient?: any // ChatApiClient type for in-call chat
  calendarApiClient?: any // CalendarApiClient type
  currentUser: CallParticipant | null
  callConversation?: any | null // Conversation where call was initiated (for participant avatars)
  activeConversation?: any | null // Currently active conversation (for in-call chat)
  conversations?: any[] | null // All conversations (for looking up call conversation by roomId)
  onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  onCallEnded?: (roomId: string, duration: number) => void
  onParticipantJoined?: (participant: CallParticipant) => void
  onParticipantLeft?: (participantId: string) => void
  accessToken?: string | null
  translate?: (key: string, params?: Record<string, any>) => string
}

export const useRealtimeKitGroupCall = (options: UseRealtimeKitGroupCallOptions): UseGroupCallReturn => {
  const { wsClient, chatApiClient, callConversation, activeConversation, currentUser } = options

  const {
    callState,
    setCallState,
    incomingInvite,
    setIncomingInvite,
    isRingingLeader,
    setRingingLeader,
    activeConversationCalls,
    setActiveConversationCalls,
    refs,
    restoredStateRef,
    clearInviteDedupeFor
  } = useRealtimeKitCallState()

  const callPreferences = useCallPreferences()

  const {
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
  } = useRealtimeKitMeeting({
    options,
    callState,
    setCallState,
    refs,
    restoredStateRef,
    callPreferences
  })

  const actionsResult = useRealtimeKitCallActions({
    options,
    callState,
    setCallState,
    incomingInvite,
    setIncomingInvite,
    setRingingLeader,
    activeConversationCalls,
    setActiveConversationCalls,
    refs,
    clearInviteDedupeFor,
    initMeeting,
    stableMeeting,
    media,
    joinMeetingWithTimeout,
    getResolvedNoiseSuppressionEnabled,
    getResolvedAutoGainControlEnabled,
    participantsHook,
    combinedCallState,
    websocket,
    diagnostics,
    callPreferences,
    setActiveCallInStorage,
    clearActiveCallFromStorage
  })

  const isInCall = callState.status !== 'idle' && callState.status !== 'ended'
  const isHost = !!callState.hostId && callState.hostId === currentUser?.id

  useRealtimeKitGlobalCallManager({
    callState,
    meeting,
    refs,
    leaveCallRef: actionsResult.leaveCallRef,
    toggleMinimizeRef: actionsResult.toggleMinimizeRef,
    participantsHookRef,
    websocketRef,
    media,
    screenShare,
    participantsHook,
    websocket,
    activeSpeaker,
    callPreferences,
    options,
    currentUser,
    chatApiClient,
    wsClient,
    activeConversation,
    callConversation
  })

  const inviteSocket = wsClient?.getSocket()
  useRealtimeKitInviteListeners({
    inviteSocket: inviteSocket ?? null,
    currentUser,
    refs,
    setIncomingInvite,
    setRingingLeader,
    setActiveConversationCalls,
    setCallState,
    clearInviteDedupeFor,
    leaveCallRef: actionsResult.leaveCallRef,
    media,
    participantsHook
  })

  useRealtimeKitSideEffects({
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
    setRingingLeader,
    incomingInvite,
    stopDurationTimer: actionsResult.stopDurationTimer,
    combinedCallState,
    leaveCall: actionsResult.leaveCall,
    diagnostics,
    isInCall
  })

  // When already in the call (meeting in-call dialog), sync transcription from calendar meeting
  // so the "transcript is being recorded" message shows for all participants regardless of join path
  const transcriptionSyncDoneRef = useRef(false)
  useEffect(() => {
    if (callState.status !== 'connected' && callState.status !== 'joining') {
      transcriptionSyncDoneRef.current = false
    }
  }, [callState.status])
  useEffect(() => {
    if (
      callState.status !== 'connected' ||
      callState.transcriptionEnabled ||
      !callState.calendarMeetingId ||
      !options.calendarApiClient ||
      transcriptionSyncDoneRef.current
    ) {
      return
    }
    transcriptionSyncDoneRef.current = true
    let cancelled = false
    options.calendarApiClient
      .getMeeting(callState.calendarMeetingId)
      .then((response: any) => {
        if (cancelled) return
        const meeting = response?.meeting ?? response
        const enabled =
          meeting?.transcriptionEnabled === true ||
          meeting?.metadata?.aiTranscriptionEnabled === true ||
          Boolean(meeting?.metadata?.aiTranscriptionEnabled)
        if (enabled) {
          setCallState((prev: any) => ({ ...prev, transcriptionEnabled: true }))
        }
      })
      .catch(() => {
        // Best-effort
      })
    return () => {
      cancelled = true
    }
  }, [
    callState.status,
    callState.transcriptionEnabled,
    callState.calendarMeetingId,
    options.calendarApiClient,
    setCallState
  ])

  const participantsForDisplay =
    (combinedCallState.status === 'setup' || combinedCallState.status === 'joining') &&
    refs.pendingCallParticipantsRef.current?.length
      ? refs.pendingCallParticipantsRef.current
      : undefined

  return useMemo(
    () =>
      buildReturnValue({
        stableMeeting,
        combinedCallState,
        isInCall,
        isHost,
        media,
        participantsHook,
        participantsForDisplay,
        screenShare,
        websocket,
        activeSpeaker,
        incomingInvite,
        isRingingLeader,
        activeConversationCalls,
        callState,
        initiateCall: actionsResult.initiateCall,
        confirmStartCall: prefs => {
          void actionsResult.confirmStartCall(prefs)
          return
        },
        cancelSetup: actionsResult.cancelSetup,
        startCall: (...args) => {
          void actionsResult.startCall(...args)
        },
        joinCall: (...args) => {
          void actionsResult.joinCall(...args)
        },
        acceptInvite: (preferences?: {
          micEnabled: boolean
          cameraEnabled: boolean
          backgroundEnabled?: boolean
          audioInputDeviceId?: string | null
          videoInputDeviceId?: string | null
        }) => {
          void actionsResult.acceptInvite(preferences)
        },
        declineInvite: actionsResult.declineInvite,
        leaveCall: () => {
          void actionsResult.leaveCall()
        },
        stableToggleMute: actionsResult.stableToggleMute,
        stableToggleVideo: actionsResult.stableToggleVideo,
        stableToggleBackground: actionsResult.stableToggleBackground,
        toggleMinimize: actionsResult.toggleMinimize,
        stableToggleRaiseHand: actionsResult.stableToggleRaiseHand,
        stableGetConnectionDiagnostics: actionsResult.stableGetConnectionDiagnostics,
        toggleTranscription: actionsResult.toggleTranscription
      }),
    [
      stableMeeting,
      combinedCallState,
      isInCall,
      isHost,
      media,
      participantsHook,
      participantsForDisplay,
      screenShare,
      websocket,
      activeSpeaker,
      incomingInvite,
      isRingingLeader,
      activeConversationCalls,
      callState.conversationName,
      callState.transcriptionEnabled,
      actionsResult
    ]
  )
}
