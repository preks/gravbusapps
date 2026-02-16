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
    rtkDebug,
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
    const wasIdleBeforeStart = refs.callStatusRef.current === 'setup'

    rtkDebug.log('[RTK] Checking setup state before starting call:', {
      callStateStatus: refs.callStatusRef.current,
      wasIdleBeforeStart
    })

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
      } catch (error) {
        rtkDebug.warn('[RTK] Error fetching meeting metadata for transcription:', error)
      }
    } else {
      rtkDebug.log('[RTK] ⚠️ Skipping transcription check:', {
        reason: !calendarMeetingId ? 'No calendarMeetingId' : 'No calendarApiClient',
        calendarMeetingId,
        hasCalendarApiClient: !!options.calendarApiClient
      })
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
      rtkDebug.log('[RTK] ❌ Call cancelled after backend meeting creation - aborting and cleaning up')
      return
    }

    const sessionId = sessionResponse.data.sessionId
    const meetingId = sessionResponse.data.meetingId
    const authToken = sessionResponse.data.hostAuthToken
    const generatedMeetingName = sessionResponse.data.meetingName

    rtkDebug.log('[RTK] ✅ Backend meeting created:', {
      conversationId,
      sessionId,
      meetingId,
      hasAuthToken: !!authToken,
      authTokenLength: authToken?.length,
      callType,
      conversationName,
      generatedMeetingName
    })

    if (calendarMeetingId && options.calendarApiClient) {
      try {
        rtkDebug.log('[RTK] 🔗 Linking Cloudflare meeting to calendar meeting...', {
          cloudFlareMeetingId: meetingId,
          calendarMeetingId
        })
        await options.calendarApiClient.linkWebrtcSession(calendarMeetingId, meetingId)
        rtkDebug.log('[RTK] ✅ Successfully linked meeting for transcript polling')
      } catch (error) {
        rtkDebug.error('[RTK] ❌ Failed to link meeting:', error)
      }
    }

    const shouldEnableAudio = preferences.micEnabled
    const shouldEnableVideo = preferences.cameraEnabled
    const shouldEnableBackground = preferences.backgroundEnabled

    callPreferences.setBackgroundEnabled(preferences.backgroundEnabled)

    rtkDebug.log('[RTK] Initializing meeting with preferences:', {
      hasAuthToken: !!authToken,
      authTokenLength: authToken?.length,
      callType,
      audio: shouldEnableAudio,
      video: shouldEnableVideo,
      background: shouldEnableBackground
    })

    if (refs.abortControllerRef.current?.signal.aborted) {
      rtkDebug.log('[RTK] ❌ Call cancelled before SDK initialization - aborting WITHOUT triggering camera/mic')
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

    rtkDebug.log('[RTK] initMeeting result:', {
      hasInitializedMeeting: !!initializedMeeting,
      meetingType: typeof initializedMeeting,
      meetingKeys: initializedMeeting ? Object.keys(initializedMeeting) : []
    })

    if (!initializedMeeting) {
      rtkDebug.error('[RTK] ❌ initMeeting returned null/undefined')
      throw new Error('Failed to initialize meeting')
    }

    if (refs.abortControllerRef.current?.signal.aborted) {
      rtkDebug.log('[RTK] ❌ Call cancelled after SDK initialization - cleaning up media')
      try {
        await initializedMeeting.leave()
        media.stopAllTracks()
        rtkDebug.log('[RTK] ✅ Cleaned up SDK meeting and media after cancellation')
      } catch (err) {
        rtkDebug.error('[RTK] ⚠️ Error cleaning up after cancellation:', err)
      }
      return
    }

    if (preferences.audioInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        rtkDebug.log('[RTK] Setting audio device before join:', preferences.audioInputDeviceId)
        await (initializedMeeting.self as any).setDevice({
          kind: 'audioinput',
          deviceId: preferences.audioInputDeviceId
        })
        rtkDebug.log('[RTK] ✅ Audio device set successfully')
      } catch (err) {
        rtkDebug.warn('[RTK] ⚠️ Failed to set audio device:', err)
      }
    }

    if (preferences.videoInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        rtkDebug.log('[RTK] Setting video device before join:', preferences.videoInputDeviceId)
        await (initializedMeeting.self as any).setDevice({
          kind: 'videoinput',
          deviceId: preferences.videoInputDeviceId
        })
        rtkDebug.log('[RTK] ✅ Video device set successfully')
      } catch (err) {
        rtkDebug.warn('[RTK] ⚠️ Failed to set video device:', err)
      }
    }

    if (initializedMeeting?.self?.setVideoMiddlewareGlobalConfig) {
      try {
        await initializedMeeting.self.setVideoMiddlewareGlobalConfig({
          disablePerFrameCanvasRendering: true
        })
        rtkDebug.log('[RTK] ✅ Video middleware configured globally')
      } catch (err) {
        rtkDebug.warn('[RTK] ⚠️ Failed to configure video middleware:', err)
      }
    }

    rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId })
    await joinMeetingWithTimeout(initializedMeeting, 15000, { phase: 'startCall', meetingId })

    rtkDebug.log('[RTK] Waiting for Session connection...')
    const sessionTimeout = 10000
    const startTime = Date.now()
    while (!initializedMeeting?.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
      rtkDebug.log('[RTK] Waiting for roomJoined... (elapsed:', Date.now() - startTime, 'ms)')
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!initializedMeeting?.self?.roomJoined) {
      rtkDebug.error('[RTK] ❌ Timeout waiting for roomJoined after', sessionTimeout, 'ms')
      throw new Error('Failed to join meeting: timeout')
    }

    rtkDebug.log('[RTK] ✅ Session connected (roomJoined: true)', {
      elapsed: Date.now() - startTime,
      roomState: initializedMeeting.self?.roomState
    })

    if (calendarMeetingId) {
      const resolveWithRetry = async (retries = 3, delayMs = 2000, initialDelayMs = 3000) => {
        if (!options.calendarApiClient) {
          rtkDebug.warn('[RTK] ⚠️ Cannot resolve Session ID - calendarApiClient not available')
          return false
        }
        rtkDebug.log(`[RTK] ⏳ Waiting ${initialDelayMs}ms for WebSocket to store Session ID (primary method)...`)
        await new Promise(resolve => setTimeout(resolve, initialDelayMs))
        try {
          const checkResponse = await options.calendarApiClient.getMeeting(calendarMeetingId)
          const callSession = checkResponse.meeting?.callSessions?.[0]
          if (callSession?.cloudflareSessionId) {
            rtkDebug.log('[RTK] ✅ Session ID already stored by WebSocket:', callSession.cloudflareSessionId)
            return true
          }
          rtkDebug.log('[RTK] ℹ️ WebSocket did not store Session ID, trying HTTP API (backup method)...')
        } catch (error) {
          rtkDebug.error('[RTK] Failed to check if Session ID exists:', error)
        }
        for (let i = 0; i < retries; i++) {
          try {
            rtkDebug.log(`[RTK] 🔗 [BACKUP] Resolving via HTTP API (attempt ${i + 1}/${retries})...`, {
              cloudFlareMeetingId: meetingId,
              calendarMeetingId
            })
            const { sessionId: resolvedSessionId } =
              await options.calendarApiClient.resolveAndLinkSession(calendarMeetingId)
            if (resolvedSessionId) {
              refs.sessionIdRef.current = resolvedSessionId
              setCallState((prev: any) => ({ ...prev, sessionId: resolvedSessionId }))
              rtkDebug.log('[RTK] ✅ [BACKUP] Successfully resolved and stored Session ID via HTTP:', resolvedSessionId)
              return true
            }
            rtkDebug.log(`[RTK] ⚠️ No active session found yet, retrying in ${delayMs}ms...`)
            if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs))
          } catch (error) {
            rtkDebug.error(`[RTK] ❌ Failed to resolve Session ID (attempt ${i + 1}):`, error)
            if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs))
          }
        }
        rtkDebug.log(
          '[RTK] ⚠️ Could not resolve Session ID after retries (polling service will handle it as last resort)'
        )
        return false
      }
      resolveWithRetry()
    }

    rtkDebug.log('[RTK] 🔍 DEBUG: initializedMeeting properties:', {
      allKeys: Object.keys(initializedMeeting),
      selfKeys: initializedMeeting.self ? Object.keys(initializedMeeting.self) : []
    })

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

    const wasCancelledBeforeInvites = refs.isCancelledRef.current
    if (wasCancelledBeforeInvites) {
      rtkDebug.log('[RTK] ❌ Call was cancelled during setup - will skip invites and clean up')
    }

    if (participants.length > 0) {
      participantsHook.addPendingInvites(participants)
      rtkDebug.log('[RTK] 📨 Added participants to pending invites for UI:', {
        participantsCount: participants.length,
        participants: participants.map((p: CallParticipant) => ({ id: p.id, name: p.odName }))
      })
    }

    rtkDebug.log('[RTK] 📨 Participants will be invited via rtk-group-call:start event:', {
      participantsCount: participants.length,
      conversationId,
      meetingId,
      callType,
      participants: participants.map((p: CallParticipant) => ({ id: p.id, name: p.odName }))
    })

    if (refs.isCancelledRef.current) {
      rtkDebug.log('[RTK] ❌ Call was cancelled after SDK join - cleaning up and aborting')
      if (initializedMeeting) {
        try {
          await initializedMeeting.leave()
          rtkDebug.log('[RTK] ✅ Left meeting after cancellation')
        } catch (err) {
          rtkDebug.error('[RTK] ⚠️ Error leaving meeting after cancellation:', err)
        }
      }
      try {
        media.stopAllTracks()
        rtkDebug.log('[RTK] ✅ Stopped media tracks after cancellation')
      } catch (err) {
        rtkDebug.error('[RTK] ⚠️ Error stopping media after cancellation:', err)
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
      rtkDebug.log('[RTK] 📤 About to emit rtk-group-call:start:', {
        conversationId,
        sessionId,
        calendarMeetingId,
        hasCalendarMeetingId: !!calendarMeetingId,
        refValue: refs.calendarMeetingIdRef.current
      })
      const startKey = `${conversationId}:${meetingId}:${sessionId}:${participants
        .map((p: CallParticipant) => p.id)
        .sort()
        .join(',')}`
      const last = refs.lastStartEmitRef.current
      if (last && last.key === startKey && Date.now() - last.ts < 3000) {
        rtkDebug.warn('[RTK] ⚠️ Skipping duplicate rtk-group-call:start emit', { startKey })
      } else {
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
        rtkDebug.log('[RTK] Emitted rtk-group-call:start event')
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
      rtkDebug.log('[RTK] Emitted rtk-group-call:joined event with sessionId and isMeeting:', !!calendarMeetingId)
    }

    onCallStarted?.(conversationId, participants)
  } catch (error) {
    rtkDebug.error('[RTK] Failed to start call:', error)
    try {
      media.stopAllTracks()
      rtkDebug.log('[RTK] ✅ Media tracks stopped after start call error')
    } catch (cleanupErr) {
      rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during error cleanup:', cleanupErr)
    }
    setCallState((prev: any) => ({ ...prev, status: 'idle' }))
  }
}
