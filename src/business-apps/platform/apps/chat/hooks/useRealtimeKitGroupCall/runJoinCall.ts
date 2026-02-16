/**
 * Pure runner for joining an existing RTK group call.
 */

import type { CallType } from '../../services/webrtcClient'
import { DEFAULT_AUDIO_CONSTRAINTS } from '../../config/audioConstraints'
import { SIMULCAST_ENCODINGS } from '../../services/realtimeKitSimulcast'
import type { JoinCallContext } from './contextTypes'

export interface RunJoinCallParams {
  roomId: string
  callType: CallType
  meetingId?: string
  conversationName?: string
  initialPreferences?: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled?: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  }
  conversationType?: 'direct' | 'group' | 'meeting'
}

export async function runJoinCall(ctx: JoinCallContext, params: RunJoinCallParams): Promise<void> {
  const {
    refs,
    apiClient,
    initMeeting,
    callPreferences,
    media,
    wsClient,
    startDurationTimer,
    setCallState,
    getActiveConversationCalls,
    currentUser,
    joinMeetingWithTimeout,
    setActiveCallInStorage,
    rtkDebug
  } = ctx

  const { roomId, callType, meetingId, conversationName, initialPreferences, conversationType } = params

  if (!currentUser || !apiClient) {
    rtkDebug.error('[RTK] Cannot join call: missing currentUser or apiClient')
    return
  }

  try {
    rtkDebug.log('[RTK] 📞 Joining existing call...', {
      roomId,
      callType,
      meetingId: meetingId || 'will-generate',
      conversationName,
      conversationType,
      currentStatus: refs.callStatusRef.current,
      preferences: initialPreferences
    })

    rtkDebug.log('[RTK] Getting auth token...', {
      hasExistingMeetingId: !!meetingId,
      path: meetingId ? 'addParticipant' : 'createMeeting',
      meetingId: meetingId || 'none',
      roomId
    })

    const authToken = meetingId
      ? (await apiClient.addParticipant(meetingId, undefined, 'host', currentUser?.odName, undefined, undefined)).data
          .authToken
      : (await apiClient.createMeeting(roomId, callType, currentUser?.odName, undefined, undefined, undefined, false))
          .data.hostAuthToken

    rtkDebug.log('[RTK] Auth token received:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length
    })

    const finalMeetingId = meetingId || roomId

    rtkDebug.log('[RTK] ✅ Auth token received:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length,
      finalMeetingId,
      roomId,
      callType,
      willEnableVideo: callType === 'video'
    })

    const shouldEnableAudio = initialPreferences?.micEnabled ?? true
    const shouldEnableVideo = initialPreferences?.cameraEnabled ?? callType === 'video'
    const shouldEnableBackground = initialPreferences?.backgroundEnabled ?? callPreferences.backgroundEnabled

    if (initialPreferences?.backgroundEnabled !== undefined) {
      callPreferences.setBackgroundEnabled(initialPreferences.backgroundEnabled)
    }

    rtkDebug.log('[RTK] Initializing meeting with preferences:', {
      audio: shouldEnableAudio,
      video: shouldEnableVideo,
      background: shouldEnableBackground,
      fromPreferences: !!initialPreferences,
      callType
    })

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
        simulcastConfig: {
          encodings: SIMULCAST_ENCODINGS
        }
      }
    })

    rtkDebug.log('[RTK] initMeeting result:', {
      hasInitializedMeeting: !!initializedMeeting,
      meetingType: typeof initializedMeeting
    })

    if (!initializedMeeting) {
      rtkDebug.error('[RTK] ❌ initMeeting returned null/undefined', {
        authToken: authToken ? 'present' : 'missing',
        finalMeetingId
      })
      throw new Error('Failed to initialize meeting')
    }

    if (initialPreferences?.audioInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        rtkDebug.log('[RTK] Setting audio device before join:', initialPreferences.audioInputDeviceId)
        await (initializedMeeting.self as any).setDevice({
          kind: 'audioinput',
          deviceId: initialPreferences.audioInputDeviceId
        })
        rtkDebug.log('[RTK] ✅ Audio device set successfully')
      } catch (err) {
        rtkDebug.warn('[RTK] ⚠️ Failed to set audio device:', err)
      }
    }

    if (initialPreferences?.videoInputDeviceId && typeof (initializedMeeting.self as any).setDevice === 'function') {
      try {
        rtkDebug.log('[RTK] Setting video device before join:', initialPreferences.videoInputDeviceId)
        await (initializedMeeting.self as any).setDevice({
          kind: 'videoinput',
          deviceId: initialPreferences.videoInputDeviceId
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

    rtkDebug.log('[RTK] Joining meeting via SDK...', { meetingId: finalMeetingId })

    await joinMeetingWithTimeout(initializedMeeting, 15000, {
      phase: 'joinCall',
      meetingId: finalMeetingId
    })

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

    refs.conversationIdRef.current = roomId

    const activeConversationCalls = getActiveConversationCalls()
    rtkDebug.log('[RTK] 🔍 Checking sources for calendarMeetingId:', {
      roomId,
      refValue: refs.calendarMeetingIdRef.current,
      hasActiveCallEntry: activeConversationCalls.has(roomId),
      activeCallsSize: activeConversationCalls.size,
      activeCallsKeys: Array.from(activeConversationCalls.keys())
    })

    const calendarMeetingIdForJoin = refs.calendarMeetingIdRef.current || null

    rtkDebug.log('[RTK] Joining with calendarMeetingId:', {
      roomId,
      fromRef: refs.calendarMeetingIdRef.current,
      finalCalendarMeetingId: calendarMeetingIdForJoin,
      isCalendarMeeting: !!calendarMeetingIdForJoin
    })

    refs.joinCallConversationIdRef.current = roomId

    let callStartTime: number | null = null
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if ((conversationId === roomId || callInfo.roomId === roomId) && callInfo.startedAt) {
        callStartTime = new Date(callInfo.startedAt).getTime()
        rtkDebug.log('[RTK] ⏱️ Found existing call start time in activeConversationCalls:', {
          conversationId,
          roomId,
          backendRoomId: callInfo.roomId,
          startedAt: callInfo.startedAt,
          callStartTime
        })
        break
      }
    }

    if (!callStartTime) {
      callStartTime = Date.now()
      rtkDebug.log('[RTK] ⏱️ No existing call found, using current time as start time')
    }

    if (!refs.startTimeRef.current) {
      refs.startTimeRef.current = callStartTime
      rtkDebug.log('[RTK] ⏱️ Set start time:', {
        startTime: callStartTime,
        source: callStartTime === Date.now() ? 'local-new-call' : 'backend-existing-call'
      })
    } else {
      rtkDebug.log('[RTK] ⏱️ Keeping synced global start time:', {
        globalStartTime: refs.startTimeRef.current,
        diff: (Date.now() - refs.startTimeRef.current) / 1000
      })
    }
    startDurationTimer()

    setCallState((prev: any) => ({
      ...prev,
      status: 'joining',
      roomId,
      meetingId: finalMeetingId,
      callType,
      conversationName,
      conversationType,
      callStartTime: refs.startTimeRef.current,
      startTime: refs.startTimeRef.current,
      calendarMeetingId: calendarMeetingIdForJoin
    }))

    callPreferences.saveActiveCall(currentUser.id, roomId)
    setActiveCallInStorage(currentUser.id, roomId)

    if (wsClient?.getSocket()) {
      wsClient.getSocket()?.emit('rtk-group-call:joined', {
        conversationId: roomId,
        meetingId: finalMeetingId,
        sessionId: refs.sessionIdRef.current,
        isMeeting: !!refs.calendarMeetingIdRef.current,
        participant: {
          id: currentUser.id,
          odId: currentUser.odId,
          odName: currentUser.odName,
          avatarUrl: currentUser.avatarUrl,
          isMuted: !shouldEnableAudio,
          isVideoEnabled: shouldEnableVideo
        }
      })
      rtkDebug.log(
        '[RTK] Emitted rtk-group-call:joined event (joining existing call) with sessionId and isMeeting:',
        !!refs.calendarMeetingIdRef.current
      )
    }
  } catch (error) {
    rtkDebug.error('[RTK] Failed to join call:', error)

    try {
      media.stopAllTracks()
      rtkDebug.log('[RTK] ✅ Media tracks stopped after join call error')
    } catch (cleanupErr) {
      rtkDebug.error('[RTK] ⚠️ Failed to stop media tracks during error cleanup:', cleanupErr)
    }

    setCallState((prev: any) => ({ ...prev, status: 'idle' }))
  }
}
