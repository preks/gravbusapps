/**
 * Types for GroupCallModalRtk: RealtimeKit peer shape, sidebar view state, and modal props.
 */

import type { GroupCallParticipant, VideoQuality } from '../../services/groupWebrtcClient'
import type { GroupCallUIState, PendingInvite } from '../../services/callTypes'
import type { CallParticipant } from '../../services/webrtcClient'
import type { ChatWebSocketClient } from '../../services/chatWebSocketClient'
import type { ChatApiClient } from '../../services/chatApiClient'
import type { AvailableParticipant } from './ParticipantsPanel'

export interface RealtimeKitPeer extends GroupCallParticipant {
  name?: string
  userId?: string
  customParticipantId?: string
  audioTrack?: MediaStreamTrack
  videoTrack?: MediaStreamTrack
  audioEnabled?: boolean
  videoEnabled?: boolean
  screenShareEnabled?: boolean
  screenShareTracks?: any
}

export type SidebarView = 'closed' | 'participants' | 'chat' | 'audio-settings'

export interface GroupCallModalRtkProps {
  viewMode: 'full' | 'minimized'
  callState: GroupCallUIState
  localStream: MediaStream | null
  remoteStreams: Map<string, MediaStream>
  participants: GroupCallParticipant[]
  pendingInvites?: Map<string, PendingInvite>
  activeSpeakerId?: string | null
  activeSpeakerHistory?: string[]
  onEndCall: () => void
  onToggleMute: () => void
  onToggleVideo: () => void
  onToggleScreenShare?: () => void
  onSetVideoQuality?: (quality: VideoQuality) => void
  onToggleMinimize?: () => void
  onToggleBackground?: () => void
  onToggleRnnoise?: () => void
  onRnnoiseModeChange?: (mode: 'gentle' | 'moderate' | 'aggressive') => void
  onToggleRaiseHand?: () => void
  onSendReaction?: (emoji: string) => void
  onMicDeviceChange?: (deviceId: string) => Promise<void>
  onCameraDeviceChange?: (deviceId: string) => Promise<void>
  backgroundEnabled?: boolean
  rnnoiseEnabled?: boolean
  rnnoiseMode?: 'gentle' | 'moderate' | 'aggressive'
  prefixDataTestId?: string
  availableParticipants?: AvailableParticipant[]
  onInviteParticipant?: (participant: CallParticipant) => void
  onReconnectParticipant?: (participantId: string) => Promise<void>
  getConnectionDiagnostics?: () => Map<string, any>
  accessToken?: string
  currentUserId?: string | null
  currentUser?: any
  conversationName?: string
  wsClient?: ChatWebSocketClient | null
  transcriptionEnabled?: boolean
  apiClient?: ChatApiClient
  callConversation?: any
  activeConversation?: any
  activeExperts?: any[]
  hideReactionsAndHandRaise?: boolean
}
