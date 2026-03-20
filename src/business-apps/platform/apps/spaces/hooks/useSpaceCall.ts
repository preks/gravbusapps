/**
 * useSpaceCall Hook
 *
 * Provides functionality to start calls from a space.
 * Works by dispatching events that the chat app's useStartCallFromPlatform hook will handle.
 */

import { useCallback } from 'react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { LinkedConversation } from '../types/space.types'

export type CallType = 'audio' | 'video'

export interface UseSpaceCallResult {
  /** Start an audio call with the team */
  startAudioCall: () => void
  /** Start a video call with the team */
  startVideoCall: () => void
  /** Whether calls can be started (has linked conversation) */
  canStartCall: boolean
}

/**
 * Hook to start calls from a space
 *
 * When a linked conversation exists, navigates to chat and starts a group call.
 * The chat app will handle the actual call setup.
 *
 * @param conversation - The linked group conversation
 * @returns Functions to start audio/video calls
 */
export function useSpaceCall(conversation: LinkedConversation | null): UseSpaceCallResult {
  const canStartCall = !!conversation

  const startCall = useCallback(
    (callType: CallType) => {
      if (!conversation) {
        console.warn('[useSpaceCall] Cannot start call without linked conversation')
        return
      }

      // Navigate to chat with the conversation selected and trigger call
      const isProduction = process.env.NODE_ENV === 'production'
      const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'

      // Add URL params to trigger call on load
      // view=chat ensures the Chat tab is active (not Dashboard)
      const params = new URLSearchParams({
        conversationId: conversation.id,
        action: 'startCall',
        callType,
        view: 'chat'
      })

      navigateTo(buildPlatformUrl(`${chatPath}?${params.toString()}`))
    },
    [conversation]
  )

  const startAudioCall = useCallback(() => {
    startCall('audio')
  }, [startCall])

  const startVideoCall = useCallback(() => {
    startCall('video')
  }, [startCall])

  return {
    startAudioCall,
    startVideoCall,
    canStartCall
  }
}

export default useSpaceCall
