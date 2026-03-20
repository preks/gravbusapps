import { useEffect, useRef } from 'react'

interface OpenChatPayload {
  userId: string
  userName?: string
  prefilledMessage?: string
  metadata?: Record<string, any>
}

interface UseOpenChatFromPlatformProps {
  createDirectConversation: (userId: string) => Promise<any>
  setDraftMessage: (message: string) => void
  setShowConversationList: (show: boolean) => void
  isConnected: boolean
}

/**
 * Hook to listen for chat:open-with-user events from the platform
 * and open direct conversations with pre-filled messages
 *
 * If the chat is not connected when an event arrives, it queues the event
 * and processes it once the connection is established
 */
export const useOpenChatFromPlatform = ({
  createDirectConversation,
  setDraftMessage,
  setShowConversationList,
  isConnected
}: UseOpenChatFromPlatformProps) => {
  const processingRef = useRef(false)
  const pendingEventRef = useRef<OpenChatPayload | null>(null)

  // Main effect to handle incoming events
  useEffect(() => {
    const processOpenChat = async (payload: OpenChatPayload) => {
      if (processingRef.current) {
        return
      }

      processingRef.current = true

      const { userId, prefilledMessage } = payload

      try {
        // 1. Open or create direct conversation with the user
        await createDirectConversation(userId)

        // 2. Hide conversation list to show the conversation view
        setShowConversationList(false)

        // 3. Pre-fill the message input if provided
        if (prefilledMessage) {
          // Wait a bit for the conversation to fully render
          await new Promise(resolve => setTimeout(resolve, 200))

          setDraftMessage(prefilledMessage)
        }

        // 4. Signal platform to reveal sidepanel content (so user doesn't see tab/list transition)
        try {
          window.dispatchEvent(new CustomEvent('chat:conversation-ready'))
          if (window.parent !== window) {
            window.parent.postMessage({ type: 'CHAT_CONVERSATION_READY' }, '*')
          }
        } catch {
          // ignore
        }
      } finally {
        processingRef.current = false
      }
    }

    // Process pending event when connection is established
    if (isConnected && pendingEventRef.current && !processingRef.current) {
      const payload = pendingEventRef.current
      pendingEventRef.current = null

      // Process the event
      processOpenChat(payload)
    }

    const handleOpenChatWithUser = async (event: Event) => {
      const customEvent = event as CustomEvent<OpenChatPayload>
      const payload = customEvent.detail

      // If not connected yet, queue the event
      if (!isConnected) {
        pendingEventRef.current = payload
        return
      }

      // Process immediately if connected
      await processOpenChat(payload)
    }

    // Listen for the custom event from platform
    window.addEventListener('chat:open-with-user', handleOpenChatWithUser)

    return () => {
      window.removeEventListener('chat:open-with-user', handleOpenChatWithUser)
    }
  }, [createDirectConversation, setDraftMessage, isConnected])
}
