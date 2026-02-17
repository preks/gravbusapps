/**
 * Shared call types for RTK and compatibility.
 * P2P WebRTC implementation removed; types retained for Realtime Kit usage.
 */

export type CallType = 'audio' | 'video'
export type CallStatus = 'idle' | 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed'
export type CallDirection = 'outgoing' | 'incoming'

export interface CallParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
  stream?: MediaStream
  isMuted?: boolean
  isVideoOff?: boolean
}

export interface CallState {
  callId: string | null
  status: CallStatus
  direction: CallDirection | null
  type: CallType
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  localParticipant: CallParticipant | null
  remoteParticipant: CallParticipant | null
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  error: string | null
  startTime: number | null
}

export interface CallSignal {
  callId: string
  type: 'offer' | 'answer' | 'ice-candidate' | 'initiate' | 'accept' | 'reject' | 'end' | 'busy'
  callType: CallType
  from: CallParticipant
  to: CallParticipant
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit | null
  conversationId?: string
}
