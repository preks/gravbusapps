/**
 * useRealtimeKitCallActions – owns all call lifecycle and UI actions (timers, join/leave,
 * accept/decline, toggle minimize, stable mute/video/diagnostics wrappers).
 */

import { useCallback, useMemo, useRef } from 'react'
import type { CallParticipant, CallType } from '../../services/webrtcClient'
import type { GroupCallInvite } from '../../services/callTypes'
import { globalCallManager } from '../../services/globalCallManager'
import {
  setActiveCallInStorage,
  clearActiveCallFromStorage,
  setDeclinedInviteInStorage
} from '../../utils/activeCallStorage'
import { runLeaveCall } from './runLeaveCall'
import { runJoinCall } from './runJoinCall'
import { runConfirmStartCall } from './runConfirmStartCall'
import { buildJoinCallWrapper } from './buildJoinCallWrapper'
import type { RealtimeKitCallRefs } from './contextTypes'

export interface UseRealtimeKitCallActionsOptions {
  options: {
    wsClient: any
    apiClient?: any
    currentUser: CallParticipant | null
    accessToken?: string | null
    conversations?: any[] | null
    onCallStarted?: (roomId: string, participants: CallParticipant[]) => void
  }
  callState: any
  setCallState: React.Dispatch<React.SetStateAction<any>>
  incomingInvite: GroupCallInvite | null
  setIncomingInvite: React.Dispatch<React.SetStateAction<GroupCallInvite | null>>
  activeConversationCalls: Map<string, any>
  setActiveConversationCalls: React.Dispatch<React.SetStateAction<Map<string, any>>>
  refs: RealtimeKitCallRefs
  clearInviteDedupeFor: (meetingId?: string | null, conversationId?: string | null) => void
  initMeeting: (config: any) => Promise<any>
  stableMeeting: any
  media: any
  joinMeetingWithTimeout: (meeting: any, timeoutMs: number, context?: any) => Promise<void>
  getResolvedNoiseSuppressionEnabled: () => boolean
  getResolvedAutoGainControlEnabled: () => boolean
  participantsHook: any
  combinedCallState: any
  websocket: any
  diagnostics: any
  callPreferences: any
  setActiveCallInStorage: typeof setActiveCallInStorage
  clearActiveCallFromStorage: typeof clearActiveCallFromStorage
}

/**
 * Owns all call lifecycle and UI actions: timers, initiate/confirm/start/join/accept/decline/leave,
 * cancel setup, toggle minimize, and stable wrappers for mute/video/background/diagnostics.
 *
 * Needs: options, full callState (refs, setters, activeConversationCalls), meeting result
 * (initMeeting, media, joinMeetingWithTimeout, participantsHook, combinedCallState, websocket,
 * diagnostics, getResolved*), callPreferences, setActiveCallInStorage, clearActiveCallFromStorage.
 *
 * Does: Creates leaveCallRef and toggleMinimizeRef; implements startDurationTimer, stopDurationTimer,
 * initiateCall, confirmStartCall, startCall, internalJoinCall, joinCall, acceptInvite, cancelSetup,
 * declineInvite, leaveCall, toggleMinimize, toggleTranscription, and stable wrappers.
 *
 * Returns: All callbacks above plus leaveCallRef and toggleMinimizeRef for use by main and
 * useRealtimeKitGlobalCallManager.
 */
