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
  rtkDebug: { log: (...args: any[]) => void; warn: (...args: any[]) => void }
}

export function buildJoinCallWrapper(params: BuildJoinCallWrapperParams): PublicJoinCall {
  const { internalJoinCall, getActiveConversationCalls, getConversations, rtkDebug } = params

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
    const initialParticipants = !isPreferencesObject
      ? (initialParticipantsOrPreferences as CallParticipant[] | undefined)
      : undefined

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
          rtkDebug.log('[RTK] joinCall wrapper: Resolved meetingId to conversationId', {
            input: roomIdOrMeetingId,
            conversationId: convId,
            meetingId: call.roomId,
            conversationName: call.conversationName
          })
        } else if (convId === roomIdOrMeetingId) {
          resolvedConversationId = convId
          resolvedMeetingId = call.roomId
          resolvedConversationName = call.conversationName
          rtkDebug.log('[RTK] joinCall wrapper: Resolved conversationId to meetingId', {
            input: roomIdOrMeetingId,
            conversationId: convId,
            meetingId: call.roomId,
            conversationName: call.conversationName
          })
        }
      })

      if (!resolvedMeetingId && conversations.length) {
        const byMeetingId = conversations.find((c: any) => c?.activeCall?.roomId === roomIdOrMeetingId)
        if (byMeetingId?.id) {
          resolvedConversationId = byMeetingId.id
          resolvedMeetingId = roomIdOrMeetingId
          resolvedConversationName = byMeetingId.name
          rtkDebug.log('[RTK] joinCall wrapper: Resolved meetingId via options.conversations activeCall', {
            input: roomIdOrMeetingId,
            conversationId: resolvedConversationId,
            meetingId: resolvedMeetingId,
            conversationName: resolvedConversationName
          })
        }
      }

      if (!resolvedMeetingId && conversations.length) {
        const byConversationId = conversations.find((c: any) => c?.id === roomIdOrMeetingId)
        const meetingIdFromConversation = byConversationId?.activeCall?.roomId
        if (byConversationId?.id && meetingIdFromConversation) {
          resolvedConversationId = byConversationId.id
          resolvedMeetingId = meetingIdFromConversation
          resolvedConversationName = byConversationId.name
          rtkDebug.log('[RTK] joinCall wrapper: Resolved conversationId via options.conversations activeCall', {
            input: roomIdOrMeetingId,
            conversationId: resolvedConversationId,
            meetingId: resolvedMeetingId,
            conversationName: resolvedConversationName
          })
        }
      }

      if (!resolvedMeetingId) {
        rtkDebug.warn(
          '[RTK] joinCall wrapper: Could not resolve meetingId from activeConversationCalls, using input as conversationId',
          {
            input: roomIdOrMeetingId,
            activeConversationCallsSize: getActiveConversationCalls().size,
            activeConversationCallsKeys: Array.from(getActiveConversationCalls().keys())
          }
        )
        resolvedConversationId = roomIdOrMeetingId
        resolvedMeetingId = undefined
      }

      rtkDebug.log('[RTK] joinCall wrapper: Final resolved IDs', {
        input: roomIdOrMeetingId,
        conversationId: resolvedConversationId,
        meetingId: resolvedMeetingId || 'undefined',
        conversationName: resolvedConversationName,
        callType,
        preferences
      })

      await internalJoinCall(resolvedConversationId, callType, resolvedMeetingId, resolvedConversationName, preferences)
    } else {
      rtkDebug.warn('[RTK] joinCall called with initialParticipants - this is not supported. Use startCall instead.')
      throw new Error('joinCall with initialParticipants not supported - use startCall')
    }
  }
}
