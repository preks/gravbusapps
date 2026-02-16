/**
 * Pure runner for confirming and starting an RTK group call (after setup dialog).
 */

import type { CallParticipant } from '../../services/webrtcClient'
import { DEFAULT_AUDIO_CONSTRAINTS } from '../../config/audioConstraints'
import { SIMULCAST_ENCODINGS } from '../../services/realtimeKitSimulcast'
import type { ConfirmStartCallContext } from './contextTypes'

export interface ConfirmStartCallPreferences {
  micEnabled: boolean
  cameraEnabled: boolean
  backgroundEnabled: boolean
  audioInputDeviceId?: string | null
  videoInputDeviceId?: string | null
}

export async function runConfirmStartCall(
  ctx: ConfirmStartCallContext,
  preferences: ConfirmStartCallPreferences
): Promise<void> {
  const {
    refs,
    options,
    apiClient,
    initMeeting,
    callPreferences,
    media,
    participantsHook,
    wsClient,
    onCallStarted,
    startDurationTimer,
    setCallState,
    joinMeetingWithTimeout,
    currentUser
  } = ctx

  if (!currentUser || !apiClient) return

  const conversationId = refs.callStateRoomIdRef.current
  const calendarMeetingId = refs.calendarMeetingIdRef.current
  const callType = refs.callTypeRef.current
  const conversationName = refs.conversationNameRef.current
  const conversationType = refs.conversationTypeRef.current

  if (!conversationId) return

  const participants = refs.pendingCallParticipantsRef.current ?? []

  try {
    refs.isCancelledRef.current = false
    refs.abortControllerRef.current = new AbortController()

    setCallState((prev: any) => ({ ...prev, status: 'joining' }))
    refs.callStateRoomIdRef.current = conversationId
    refs.conversationIdRef.current = conversationId

    let transcriptionEnabled = false
    if (calendarMeetingId && options.calendarApiClient) {
      try {
        const meetingDetails = await options.calendarApiClient.getMeeting(calendarMeetingId)
        if (refs.abortControllerRef.current?.signal.aborted) return
        if (meetingDetails?.transcriptionEnabled === true) transcriptionEnabled = true
      } catch {
        // Best-effort
      }
    }

    const sessionResponse = await apiClient.createMeeting(
      conversationId,
      callType,
      currentUser?.odName,
      undefined,
      undefined,
      conversationName,
      transcriptionEnabled,
      calendarMeetingId,
      conversationType === 'direct' && participants.length > 0
        ? [
            { id: currentUser.id, odName: currentUser.odName },
            ...participants.map((p: CallParticipant) => ({ id: p.id, odName: p.odName }))
          ]
        : undefined,
      conversationType
    )

    if (refs.abortControllerRef.current?.signal.aborted) {
      return
    }

    const sessionId = sessionResponse.data.sessionId
    const meetingId = sessionResponse.data.meetingId
    const authToken = sessionResponse.data.hostAuthToken
    const generatedMeetingName = sessionResponse.data.meetingName

    if (calendarMeetingId && options.calendarApiClient) {
      try {
        await options.calendarApiClient.linkWebrtcSession(calendarMeetingId, meetingId)
      } catch {
        // Best-effort; transcript polling may still work
      }
    }

    const shouldEnableAudio = preferences.micEnabled
    const shouldEnableVideo = preferences.cameraEnabled

    callPreferences.setBackgroundEnabled(preferences.backgroundEnabled)

    if (refs.abortControllerRef.current?.signal.aborted) {
      return
    }

    const initializedMeeting = await initMeeting({
      authToken,
      defaults: {
        audio: shouldEnableAudio,
        video: shouldEnableVideo,
        mediaConfiguration: {
          audio: {
            echoCancellation: DEFAULT_AUDIO_CONSTRAINTS.echoCancellation,
            noiseSupression: DEFAULT_AUDIO_CONSTRAINTS.noiseSuppression,
            autoGainControl: DEFAULT_AUDIO_CONSTRAINTS.autoGainControl
          }
        }
      } as any,
      overrides: {
        simulcastConfig: { encodings: SIMULCAST_ENCODINGS }
      }
    })

    if (!initializedMeeting) {
      throw new Error('Failed to initialize meeting')
    }

    if (refs.abortControllerRef.current?.signal.aborted) {
      try {
        await initializedMeeting.leave()
        media.stopAllTracks()
      } catch {
        // Best-effort cleanup
      }
      return
    }

    if (preferences.audioInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        await (initializedMeeting.self as any).setDevice({
          kind: 'audioinput',
          deviceId: preferences.audioInputDeviceId
        })
      } catch {
        // Best-effort
      }
    }

    if (preferences.videoInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        await (initializedMeeting.self as any).setDevice({
          kind: 'videoinput',
          deviceId: preferences.videoInputDeviceId
        })
      } catch {
        // Best-effort
      }
    }

    if (initializedMeeting?.self?.setVideoMiddlewareGlobalConfig) {
      try {
        await initializedMeeting.self.setVideoMiddlewareGlobalConfig({
          disablePerFrameCanvasRendering: true
        })
      } catch {
        // Best-effort
      }
    }

    await joinMeetingWithTimeout(initializedMeeting, 15000, { phase: 'startCall', meetingId })

    const sessionTimeout = 10000
    const startTime = Date.now()
    while (!initializedMeeting?.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!initializedMeeting?.self?.roomJoined) {
      throw new Error('Failed to join meeting: timeout')
    }

    if (calendarMeetingId) {
      const resolveWithRetry = async (retries = 3, delayMs = 2000, initialDelayMs = 3000) => {
        if (!options.calendarApiClient) return false
        await new Promise(resolve => setTimeout(resolve, initialDelayMs))
        try {
          const checkResponse = await options.calendarApiClient.getMeeting(calendarMeetingId)
          const callSession = checkResponse.meeting?.callSessions?.[0]
          if (callSession?.cloudflareSessionId) return true
        } catch {
          // Continue to backup method
        }
        for (let i = 0; i < retries; i++) {
          try {
            const { sessionId: resolvedSessionId } =
              await options.calendarApiClient.resolveAndLinkSession(calendarMeetingId)
            if (resolvedSessionId) {
              refs.sessionIdRef.current = resolvedSessionId
              setCallState((prev: any) => ({ ...prev, sessionId: resolvedSessionId }))
              return true
            }
            if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs))
          } catch {
            if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs))
          }
        }
        return false
      }
      resolveWithRetry()
    }

    refs.conversationIdRef.current = conversationId
    refs.calendarMeetingIdRef.current = calendarMeetingId || null
    refs.sessionIdRef.current = sessionId

    startDurationTimer()

    setCallState((prev: any) => ({
      ...prev,
      meetingId,
      sessionId,
      callStartTime: null,
      calendarMeetingId,
      transcriptionEnabled,
      conversationName: generatedMeetingName || prev.conversationName
    }))

    callPreferences.saveActiveCall(currentUser.id, conversationId)

    if (participants.length > 0) {
      participantsHook.addPendingInvites(participants)
    }

    if (refs.isCancelledRef.current) {
      if (initializedMeeting) {
        try {
          await initializedMeeting.leave()
        } catch {
          // Best-effort
        }
      }
      try {
        media.stopAllTracks()
      } catch {
        // Best-effort
      }
      setCallState((prev: any) => ({
        ...prev,
        status: 'idle',
        roomId: null,
        meetingId: null,
        sessionId: null
      }))
      return
    }

    if (wsClient?.getSocket()) {
      const startKey = `${conversationId}:${meetingId}:${sessionId}:${participants
        .map((p: CallParticipant) => p.id)
        .sort()
        .join(',')}`
      const last = refs.lastStartEmitRef.current
      if (!last || last.key !== startKey || Date.now() - last.ts >= 3000) {
        refs.lastStartEmitRef.current = { key: startKey, ts: Date.now() }
        wsClient.getSocket()?.emit('rtk-group-call:start', {
          conversationId,
          meetingId,
          sessionId,
          callType,
          conversationName: generatedMeetingName || conversationName,
          conversationType,
          from: {
            id: currentUser.id,
            odId: currentUser.odId,
            odName: currentUser.odName,
            avatarUrl: currentUser.avatarUrl
          },
          participants: participants.map((p: CallParticipant) => ({
            id: p.id,
            odId: p.odId,
            odName: p.odName,
            avatarUrl: p.avatarUrl
          }))
        })
      }
    }

    if (wsClient?.getSocket()) {
      wsClient.getSocket()?.emit('rtk-group-call:joined', {
        conversationId,
        meetingId,
        sessionId,
        isMeeting: !!calendarMeetingId,
        participant: {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl,
          isMuted: !shouldEnableAudio,
          isVideoEnabled: shouldEnableVideo
        }
      })
    }

    onCallStarted?.(conversationId, participants)
  } catch {
    try {
      media.stopAllTracks()
    } catch {
      // Best-effort cleanup
    }
    setCallState((prev: any) => ({ ...prev, status: 'idle' }))
  }
}
