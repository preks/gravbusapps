import { useEffect, useRef } from 'react'
import type { CallParticipant, CallType } from '../services/webrtcClient'

interface StartCallPayload {
  userId: string
  displayName: string
  avatarUrl?: string
  callType?: CallType
}

interface UseStartCallFromPlatformProps {
  initiateCall: (participant: CallParticipant, type: CallType, conversationId?: string) => Promise<void>
  createDirectConversation: (userId: string) => Promise<any>
  isConnected: boolean
}

/**
 * Hook to listen for chat:start-call-with-user events from the platform
 * and initiate calls with the specified user
 *
 * If the chat is not connected when an event arrives, it queues the event
 * and processes it once the connection is established
 */
export const useStartCallFromPlatform = ({
  initiateCall,
  createDirectConversation,
  isConnected
}: UseStartCallFromPlatformProps) => {
  const processingRef = useRef(false)
  const pendingEventRef = useRef<StartCallPayload | null>(null)

  useEffect(() => {
    const processStartCall = async (payload: StartCallPayload) => {
      if (processingRef.current) {
        return
      }

      processingRef.current = true

      const { userId, displayName, avatarUrl, callType = 'audio' } = payload

      try {
        // 1. Create or get direct conversation first (needed for call context)
        const conversation = await createDirectConversation(userId)

        // 2. Initiate the call
        const participant: CallParticipant = {
          id: userId,
          odId: userId,
          odName: displayName,
          avatarUrl
        }

        await initiateCall(participant, callType, conversation?.id)
      } catch (error) {
        console.error('[useStartCallFromPlatform] Failed to start call:', error)
      } finally {
        processingRef.current = false
      }
    }

    // Process pending event when connection is established
    if (isConnected && pendingEventRef.current && !processingRef.current) {
      const payload = pendingEventRef.current
      pendingEventRef.current = null

      processStartCall(payload)
    }

    const handleStartCallWithUser = async (event: Event) => {
      const customEvent = event as CustomEvent<StartCallPayload>
      const payload = customEvent.detail

      // If not connected yet, queue the event
      if (!isConnected) {
        pendingEventRef.current = payload
        return
      }

      // Process immediately if connected
      await processStartCall(payload)
    }

    // Listen for the custom event from platform
    window.addEventListener('chat:start-call-with-user', handleStartCallWithUser)

    return () => {
      window.removeEventListener('chat:start-call-with-user', handleStartCallWithUser)
    }
  }, [initiateCall, createDirectConversation, isConnected])
}
