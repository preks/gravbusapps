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
    setActiveCallInStorage
  } = ctx

  const { roomId, callType, meetingId, conversationName, initialPreferences, conversationType } = params

  if (!currentUser || !apiClient) {
    return
  }

  try {
    const authToken = meetingId
      ? (await apiClient.addParticipant(meetingId, undefined, 'host', currentUser?.odName, undefined, undefined)).data
          .authToken
      : (await apiClient.createMeeting(roomId, callType, currentUser?.odName, undefined, undefined, undefined, false))
          .data.hostAuthToken

    const finalMeetingId = meetingId || roomId

    const shouldEnableAudio = initialPreferences?.micEnabled ?? true
    const shouldEnableVideo = initialPreferences?.cameraEnabled ?? callType === 'video'

    if (initialPreferences?.backgroundEnabled !== undefined) {
      callPreferences.setBackgroundEnabled(initialPreferences.backgroundEnabled)
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
        simulcastConfig: {
          encodings: SIMULCAST_ENCODINGS
        }
      }
    })

    if (!initializedMeeting) {
      throw new Error('Failed to initialize meeting')
    }

    const self = initializedMeeting.self as
      | { setDevice?: (opts: { kind: string; deviceId: string }) => Promise<void> }
      | undefined
    if (initialPreferences?.audioInputDeviceId && typeof self?.setDevice === 'function') {
      try {
        await self.setDevice({
          kind: 'audioinput',
          deviceId: initialPreferences.audioInputDeviceId
        })
      } catch {
        // Best-effort
      }
    }

    if (initialPreferences?.videoInputDeviceId && typeof self?.setDevice === 'function') {
      try {
        await self.setDevice({
          kind: 'videoinput',
          deviceId: initialPreferences.videoInputDeviceId
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

    await joinMeetingWithTimeout(initializedMeeting, 15000, {
      phase: 'joinCall',
      meetingId: finalMeetingId
    })

    const sessionTimeout = 10000
    const startTime = Date.now()

    while (!initializedMeeting?.self?.roomJoined && Date.now() - startTime < sessionTimeout) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    if (!initializedMeeting?.self?.roomJoined) {
      throw new Error('Failed to join meeting: timeout')
    }

    refs.conversationIdRef.current = roomId

    const activeConversationCalls = getActiveConversationCalls()
    const calendarMeetingIdForJoin = refs.calendarMeetingIdRef.current || null

    refs.joinCallConversationIdRef.current = roomId

    let callStartTime: number | null = null
    for (const [conversationId, callInfo] of activeConversationCalls.entries()) {
      if ((conversationId === roomId || callInfo.roomId === roomId) && callInfo.startedAt) {
        callStartTime = new Date(callInfo.startedAt).getTime()
        break
      }
    }

    if (!callStartTime) {
      callStartTime = Date.now()
    }

    if (!refs.startTimeRef.current) {
      refs.startTimeRef.current = callStartTime
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
    }
  } catch (error) {
    console.error('[runJoinCall] Failed to join call:', error)

    try {
      media.stopAllTracks()
    } catch {
      // Best-effort cleanup
    }

    setCallState((prev: any) => ({ ...prev, status: 'idle' }))
  }
}
