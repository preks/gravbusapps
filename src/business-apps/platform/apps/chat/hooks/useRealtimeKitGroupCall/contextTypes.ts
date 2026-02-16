/**
 * Shared context types for RTK group call runners (confirm start, join, leave).
 * Kept minimal so runners and main hook can share them without circular deps.
 */

import type { MutableRefObject, Dispatch, SetStateAction } from 'react'
import type { CallType } from '../../services/webrtcClient'
import type { GroupCallInvite, ActiveConversationCall } from '../../services/callTypes'

export type CallStatus = 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'

/** Refs bundle passed to runners; populated by useRealtimeKitCallState. */
export interface RealtimeKitCallRefs {
  meetingIdRef: MutableRefObject<string | null>
  sessionIdRef: MutableRefObject<string | null>
  callStateRoomIdRef: MutableRefObject<string | null>
  hostIdRef: MutableRefObject<string | null>
  startTimeRef: MutableRefObject<number | null>
  durationTimerRef: MutableRefObject<NodeJS.Timeout | null>
  isInCallRef: MutableRefObject<boolean>
  conversationIdRef: MutableRefObject<string | null>
  joinCallConversationIdRef: MutableRefObject<string | null>
  wasIdleRef: MutableRefObject<boolean>
  isLeavingRef: MutableRefObject<boolean>
  isCancelledRef: MutableRefObject<boolean>
  abortControllerRef: MutableRefObject<AbortController | null>
  calendarMeetingIdRef: MutableRefObject<string | null>
  pendingCallParticipantsRef: MutableRefObject<any[]>
  recentlySeenInviteKeysRef: MutableRefObject<Map<string, number>>
  lastStartEmitRef: MutableRefObject<{ key: string; ts: number } | null>
  incomingInviteRef: MutableRefObject<GroupCallInvite | null>
  callStatusRef: MutableRefObject<CallStatus>
  callTypeRef: MutableRefObject<CallType>
  conversationNameRef: MutableRefObject<string | undefined>
  conversationTypeRef: MutableRefObject<'direct' | 'group' | 'meeting' | undefined>
  isMinimizedRef: MutableRefObject<boolean>
  callStartTimeRef: MutableRefObject<number | null>
  mediaRef: MutableRefObject<any>
  screenShareRef: MutableRefObject<any>
  isScreenSharingRef: MutableRefObject<boolean>
  wsClientRef: MutableRefObject<any>
  currentUserRef: MutableRefObject<any>
  onCallEndedRef: MutableRefObject<((roomId: string, duration: number) => void) | undefined>
}

export interface ConfirmStartCallContext {
  refs: RealtimeKitCallRefs
  options: any
  apiClient: any
  initMeeting: (config: any) => Promise<any>
  callPreferences: any
  getResolvedNoiseSuppressionEnabled: () => boolean
  getResolvedAutoGainControlEnabled: () => boolean
  media: any
  participantsHook: any
  wsClient: any
  onCallStarted: ((roomId: string, participants: any[]) => void) | undefined
  startDurationTimer: () => void
  setCallState: Dispatch<SetStateAction<any>>
  joinMeetingWithTimeout: (meeting: any, timeoutMs: number, context?: any) => Promise<void>
  rtkDebug: { log: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
  currentUser: any
}

export interface JoinCallContext {
  refs: RealtimeKitCallRefs
  options: any
  apiClient: any
  initMeeting: (config: any) => Promise<any>
  callPreferences: any
  media: any
  wsClient: any
  startDurationTimer: () => void
  setCallState: Dispatch<SetStateAction<any>>
  setActiveConversationCalls: Dispatch<SetStateAction<Map<string, ActiveConversationCall>>>
  getActiveConversationCalls: () => Map<string, ActiveConversationCall>
  currentUser: any
  joinMeetingWithTimeout: (meeting: any, timeoutMs: number, context?: any) => Promise<void>
  setActiveCallInStorage: (userId: string, roomId: string) => void
  rtkDebug: { log: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
}

export interface LeaveCallContext {
  refs: RealtimeKitCallRefs
  stableMeeting: any
  globalCallManager: any
  stopDurationTimer: () => void
  setCallState: Dispatch<SetStateAction<any>>
  setIncomingInvite: Dispatch<SetStateAction<GroupCallInvite | null>>
  setActiveConversationCalls: Dispatch<SetStateAction<Map<string, ActiveConversationCall>>>
  clearActiveCallFromStorage: () => void
  callPreferences: any
  clearInviteDedupeFor: (meetingId?: string | null, conversationId?: string | null) => void
  media: { stopAllTracks: () => void; rnnoiseStats?: any }
  rtkDebug: { log: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void }
  accessToken?: string | null
}
