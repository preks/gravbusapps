/**
 * Call Session Types
 *
 * Types for CallSession and CallParticipant entities from the backend.
 */

export type CallType = 'direct' | 'group' | 'scheduled_meeting'
export type CallMediaType = 'audio' | 'video' | 'screenshare'
export type SessionStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned'
export type TranscriptionStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type ParticipantRole = 'host' | 'participant' | 'viewer'
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected'

export interface CallParticipant {
  id: string
  sessionId: string
  userId: string
  userName?: string
  userEmail?: string
  role: ParticipantRole
  joinedAt: string
  leftAt: string | null
  durationSeconds: number | null
  videoEnabled: boolean
  audioEnabled: boolean
  connectionQuality: ConnectionQuality | null
  maxConcurrentParticipants: number | null
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
}

export interface CallSession {
  id: string
  callType: CallType
  mediaType: CallMediaType
  sessionStatus: SessionStatus
  conversationId: string | null
  meetingId: string | null
  hostId: string
  cloudflareMeetingId: string
  cloudflareSessionId: string | null
  transcriptionEnabled: boolean
  transcriptionStatus: TranscriptionStatus | null
  transcriptNoteId: string | null
  sessionName: string | null
  startedAt: string
  endedAt: string | null
  plannedDurationMinutes: number | null
  actualDurationSeconds: number | null
  metadata: Record<string, any> | null
  createdAt: string
  updatedAt: string
  participants?: CallParticipant[]
  meeting?: {
    id: string
    title: string
    description?: string
    startTime: string
    endTime: string
  }
  conversation?: {
    id: string
    name: string
  }
  host?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
}

export interface QuerySessionsParams {
  meetingId?: string
  conversationId?: string
  userId?: string
  callType?: CallType
  sessionStatus?: SessionStatus
  limit?: number
  offset?: number
}
