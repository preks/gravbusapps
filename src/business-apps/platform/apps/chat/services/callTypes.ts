/**
 * Shared call types for RTK group/1:1 calls (used by useRealtimeKitGroupCall, GroupCallModalRtk, IncomingGroupCallDialog).
 */

import type { CallParticipant, CallType } from './webrtcClient'
import type { GroupCallParticipant, VideoQuality } from './groupWebrtcClient'

export type CallConversationType = 'direct' | 'group' | 'meeting'

export interface GroupCallInvite {
  roomId: string
  callType: CallType
  from: { id: string; odId: string; odName: string; avatarUrl?: string }
  conversationName?: string
  conversationId?: string
  conversationType?: CallConversationType
  transcriptionEnabled?: boolean
}

export interface GroupCallUIState {
  roomId: string | null
  callType: CallType
  status: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  participants: GroupCallParticipant[]
  hostId: string | null
  isMuted: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isMinimized: boolean
  hasBeenMinimized: boolean
  videoQuality: VideoQuality
  backgroundEnabled: boolean
  handRaised: boolean
  remoteHandsRaised: Record<string, boolean>
  handRaisedOrder?: Record<string, { order: number; timestamp: number }>
  startTime: number | null
  conversationName?: string
  conversationType?: CallConversationType
  duration: number
  callImplementation: 'realtime-kit'
  calendarMeetingId?: string | null
  transcriptionEnabled?: boolean
}

export interface ActiveConversationCall {
  roomId: string
  callType: CallType
  participantIds: string[]
  startedBy: string
  startedAt?: Date | string
  conversationName?: string
  conversationType?: CallConversationType
}

export type InviteStatus = 'pending' | 'declined' | 'not-answered' | 'left' | 'invited'

export interface PendingInvite {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
  invitedAt: number
  status?: InviteStatus
}

export interface UseGroupCallReturn {
  meeting?: any
  callState: GroupCallUIState
  isInCall: boolean
  isHost: boolean
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  pendingInvites: Map<string, PendingInvite>
  incomingInvite: GroupCallInvite | null
  isRingingLeader?: boolean
  activeConversationCalls: Map<string, ActiveConversationCall>
  currentCallConversationName?: string
  activeSpeakerId?: string | null
  activeSpeakerHistory?: string[]
  initiateCall?: (
    roomId: string,
    callType: CallType,
    participants: CallParticipant[],
    conversationName?: string,
    calendarMeetingId?: string | null,
    conversationType?: CallConversationType
  ) => void
  confirmStartCall?: (preferences: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }) => void
  cancelSetup?: () => void
  startCall: (
    roomId: string,
    callType: CallType,
    participants: CallParticipant[],
    conversationName?: string,
    calendarMeetingId?: string | null
  ) => void
  joinCall: (
    roomId: string,
    callType: CallType,
    initialParticipantsOrPreferences?:
      | CallParticipant[]
      | {
          micEnabled: boolean
          cameraEnabled: boolean
          backgroundEnabled?: boolean
          audioInputDeviceId?: string | null
          videoInputDeviceId?: string | null
        }
  ) => void
  acceptInvite: () => void
  declineInvite: () => void
  leaveCall: () => void
  toggleMute: () => boolean
  toggleVideo: () => boolean
  toggleScreenShare: () => Promise<boolean>
  setVideoQuality: (quality: VideoQuality) => Promise<void>
  toggleMinimize: () => void
  toggleBackground: () => void
  switchAudioDevice?: (deviceId: string) => Promise<void>
  switchVideoDevice?: (deviceId: string) => Promise<void>
  toggleRaiseHand?: () => Promise<boolean>
  sendReaction?: (emoji: string) => Promise<void>
  inviteToCall: (participants: CallParticipant[], conversationName?: string) => void
  reconnectParticipant: (participantId: string) => Promise<void>
  transcriptionEnabled?: boolean
  toggleTranscription?: () => void
  toggleRnnoise?: (enabled: boolean) => Promise<void>
  setRnnoiseMode?: (mode: 'gentle' | 'moderate' | 'aggressive') => void
  getConnectionDiagnostics: () => Map<string, any>
}
