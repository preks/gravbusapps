/**
 * Builds the public joinCall function that resolves conversationId/meetingId from
 * activeConversationCalls and options.conversations, then calls the internal join.
 */

import type { CallParticipant, CallType } from '../../services/webrtcClient'
import type { ActiveConversationCall } from '../../services/callTypes'

export type InternalJoinCall = (
  roomId: string,
  callType: CallType,
  meetingId?: string,
  conversationName?: string,
  resolvedSessionId?: string,
  initialPreferences?: {
    micEnabled: boolean
    cameraEnabled: boolean
    backgroundEnabled?: boolean
    audioInputDeviceId?: string | null
    videoInputDeviceId?: string | null
  },
  conversationType?: 'direct' | 'group' | 'meeting'
) => Promise<void>

export type PublicJoinCall = (
  roomId: string,
  callType: CallType,
  initialParticipantsOrPreferences?:
    | CallParticipant[]
    | { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled?: boolean }
) => Promise<void>

export interface BuildJoinCallWrapperParams {
  internalJoinCall: InternalJoinCall
  getActiveConversationCalls: () => Map<string, ActiveConversationCall>
  getConversations: () => any[] | null | undefined
  /** Resolve meetingId from backend when rejoining from chat (conversationId only). */
  fetchActiveCallByConversationId?: (
    conversationId: string
  ) => Promise<{ meetingId: string; sessionId?: string } | null>
}

export function buildJoinCallWrapper(params: BuildJoinCallWrapperParams): PublicJoinCall {
  const { internalJoinCall, getActiveConversationCalls, getConversations, fetchActiveCallByConversationId } = params

  return async (
    roomIdOrMeetingId: string,
    callType: CallType,
    initialParticipantsOrPreferences?:
      | CallParticipant[]
      | { micEnabled: boolean; cameraEnabled: boolean; backgroundEnabled?: boolean }
  ): Promise<void> => {
    const isPreferencesObject =
      initialParticipantsOrPreferences &&
      !Array.isArray(initialParticipantsOrPreferences) &&
      'micEnabled' in initialParticipantsOrPreferences

    const preferences = isPreferencesObject
      ? (initialParticipantsOrPreferences as {
          micEnabled: boolean
          cameraEnabled: boolean
          backgroundEnabled?: boolean
        })
      : undefined
    let initialParticipants: CallParticipant[] | undefined
    if (isPreferencesObject) {
      initialParticipants = undefined
    } else if (Array.isArray(initialParticipantsOrPreferences)) {
      initialParticipants = initialParticipantsOrPreferences
    } else {
      initialParticipants = undefined
    }

    if (initialParticipants === undefined) {
      const activeConversationCalls = getActiveConversationCalls()
      const conversations = getConversations() ?? []

      let resolvedConversationId: string = roomIdOrMeetingId
      let resolvedMeetingId: string | undefined = undefined
      let resolvedConversationName: string | undefined = undefined
      let resolvedSessionId: string | undefined = undefined
      let resolvedConversationType: 'direct' | 'group' | 'meeting' | undefined = undefined

      activeConversationCalls.forEach((call, convId) => {
        if (call.roomId === roomIdOrMeetingId) {
          resolvedConversationId = convId
          resolvedMeetingId = roomIdOrMeetingId
          resolvedConversationName = call.conversationName
          resolvedConversationType = call.conversationType
        } else if (convId === roomIdOrMeetingId) {
          resolvedConversationId = convId
          resolvedMeetingId = call.roomId
          resolvedConversationName = call.conversationName
          resolvedConversationType = call.conversationType
        }
      })

      if (!resolvedMeetingId && conversations.length) {
        const byMeetingId = conversations.find((c: any) => c?.activeCall?.roomId === roomIdOrMeetingId)
        if (byMeetingId?.id) {
          resolvedConversationId = byMeetingId.id
          resolvedMeetingId = roomIdOrMeetingId
          resolvedConversationName = byMeetingId.name
          resolvedConversationType = byMeetingId.activeCall?.conversationType
        }
      }

      if (!resolvedMeetingId && conversations.length) {
        const byConversationId = conversations.find((c: any) => c?.id === roomIdOrMeetingId)
        const meetingIdFromConversation = byConversationId?.activeCall?.roomId
        if (byConversationId?.id && meetingIdFromConversation) {
          resolvedConversationId = byConversationId.id
          resolvedMeetingId = meetingIdFromConversation
          resolvedConversationName = byConversationId.name
          resolvedConversationType = byConversationId.activeCall?.conversationType
        }
      }

      if (!resolvedMeetingId && fetchActiveCallByConversationId) {
        const active = await fetchActiveCallByConversationId(roomIdOrMeetingId)
        if (active?.meetingId) {
          resolvedConversationId = roomIdOrMeetingId
          resolvedMeetingId = active.meetingId
          resolvedSessionId = active.sessionId
        }
      }

      if (!resolvedMeetingId) {
        resolvedConversationId = roomIdOrMeetingId
        resolvedMeetingId = undefined
      }

      // When we have conversationId + meetingId but no sessionId (e.g. from local state), fetch sessionId so joined/leave emit it
      if (
        resolvedSessionId === undefined &&
        resolvedConversationId &&
        resolvedMeetingId &&
        fetchActiveCallByConversationId
      ) {
        const active = await fetchActiveCallByConversationId(resolvedConversationId)
        if (active?.sessionId) resolvedSessionId = active.sessionId
      }

      await internalJoinCall(
        resolvedConversationId,
        callType,
        resolvedMeetingId,
        resolvedConversationName,
        resolvedSessionId,
        preferences,
        resolvedConversationType
      )
    } else {
      throw new Error('joinCall with initialParticipants not supported - use startCall')
    }
  }
}
