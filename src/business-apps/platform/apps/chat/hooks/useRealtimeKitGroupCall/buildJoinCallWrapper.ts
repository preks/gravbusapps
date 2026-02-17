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
}

export function buildJoinCallWrapper(params: BuildJoinCallWrapperParams): PublicJoinCall {
  const { internalJoinCall, getActiveConversationCalls, getConversations } = params

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

      activeConversationCalls.forEach((call, convId) => {
        if (call.roomId === roomIdOrMeetingId) {
          resolvedConversationId = convId
          resolvedMeetingId = roomIdOrMeetingId
          resolvedConversationName = call.conversationName
        } else if (convId === roomIdOrMeetingId) {
          resolvedConversationId = convId
          resolvedMeetingId = call.roomId
          resolvedConversationName = call.conversationName
        }
      })

      if (!resolvedMeetingId && conversations.length) {
        const byMeetingId = conversations.find((c: any) => c?.activeCall?.roomId === roomIdOrMeetingId)
        if (byMeetingId?.id) {
          resolvedConversationId = byMeetingId.id
          resolvedMeetingId = roomIdOrMeetingId
          resolvedConversationName = byMeetingId.name
        }
      }

      if (!resolvedMeetingId && conversations.length) {
        const byConversationId = conversations.find((c: any) => c?.id === roomIdOrMeetingId)
        const meetingIdFromConversation = byConversationId?.activeCall?.roomId
        if (byConversationId?.id && meetingIdFromConversation) {
          resolvedConversationId = byConversationId.id
          resolvedMeetingId = meetingIdFromConversation
          resolvedConversationName = byConversationId.name
        }
      }

      if (!resolvedMeetingId) {
        resolvedConversationId = roomIdOrMeetingId
        resolvedMeetingId = undefined
      }

      await internalJoinCall(resolvedConversationId, callType, resolvedMeetingId, resolvedConversationName, preferences)
    } else {
      throw new Error('joinCall with initialParticipants not supported - use startCall')
    }
  }
}
