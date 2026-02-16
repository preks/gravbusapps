/**
 * Composes RTK group call: call state, meeting (SDK + sub-hooks), actions (join/leave/…),
 * invite listeners, globalCallManager sync, and side effects. Returns UseGroupCallReturn
 * built by buildReturnValue. No business logic; wiring only.
 */

import { useMemo } from 'react'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import { RealtimeKitApiClient } from '../services/realtimeKitApiClient'
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
  apiClient?: RealtimeKitApiClient | null
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
    incomingInvite,
    stopDurationTimer: actionsResult.stopDurationTimer,
    combinedCallState,
    leaveCall: actionsResult.leaveCall,
    diagnostics,
    isInCall
  })

  return useMemo(
    () =>
      buildReturnValue({
        stableMeeting,
        combinedCallState,
        isInCall,
        isHost,
        media,
        participantsHook,
        screenShare,
        websocket,
        activeSpeaker,
        incomingInvite,
        activeConversationCalls,
        callState,
        initiateCall: actionsResult.initiateCall,
        confirmStartCall: actionsResult.confirmStartCall,
        cancelSetup: actionsResult.cancelSetup,
        startCall: actionsResult.startCall,
        joinCall: actionsResult.joinCall,
        acceptInvite: actionsResult.acceptInvite,
        declineInvite: actionsResult.declineInvite,
        leaveCall: actionsResult.leaveCall,
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
      screenShare,
      websocket,
      activeSpeaker,
      incomingInvite,
      activeConversationCalls,
      callState.conversationName,
      callState.transcriptionEnabled,
      actionsResult
    ]
  )
}
