import { useEffect, useRef } from 'react'
import { getAndClearPendingStartCall } from '../pendingStartCallFromPlatform'
import { setPendingJoinMeeting } from '../pendingJoinMeetingFromPlatform'

type CallType = 'audio' | 'video'

interface CallParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
}

interface StartCallPayload {
  userId: string
  displayName: string
  avatarUrl?: string
  callType?: CallType
}

/** Payload for starting a group call from another app (e.g., Spaces) */
interface StartGroupCallPayload {
  conversationId: string
  callType: CallType
  participants: CallParticipant[]
  conversationName?: string
}

/** Payload for joining a calendar meeting from the dashboard */
interface JoinMeetingPayload {
  meetingId: string
  conversationId?: string
  title?: string
  participants?: CallParticipant[] // Optional: if provided, invite these participants
}

interface UseStartCallFromPlatformProps {
  initiateGroupCall?: (
    conversationId: string,
    callType: CallType,
    participants: CallParticipant[],
    conversationName?: string,
    calendarMeetingId?: string | null,
    conversationType?: 'direct' | 'group' | 'meeting'
  ) => void
  createDirectConversation: (userId: string) => Promise<any>
  isConnected: boolean
}

/**
 * Hook to listen for chat:start-call-with-user events from the platform
 * and initiate 1:1 calls with the specified user via Cloudflare RealtimeKit
 *
 * If the chat is not connected when an event arrives, it queues the event
 * and processes it once the connection is established
 */
export const useStartCallFromPlatform = ({
  initiateGroupCall,
  createDirectConversation,
  isConnected
}: UseStartCallFromPlatformProps) => {
  const processingRef = useRef(false)
  const pendingEventRef = useRef<StartCallPayload | null>(null)

  useEffect(() => {
    const earlyPayload = getAndClearPendingStartCall()
    if (earlyPayload) {
      pendingEventRef.current = earlyPayload
    }

    const processStartCall = async (payload: StartCallPayload) => {
      if (processingRef.current || !initiateGroupCall) {
        return
      }

      processingRef.current = true

      const { userId, displayName, avatarUrl, callType = 'audio' } = payload

      try {
        // 1. Create or get direct conversation first (needed for call context)
        const conversation = await createDirectConversation(userId)

        if (!conversation?.id) {
          console.error('[useStartCallFromPlatform] Failed to get conversation')
          return
        }

        // 2. Build participant (only the target user, not current user)
        const participant: CallParticipant = {
          id: userId,
          odId: userId,
          odName: displayName,
          avatarUrl
        }

        // 3. Initiate via Cloudflare RealtimeKit with 'direct' conversation type
        initiateGroupCall(
          conversation.id,
          callType,
          [participant], // Single participant array (target user only)
          undefined, // Don't pass conversation name for direct calls
          null, // No calendar meeting
          'direct' // Mark as direct conversation for 1-on-1 naming
        )
      } catch (error) {
        console.error('[useStartCallFromPlatform] Failed to start call:', error)
      } finally {
        processingRef.current = false
      }
    }

    // Process pending event when connection is established
    if (isConnected && initiateGroupCall && pendingEventRef.current && !processingRef.current) {
      const payload = pendingEventRef.current
      pendingEventRef.current = null

      processStartCall(payload)
    }

    const handleStartCallWithUser = async (event: Event) => {
      const customEvent = event as CustomEvent<StartCallPayload>
      const payload = customEvent.detail

      // If not connected yet or not ready, queue the event
      if (!isConnected || !initiateGroupCall) {
        pendingEventRef.current = payload
        return
      }

      // Process immediately if connected
      await processStartCall(payload)
    }

    // Handle group call events from other apps (e.g., Spaces Quick Huddle)
    const handleStartGroupCall = (event: Event) => {
      const customEvent = event as CustomEvent<StartGroupCallPayload>
      const { conversationId, callType, participants, conversationName } = customEvent.detail

      if (!initiateGroupCall) {
        console.warn('[useStartCallFromPlatform] Cannot start group call - initiateGroupCall not available')
        return
      }

      if (!isConnected) {
        console.warn('[useStartCallFromPlatform] Cannot start group call - not connected')
        return
      }

      // Start the group call directly
      initiateGroupCall(
        conversationId,
        callType,
        participants,
        conversationName,
        null, // No calendar meeting
        'group'
      )

      // Dispatch acknowledgment event so the caller knows the call was started
      window.dispatchEvent(new CustomEvent('chat:group-call-started', { detail: { conversationId } }))
    }

    // Handle joining a calendar meeting (from Calendar or Upcoming Meetings).
    // Must use only event.detail — never URL or current tab — so join is correct when user is on another tab.
    const handleJoinMeeting = (event: Event) => {
      const customEvent = event as CustomEvent<JoinMeetingPayload>
      const { meetingId, conversationId, title, participants } = customEvent.detail

      if (!initiateGroupCall) {
        console.warn('[useStartCallFromPlatform] Cannot join meeting - initiateGroupCall not available')
        return
      }

      if (!isConnected) {
        console.warn('[useStartCallFromPlatform] Cannot join meeting - not connected')
        return
      }

      // Use conversationId if available, otherwise use meetingId as the room identifier
      const roomId = conversationId || meetingId

      // Store so rejoin modal can show transcription message when conversation lacks metadata.meetingId
      if (meetingId && roomId) setPendingJoinMeeting(meetingId, roomId)

      // Join the calendar meeting with video by default
      // Pass the meetingId as calendarMeetingId so the call is linked to the calendar event
      // If participants are provided, invite them (starting a new meeting)
      // If no participants, join existing meeting
      initiateGroupCall(
        roomId,
        'video', // Calendar meetings default to video
        participants || [], // Use provided participants or empty array for joining existing
        title, // Use meeting title as the conversation name
        meetingId, // Pass the calendar meeting ID to link the call
        'meeting' // Mark as a calendar meeting
      )
    }

    // Listen for the custom events from platform
    window.addEventListener('chat:start-call-with-user', handleStartCallWithUser)
    window.addEventListener('chat:start-group-call', handleStartGroupCall)
    window.addEventListener('chat:join-meeting', handleJoinMeeting)

    return () => {
      window.removeEventListener('chat:start-call-with-user', handleStartCallWithUser)
      window.removeEventListener('chat:start-group-call', handleStartGroupCall)
      window.removeEventListener('chat:join-meeting', handleJoinMeeting)
    }
  }, [initiateGroupCall, createDirectConversation, isConnected])
}
