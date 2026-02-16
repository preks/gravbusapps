/**
 * Keeps globalCallManager in sync with the current call: update callbacks when there is an
 * active call, and set full call data when connected. Uses refs so callbacks never capture stale state.
 */

import { useEffect, type MutableRefObject } from 'react'
import { globalCallManager } from '../../services/globalCallManager'
import type { RealtimeKitCallRefs } from './contextTypes'

/**
 * Effect-only hook. Syncs globalCallManager with the current RTK call.
 *
 * Needs: callState, meeting, refs, leaveCallRef, toggleMinimizeRef, participantsHookRef,
 * websocketRef, media, screenShare, participantsHook, websocket, activeSpeaker, callPreferences,
 * options (conversations, accessToken, etc.), currentUser, chatApiClient, wsClient, activeConversation,
 * callConversation, rtkDebug.
 *
 * Does: (1) When callState.status !== 'idle', calls globalCallManager.updateCallbacks with
 * ref-based callbacks. (2) When connected and meeting.self.roomState === 'joined', calls
 * globalCallManager.setCall with full call data and callbacks.
 *
 * Returns: void (effect-only).
 */
export function useRealtimeKitGlobalCallManager(params: {
  callState: any
  meeting: any
  refs: RealtimeKitCallRefs
  leaveCallRef: MutableRefObject<(() => Promise<void>) | null>
  toggleMinimizeRef: MutableRefObject<(() => void) | null>
  participantsHookRef: MutableRefObject<any>
  websocketRef: MutableRefObject<any>
  media: any
  screenShare: any
  participantsHook: any
  websocket: any
  activeSpeaker: any
  callPreferences: any
  options: any
  currentUser: any
  chatApiClient: any
  wsClient: any
  activeConversation: any
  callConversation: any
  rtkDebug: { log: (...args: any[]) => void }
}): void {
  const {
    callState,
    meeting,
    refs,
    leaveCallRef,
    toggleMinimizeRef,
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
    callConversation,
    rtkDebug
  } = params

  useEffect(() => {
    const currentCallData = globalCallManager.getCallData()
    if (currentCallData.callState.status === 'idle') {
      return
    }
    globalCallManager.updateCallbacks({
      leaveCall: async () => {
        if (leaveCallRef.current) await leaveCallRef.current()
      },
      toggleMute: () => refs.mediaRef.current?.toggleMute(),
      toggleVideo: () => refs.mediaRef.current?.toggleVideo(),
      toggleScreenShare: () => refs.screenShareRef.current?.toggleScreenShare(),
      toggleMinimize: () => toggleMinimizeRef.current?.(),
      toggleBackground: () => refs.mediaRef.current?.toggleBackground(),
      toggleRnnoise: async () => await refs.mediaRef.current?.toggleRnnoise(),
      setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => {
        refs.mediaRef.current?.setRnnoiseMode(mode)
      },
      setNoiseSuppressionEnabled: async (enabled: boolean) => {
        callPreferences.setNoiseSuppressionEnabled(enabled)
        await refs.mediaRef.current?.setNoiseSuppressionEnabled(enabled)
      },
      setAutoGainControlEnabled: async (enabled: boolean) => {
        callPreferences.setAutoGainControlEnabled(enabled)
        await refs.mediaRef.current?.setAutoGainControlEnabled(enabled)
      }
    })
    rtkDebug.log('[RTK] ✅ Updated callbacks in globalCallManager after remount')
  }, [callState.status, leaveCallRef, toggleMinimizeRef, refs, callPreferences, rtkDebug])

  useEffect(() => {
    if (callState.status !== 'connected' || !meeting || meeting.self?.roomState !== 'joined') {
      return
    }

    rtkDebug.log('[RTK] Storing call data in globalCallManager for persistent UI')

    const remoteStreamsMap = new Map<string, MediaStream>()
    participantsHook.remoteStreams.forEach((stream: MediaStream, peerId: string) => {
      remoteStreamsMap.set(peerId, stream)
    })

    const globalState = globalCallManager.getCallData().callState
    const isSameCall =
      globalState.callImplementation === 'realtime-kit' &&
      globalState.status !== 'idle' &&
      globalState.roomId === callState.roomId

    globalCallManager.setCall({
      realtimeKitMeeting: meeting,
      callState: {
        isMinimized: isSameCall ? globalState.isMinimized : callState.isMinimized,
        hasBeenMinimized: isSameCall ? globalState.hasBeenMinimized : callState.hasBeenMinimized,
        status: 'connected',
        roomId: callState.roomId,
        meetingId: callState.meetingId ?? null,
        sessionId: callState.sessionId ?? null,
        callType: callState.callType,
        conversationType: callState.conversationType,
        callImplementation: 'realtime-kit',
        hostId: callState.hostId,
        isMuted: media.isMuted,
        isVideoEnabled: media.isVideoEnabled,
        isScreenSharing: screenShare.isScreenSharing,
        duration: callState.duration,
        videoQuality: media.videoQuality,
        backgroundEnabled: media.backgroundEnabled,
        rnnoiseEnabled: media.rnnoiseEnabled,
        startTime: callState.startTime,
        participants: participantsHook.participants,
        handRaised: websocket.handRaised,
        remoteHandsRaised: websocket.remoteHandsRaised || {},
        handRaisedOrder: websocket.handRaisedOrder || {}
      },
      localStream: media.localStream,
      remoteStreams: remoteStreamsMap,
      participants: participantsHook.participants,
      currentUser,
      activeSpeakerId: activeSpeaker.activeSpeakerId,
      activeSpeakerHistory: activeSpeaker.activeSpeakerHistory,
      leaveCall: async () => {
        if (leaveCallRef.current) await leaveCallRef.current()
      },
      toggleMute: () => refs.mediaRef.current?.toggleMute(),
      toggleVideo: () => refs.mediaRef.current?.toggleVideo(),
      toggleScreenShare: () => refs.screenShareRef.current?.toggleScreenShare(),
      toggleMinimize: () => toggleMinimizeRef.current?.(),
      toggleBackground: () => refs.mediaRef.current?.toggleBackground(),
      toggleRnnoise: async () => await refs.mediaRef.current?.toggleRnnoise(),
      setRnnoiseMode: (mode: 'gentle' | 'moderate' | 'aggressive') => {
        refs.mediaRef.current?.setRnnoiseMode(mode)
      },
      toggleRaiseHand: () => {
        const currentHandRaised = websocketRef.current?.handRaised ?? false
        rtkDebug.log('[RTK GlobalCallManager] toggleRaiseHand callback invoked:', {
          currentHandRaised,
          hasWebsocketRef: !!websocketRef.current,
          websocketHandRaised: websocketRef.current?.handRaised
        })
        websocketRef.current?.toggleRaiseHand(currentHandRaised)
      },
      sendReaction: (reaction: string) => {
        websocketRef.current?.sendReaction(reaction)
      },
      setVideoQuality: (quality: any) => refs.mediaRef.current?.setVideoQuality(quality),
      switchAudioDevice: async (deviceId: string) => {
        await refs.mediaRef.current?.switchAudioDevice(deviceId)
      },
      switchVideoDevice: async (deviceId: string) => {
        await refs.mediaRef.current?.switchVideoDevice(deviceId)
      },
      setNoiseSuppressionEnabled: async (enabled: boolean) => {
        callPreferences.setNoiseSuppressionEnabled(enabled)
        await refs.mediaRef.current?.setNoiseSuppressionEnabled(enabled)
      },
      setAutoGainControlEnabled: async (enabled: boolean) => {
        callPreferences.setAutoGainControlEnabled(enabled)
        await refs.mediaRef.current?.setAutoGainControlEnabled(enabled)
      },
      onInviteParticipant: (participant: any) => {
        participantsHookRef.current?.inviteToCall([participant])
      },
      apiClient: chatApiClient || null,
      wsClient,
      accessToken: options.accessToken || null,
      currentUserId: currentUser?.id || null,
      conversationName: callState.conversationName || null,
      rnnoiseEnabled: media.rnnoiseEnabled,
      rnnoiseMode: media.rnnoiseMode,
      activeConversation: activeConversation || null,
      callConversation: (() => {
        const roomId = callState.roomId
        if (!roomId || !options.conversations) return callConversation || activeConversation || null
        const foundConversation = options.conversations.find((c: any) => c.id === roomId)
        rtkDebug.log('[RTK Hook] 🔍 Computing callConversation for globalCallManager:', {
          roomId,
          foundConversationId: foundConversation?.id,
          foundConversationName: foundConversation?.name,
          participantCount: foundConversation?.participants?.length,
          fallbackToActive: !foundConversation && !!activeConversation
        })
        return foundConversation || activeConversation || null
      })(),
      pendingInvites: participantsHook.pendingInvites,
      availableParticipants: [],
      activeExperts: []
    })
  }, [
    callState.status,
    callState.roomId,
    callState.callType,
    callState.hostId,
    callState.duration,
    callState.startTime,
    callState.conversationName,
    callState.isMinimized,
    callState.hasBeenMinimized,
    meeting,
    media,
    screenShare.isScreenSharing,
    participantsHook,
    websocket.handRaised,
    websocket.remoteHandsRaised,
    websocket.handRaisedOrder,
    activeSpeaker.activeSpeakerId,
    activeSpeaker.activeSpeakerHistory,
    currentUser,
    options.accessToken,
    options.conversations,
    activeConversation,
    leaveCallRef,
    toggleMinimizeRef,
    participantsHookRef,
    websocketRef,
    refs,
    callPreferences,
    chatApiClient,
    wsClient,
    callConversation,
    rtkDebug
  ])
}
