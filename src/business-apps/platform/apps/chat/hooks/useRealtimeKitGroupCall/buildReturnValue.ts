/**
 * Pure helper that builds the UseGroupCallReturn object for useRealtimeKitGroupCall.
 * Keeps the main hook free of a large inline return and makes the public API shape explicit.
 */

import type { UseGroupCallReturn } from '../../services/callTypes'

/**
 * Builds the single object satisfying UseGroupCallReturn.
 *
 * @param params - All pieces from call state, meeting, and actions hooks plus derived flags.
 * @returns The public API object for the group call hook.
 */
export function buildReturnValue(params: {
  stableMeeting: any
  combinedCallState: any
  isInCall: boolean
  isHost: boolean
  media: {
    localStream: MediaStream | null
    setVideoQuality: (quality: any) => Promise<void>
    toggleRnnoise: (enabled: boolean) => Promise<void>
    setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => void
    switchAudioDevice: (deviceId: string) => Promise<void>
    switchVideoDevice: (deviceId: string) => Promise<void>
    toggleBackground: () => void
  }
  participantsHook: {
    remoteStreams: Map<string, MediaStream>
    participants: any[]
    pendingInvites: Map<string, any>
    inviteToCall: (participants: any[], conversationName?: string) => void
    reconnectParticipant: (participantId: string) => Promise<void>
  }
  screenShare: { toggleScreenShare: () => Promise<boolean> }
  websocket: { sendReaction: (emoji: string) => Promise<void> }
  activeSpeaker: { activeSpeakerId: string | null; activeSpeakerHistory: string[] }
  incomingInvite: any
  isRingingLeader: boolean
  activeConversationCalls: Map<string, any>
  callState: { conversationName?: string; transcriptionEnabled: boolean }
  initiateCall: (
    roomId: string,
    callType: any,
    participants: any[],
    conversationName?: string,
    calendarMeetingId?: string | null,
    conversationType?: any
  ) => void
  confirmStartCall: (preferences: any) => void
  cancelSetup: () => void
  startCall: (
    conversationId: string,
    callType: any,
    participants: any[],
    conversationName?: string,
    calendarMeetingId?: string | null
  ) => void
  joinCall: (roomId: string, callType: any, initialParticipantsOrPreferences?: any) => void
  acceptInvite: (initialPreferences?: any) => void
  declineInvite: () => void
  leaveCall: () => void
  stableToggleMute: () => boolean
  stableToggleVideo: () => boolean
  stableToggleBackground: () => void
  toggleMinimize: () => void
  stableToggleRaiseHand: () => Promise<boolean>
  stableGetConnectionDiagnostics: () => Map<string, any>
  toggleTranscription: () => void
}): UseGroupCallReturn {
  const {
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
    isRingingLeader,
    activeConversationCalls,
    callState,
    initiateCall,
    confirmStartCall,
    cancelSetup,
    startCall,
    joinCall,
    acceptInvite,
    declineInvite,
    leaveCall,
    stableToggleMute,
    stableToggleVideo,
    stableToggleBackground,
    toggleMinimize,
    stableToggleRaiseHand,
    stableGetConnectionDiagnostics,
    toggleTranscription
  } = params

  return {
    meeting: stableMeeting,
    callState: combinedCallState,
    isInCall,
    isHost,
    localStream: media.localStream,
    remoteStreams: participantsHook.remoteStreams,
    participants: participantsHook.participants,
    pendingInvites: participantsHook.pendingInvites,
    incomingInvite,
    isRingingLeader,
    activeConversationCalls,
    currentCallConversationName: callState.conversationName,
    activeSpeakerId: activeSpeaker.activeSpeakerId,
    activeSpeakerHistory: activeSpeaker.activeSpeakerHistory,
    initiateCall,
    confirmStartCall,
    cancelSetup,
    startCall,
    joinCall,
    acceptInvite,
    declineInvite,
    leaveCall,
    toggleMute: stableToggleMute,
    toggleVideo: stableToggleVideo,
    toggleScreenShare: screenShare.toggleScreenShare,
    setVideoQuality: media.setVideoQuality,
    toggleMinimize,
    toggleBackground: stableToggleBackground,
    toggleRaiseHand: stableToggleRaiseHand,
    sendReaction: websocket.sendReaction,
    inviteToCall: participantsHook.inviteToCall,
    reconnectParticipant: participantsHook.reconnectParticipant,
    getConnectionDiagnostics: stableGetConnectionDiagnostics,
    transcriptionEnabled: callState.transcriptionEnabled,
    toggleTranscription,
    toggleRnnoise: media.toggleRnnoise,
    setRnnoiseMode: media.setRnnoiseMode,
    switchAudioDevice: media.switchAudioDevice,
    switchVideoDevice: media.switchVideoDevice
  }
}
