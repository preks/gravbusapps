/**
 * Call state, refs, restore logic, and ref-sync for useRealtimeKitGroupCall.
 */

import { useState, useRef, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from 'react'
import type { CallParticipant, CallType } from '../../services/webrtcClient'
import type { GroupCallUIState, GroupCallInvite, ActiveConversationCall } from '../../services/callTypes'
import { globalCallManager } from '../../services/globalCallManager'
import type { RealtimeKitCallRefs } from './contextTypes'

export interface CallState extends GroupCallUIState {
  status: 'idle' | 'setup' | 'joining' | 'connected' | 'reconnecting' | 'ended'
  roomId: string | null
  meetingId: string | null
  sessionId: string | null
  callType: CallType
  callStartTime: number | null
  conversationName?: string
  transcriptionEnabled: boolean
  calendarMeetingId?: string | null
}

const initialCallState: CallState = {
  isMinimized: false,
  hasBeenMinimized: false,
  status: 'idle',
  roomId: null,
  meetingId: null,
  sessionId: null,
  callType: 'audio',
  callStartTime: null,
  transcriptionEnabled: false,
  calendarMeetingId: null,
  participants: [],
  hostId: null,
  isMuted: false,
  isVideoEnabled: false,
  isScreenSharing: false,
  videoQuality: 'low',
  backgroundEnabled: false,
  handRaised: false,
  remoteHandsRaised: {},
  handRaisedOrder: {},
  startTime: null,
  duration: 0,
  callImplementation: 'realtime-kit'
}

export interface UseRealtimeKitCallStateReturn {
  callState: CallState
  setCallState: Dispatch<SetStateAction<CallState>>
  incomingInvite: GroupCallInvite | null
  setIncomingInvite: Dispatch<SetStateAction<GroupCallInvite | null>>
  activeConversationCalls: Map<string, ActiveConversationCall>
  setActiveConversationCalls: Dispatch<SetStateAction<Map<string, ActiveConversationCall>>>
  refs: RealtimeKitCallRefs
  restoredStateRef: MutableRefObject<{
    handRaised: boolean
    remoteHandsRaised: Record<string, boolean>
    handRaisedOrder: Record<string, { order: number; timestamp: number }>
    isMuted: boolean
    isVideoEnabled: boolean
    rnnoiseEnabled: boolean
  } | null>
  clearInviteDedupeFor: (meetingId?: string | null, conversationId?: string | null) => void
}

export function useRealtimeKitCallState(): UseRealtimeKitCallStateReturn {
  const [callState, setCallState] = useState<CallState>(initialCallState)
  const [incomingInvite, setIncomingInvite] = useState<GroupCallInvite | null>(null)
  const [activeConversationCalls, setActiveConversationCalls] = useState<Map<string, ActiveConversationCall>>(new Map())

  const restoredStateRef = useRef<{
    handRaised: boolean
    remoteHandsRaised: Record<string, boolean>
    handRaisedOrder: Record<string, { order: number; timestamp: number }>
    isMuted: boolean
    isVideoEnabled: boolean
    rnnoiseEnabled: boolean
  } | null>(null)

  const meetingIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const callStateRoomIdRef = useRef<string | null>(null)
  const hostIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isInCallRef = useRef<boolean>(false)
  const conversationIdRef = useRef<string | null>(null)
  const joinCallConversationIdRef = useRef<string | null>(null)
  const wasIdleRef = useRef<boolean>(true)
  const isLeavingRef = useRef<boolean>(false)
  const isCancelledRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const calendarMeetingIdRef = useRef<string | null>(null)
  const pendingCallParticipantsRef = useRef<CallParticipant[]>([])
  const recentlySeenInviteKeysRef = useRef<Map<string, number>>(new Map())
  const lastStartEmitRef = useRef<{ key: string; ts: number } | null>(null)
  const incomingInviteRef = useRef<GroupCallInvite | null>(null)
  const callStatusRef = useRef<CallState['status']>('idle')
  const callTypeRef = useRef<CallType>('audio')
  const conversationNameRef = useRef<string | undefined>(undefined)
  const conversationTypeRef = useRef<CallState['conversationType']>(undefined)
  const isMinimizedRef = useRef<boolean>(false)
  const callStartTimeRef = useRef<number | null>(null)
  const mediaRef = useRef<{ stopAllTracks: () => void; rnnoiseStats?: any } | null>(null)
  const screenShareRef = useRef<{ stopScreenShare: () => Promise<void> } | null>(null)
  const isScreenSharingRef = useRef<boolean>(false)
  const wsClientRef = useRef<any>(null)
  const currentUserRef = useRef<any>(null)
  const onCallEndedRef = useRef<((roomId: string, duration: number) => void) | undefined>(undefined)

  if (restoredStateRef.current === null) {
    const globalCallData = globalCallManager.getCallData()
    if (globalCallData.callState.status !== 'idle' && globalCallData.callState.callImplementation === 'realtime-kit') {
      restoredStateRef.current = {
        handRaised: globalCallData.callState.handRaised,
        remoteHandsRaised: globalCallData.callState.remoteHandsRaised || {},
        handRaisedOrder: globalCallData.callState.handRaisedOrder || {},
        isMuted: globalCallData.callState.isMuted,
        isVideoEnabled: globalCallData.callState.isVideoEnabled,
        rnnoiseEnabled: globalCallData.callState.rnnoiseEnabled
      }
    }
  }

  useEffect(() => {
    const globalCallData = globalCallManager.getCallData()
    if (globalCallData.callState.status !== 'idle' && globalCallData.callState.callImplementation === 'realtime-kit') {
      setCallState(prev => ({
        ...prev,
        status: globalCallData.callState.status as CallState['status'],
        isMinimized: globalCallData.callState.isMinimized,
        hasBeenMinimized: globalCallData.callState.hasBeenMinimized,
        roomId: globalCallData.callState.roomId,
        meetingId: globalCallData.callState.meetingId ?? prev.meetingId ?? null,
        sessionId: globalCallData.callState.sessionId ?? prev.sessionId ?? null,
        callType: globalCallData.callState.callType || 'audio',
        callStartTime: globalCallData.callState.startTime,
        hostId: globalCallData.callState.hostId || null,
        isMuted: globalCallData.callState.isMuted,
        isVideoEnabled: globalCallData.callState.isVideoEnabled,
        isScreenSharing: globalCallData.callState.isScreenSharing,
        videoQuality: globalCallData.callState.videoQuality,
        backgroundEnabled: globalCallData.callState.backgroundEnabled,
        duration: globalCallData.callState.duration,
        handRaised: globalCallData.callState.handRaised,
        remoteHandsRaised: globalCallData.callState.remoteHandsRaised || {},
        handRaisedOrder: globalCallData.callState.handRaisedOrder || {}
      }))
    }
  }, [])

  const clearInviteDedupeFor = (meetingId?: string | null, conversationId?: string | null) => {
    if (!meetingId || !conversationId) return
    const inviteKey = `${meetingId}:${conversationId}`
    recentlySeenInviteKeysRef.current.delete(inviteKey)
    const globalSeen = (globalThis as any).__RTK_SEEN_INVITES__ as Record<string, number> | undefined
    if (globalSeen?.[inviteKey]) {
      delete globalSeen[inviteKey]
      ;(globalThis as any).__RTK_SEEN_INVITES__ = globalSeen
    }
  }

  const isInCall = callState.status !== 'idle' && callState.status !== 'ended'

  callStatusRef.current = callState.status
  callTypeRef.current = callState.callType
  conversationNameRef.current = callState.conversationName
  conversationTypeRef.current = callState.conversationType
  isMinimizedRef.current = callState.isMinimized
  incomingInviteRef.current = incomingInvite
  meetingIdRef.current = callState.meetingId
  callStateRoomIdRef.current = callState.roomId
  hostIdRef.current = callState.hostId
  isInCallRef.current = isInCall
  callStartTimeRef.current = callState.callStartTime

  if (callState.status !== 'idle' && callState.status !== 'ended') {
    wasIdleRef.current = false
  } else if (callState.status === 'idle') {
    wasIdleRef.current = true
  }

  const refs: RealtimeKitCallRefs = {
    meetingIdRef,
    sessionIdRef,
    callStateRoomIdRef,
    hostIdRef,
    startTimeRef,
    durationTimerRef,
    isInCallRef,
    conversationIdRef,
    joinCallConversationIdRef,
    wasIdleRef,
    isLeavingRef,
    isCancelledRef,
    abortControllerRef,
    calendarMeetingIdRef,
    pendingCallParticipantsRef,
    recentlySeenInviteKeysRef,
    lastStartEmitRef,
    incomingInviteRef,
    callStatusRef,
    callTypeRef,
    conversationNameRef,
    conversationTypeRef,
    isMinimizedRef,
    callStartTimeRef,
    mediaRef,
    screenShareRef,
    isScreenSharingRef,
    wsClientRef,
    currentUserRef,
    onCallEndedRef
  }

  return {
    callState,
    setCallState,
    incomingInvite,
    setIncomingInvite,
    activeConversationCalls,
    setActiveConversationCalls,
    refs,
    restoredStateRef,
    clearInviteDedupeFor
  }
}