export function useRealtimeKitCallActions(params: UseRealtimeKitCallActionsOptions) {
  const {
    options: groupCallOptions,
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
    setActiveCallInStorage: setActiveCallInStorageParam,
    clearActiveCallFromStorage
  } = params
  const options = groupCallOptions
  const { wsClient, apiClient, currentUser } = options

  const leaveCallRef = useRef<(() => Promise<void>) | null>(null)
  const toggleMinimizeRef = useRef<(() => void) | null>(null)
  const nextMinimizedForGlobalRef = useRef<boolean | null>(null)

  const startDurationTimer = useCallback(() => {
    if (refs.durationTimerRef.current) {
      clearInterval(refs.durationTimerRef.current)
    }
    refs.durationTimerRef.current = setInterval(() => {
      if (!refs.startTimeRef.current) return
      const now = Date.now()
      const elapsed = Math.floor((now - refs.startTimeRef.current) / 1000)
      setCallState((prev: any) => ({
        ...prev,
        duration: elapsed,
        callStartTime: refs.startTimeRef.current,
        startTime: refs.startTimeRef.current
      }))
    }, 1000)
  }, [refs, setCallState])

  const stopDurationTimer = useCallback(() => {
    if (refs.durationTimerRef.current) {
      clearInterval(refs.durationTimerRef.current)
      refs.durationTimerRef.current = null
    }
  }, [refs])

  const initiateCall = useCallback(
    (
      conversationId: string,
      callType: CallType,
      participants: CallParticipant[],
      conversationName?: string,
      calendarMeetingId?: string | null,
      conversationType?: 'direct' | 'group' | 'meeting'
    ) => {
      if (!currentUser || !apiClient) return
      refs.isCancelledRef.current = false
      setCallState((prev: any) => ({
        ...prev,
        status: 'setup' as const,
        roomId: conversationId,
        callType,
        conversationName,
        conversationType,
        hostId: currentUser.id
      }))
      refs.callStateRoomIdRef.current = conversationId
      refs.conversationIdRef.current = conversationId
      refs.calendarMeetingIdRef.current = calendarMeetingId || null
      refs.pendingCallParticipantsRef.current = participants
    },
    [currentUser, apiClient, refs, setCallState]
  )

  const confirmStartCall = useCallback(
    async (preferences: {
      micEnabled: boolean
      cameraEnabled: boolean
      backgroundEnabled: boolean
      audioInputDeviceId?: string | null
      videoInputDeviceId?: string | null
    }) => {
      await runConfirmStartCall(
        {
          refs,
          options,
          apiClient: apiClient!,
          initMeeting,
          callPreferences,
          getResolvedNoiseSuppressionEnabled,
          getResolvedAutoGainControlEnabled,
          media,
          participantsHook,
          wsClient,
          onCallStarted: options.onCallStarted,
          startDurationTimer,
          setCallState,
          joinMeetingWithTimeout,
          currentUser: currentUser!
        },
        preferences
      )
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      callPreferences,
      getResolvedNoiseSuppressionEnabled,
      getResolvedAutoGainControlEnabled,
      participantsHook,
      options,
      startDurationTimer,
      wsClient,
      refs,
      setCallState,
      joinMeetingWithTimeout,
      media
    ]
  )

  const startCall = useCallback(
    async (
      conversationId: string,
      callType: CallType,
      participants: CallParticipant[],
      conversationName?: string,
      calendarMeetingId?: string | null
    ) => {
      initiateCall(conversationId, callType, participants, conversationName, calendarMeetingId)
      await confirmStartCall({
        micEnabled: true,
        cameraEnabled: callType === 'video',
        backgroundEnabled: true
      })
    },
    [initiateCall, confirmStartCall]
  )

  const internalJoinCall = useCallback(
    async (
      roomId: string,
      callType: CallType,
      meetingId?: string,
      conversationName?: string,
      initialPreferences?: {
        micEnabled: boolean
        cameraEnabled: boolean
        backgroundEnabled?: boolean
        audioInputDeviceId?: string | null
        videoInputDeviceId?: string | null
      },
      conversationType?: 'direct' | 'group' | 'meeting'
    ) => {
      await runJoinCall(
        {
          refs,
          options,
          apiClient: apiClient!,
          initMeeting,
          callPreferences,
          media,
          wsClient,
          startDurationTimer,
          setCallState,
          setActiveConversationCalls,
          getActiveConversationCalls: () => activeConversationCalls,
          currentUser: currentUser!,
          joinMeetingWithTimeout,
          setActiveCallInStorage: setActiveCallInStorageParam
        },
        { roomId, callType, meetingId, conversationName, initialPreferences, conversationType }
      )
    },
    [
      currentUser,
      apiClient,
      initMeeting,
      callPreferences,
      wsClient,
      startDurationTimer,
      refs,
      setCallState,
      setActiveConversationCalls,
      activeConversationCalls,
      joinMeetingWithTimeout,
      media,
      options,
      setActiveCallInStorageParam
    ]
  )

  const joinCall = useMemo(
    () =>
      buildJoinCallWrapper({
        internalJoinCall,
        getActiveConversationCalls: () => activeConversationCalls,
        getConversations: () => options.conversations
      }),
    [internalJoinCall, activeConversationCalls, options]
  )

  const acceptInvite = useCallback(
    async (initialPreferences?: {
      micEnabled: boolean
      cameraEnabled: boolean
      backgroundEnabled?: boolean
      audioInputDeviceId?: string | null
      videoInputDeviceId?: string | null
    }) => {
      let latestInvite: GroupCallInvite | null = null
      setIncomingInvite(prev => {
        latestInvite = prev
        return prev
      })
      if (!latestInvite) return
      const invite: GroupCallInvite = latestInvite
      refs.calendarMeetingIdRef.current = null
      setActiveConversationCalls(prev => {
        const newMap = new Map(prev)
        const key = invite.conversationId || invite.roomId
        newMap.set(key, {
          roomId: invite.roomId,
          callType: invite.callType,
          participantIds: [],
          startedBy: invite.from.id,
          conversationName: invite.conversationName
        })
        return newMap
      })
      await internalJoinCall(
        invite.conversationId || invite.roomId,
        invite.callType,
        invite.roomId,
        invite.conversationName,
        initialPreferences,
        invite.conversationType
      )
      setIncomingInvite(null)
    },
    [internalJoinCall, setIncomingInvite, setActiveConversationCalls, refs]
  )

  const cancelSetup = useCallback(() => {
    refs.isCancelledRef.current = true
    setCallState((prev: any) => ({
      ...prev,
      status: 'idle',
      roomId: null,
      callType: 'audio',
      conversationName: undefined
    }))
    refs.callStateRoomIdRef.current = null
    refs.conversationIdRef.current = null
    refs.calendarMeetingIdRef.current = null
    refs.pendingCallParticipantsRef.current = []
    setTimeout(() => {
      refs.isCancelledRef.current = false
    }, 100)
  }, [refs, setCallState])

  const declineInvite = useCallback(() => {
    if (!incomingInvite) return
    const roomId = incomingInvite.roomId
    const conversationId = incomingInvite.conversationId || incomingInvite.roomId
    try {
      media.stopAllTracks()
    } catch {
      // Best-effort
    }
    refs.startTimeRef.current = null
    if (currentUser) {
      setDeclinedInviteInStorage(currentUser.id, roomId, conversationId)
      if (wsClient?.getSocket()) {
        wsClient.getSocket()?.emit('rtk-group-call:declined', {
          conversationId,
          meetingId: roomId,
          participantId: currentUser.id
        })
      }
    }
    setIncomingInvite(null)
  }, [incomingInvite, currentUser, wsClient, media, refs, setIncomingInvite])

  const leaveCall = useCallback(async () => {
    await runLeaveCall({
      refs,
      stableMeeting,
      globalCallManager,
      stopDurationTimer,
      setCallState,
      setIncomingInvite,
      setActiveConversationCalls,
      clearActiveCallFromStorage,
      callPreferences,
      clearInviteDedupeFor,
      media,
      accessToken: options.accessToken ?? undefined
    })
  }, [
    stableMeeting,
    stopDurationTimer,
    refs,
    setCallState,
    setIncomingInvite,
    setActiveConversationCalls,
    callPreferences,
    clearInviteDedupeFor,
    media,
    options,
    clearActiveCallFromStorage
  ])

  leaveCallRef.current = leaveCall

  const toggleMinimize = useCallback(() => {
    setCallState((prev: any) => {
      const nextIsMinimized = !prev.isMinimized
      nextMinimizedForGlobalRef.current = nextIsMinimized
      return { ...prev, isMinimized: nextIsMinimized, hasBeenMinimized: true }
    })
    setTimeout(() => {
      const next = nextMinimizedForGlobalRef.current
      if (typeof next === 'boolean') {
        globalCallManager.updateCallState({ isMinimized: next, hasBeenMinimized: true })
      }
    }, 0)
  }, [setCallState])

  toggleMinimizeRef.current = toggleMinimize

  const toggleTranscription = useCallback(() => {
    setCallState((prev: any) => ({ ...prev, transcriptionEnabled: !prev.transcriptionEnabled }))
  }, [setCallState])

  const stableToggleMute = useCallback(() => media.toggleMute(), [media.toggleMute])
  const stableToggleVideo = useCallback(() => media.toggleVideo(), [media.toggleVideo])
  const stableToggleBackground = useCallback(() => media.toggleBackground(), [media.toggleBackground])
  const stableToggleRaiseHand = useCallback(
    async () => websocket.toggleRaiseHand(combinedCallState.handRaised),
    [websocket.toggleRaiseHand, combinedCallState.handRaised]
  )
  const stableGetConnectionDiagnostics = useCallback(
    () => diagnostics.getConnectionDiagnostics(),
    [diagnostics.getConnectionDiagnostics]
  )

  return {
    startDurationTimer,
    stopDurationTimer,
    initiateCall,
    confirmStartCall,
    startCall,
    internalJoinCall,
    joinCall,
    acceptInvite,
    cancelSetup,
    declineInvite,
    leaveCall,
    toggleMinimize,
    toggleTranscription,
    stableToggleMute,
    stableToggleVideo,
    stableToggleBackground,
    stableToggleRaiseHand,
    stableGetConnectionDiagnostics,
    leaveCallRef,
    toggleMinimizeRef
  }
}
