/**
 * useCreateChat - Manages the agent chat message state and routes
 * user messages to the appropriate orchestrator handler based on viewState.
 *
 * - In 'review' state: routes to refinePlan or triggers build
 * - In 'complete' state: routes to AI builder fix chat
 * - In other states: adds informational system messages
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import type { CreateChatMessage, ChatMessageType } from '../types/chat'
import type { OrchestratorViewState } from '../types'

interface UseCreateChatOptions {
  viewState: OrchestratorViewState
  onRefine: (feedback: string) => Promise<void>
  onStartBuild: (skipComponents?: string[]) => Promise<void>
  onFixSend?: (prompt: string) => Promise<void>
}

interface UseCreateChatResult {
  messages: CreateChatMessage[]
  isProcessing: boolean
  handleSend: (content: string) => void
  addSystemMessage: (content: string) => void
  addAssistantMessage: (content: string, type?: ChatMessageType) => void
  addUserMessage: (content: string, type?: ChatMessageType) => void
  resetMessages: () => void
}

const BUILD_KEYWORDS = [
  'build',
  'start build',
  'build it',
  'go ahead',
  'proceed',
  'execute',
  'start building',
  'lets build',
  "let's build"
]

function createId(): string {
  return crypto.randomUUID()
}

function isBuildIntent(content: string): boolean {
  const lower = content.toLowerCase().trim()
  return BUILD_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw))
}

export function useCreateChat({
  viewState,
  onRefine,
  onStartBuild,
  onFixSend
}: UseCreateChatOptions): UseCreateChatResult {
  const [messages, setMessages] = useState<CreateChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const viewStateRef = useRef(viewState)

  useEffect(() => {
    viewStateRef.current = viewState
  }, [viewState])

  const appendMessage = useCallback((msg: Omit<CreateChatMessage, 'id' | 'createdAt'>) => {
    const full: CreateChatMessage = {
      ...msg,
      id: createId(),
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, full])
    return full.id
  }, [])

  const addSystemMessage = useCallback(
    (content: string) => {
      appendMessage({ role: 'system', content, messageType: 'system' })
    },
    [appendMessage]
  )

  const addAssistantMessage = useCallback(
    (content: string, type: ChatMessageType = 'general') => {
      appendMessage({ role: 'assistant', content, messageType: type })
    },
    [appendMessage]
  )

  const addUserMessage = useCallback(
    (content: string, type: ChatMessageType = 'prompt') => {
      appendMessage({ role: 'user', content, messageType: type })
    },
    [appendMessage]
  )

  const handleReviewSend = useCallback(
    async (content: string) => {
      if (isBuildIntent(content)) {
        addAssistantMessage("Starting the build now. You'll see progress on the canvas.")
        await onStartBuild()
        return
      }

      // Add thinking message immediately
      const thinkingId = appendMessage({
        role: 'assistant',
        content: 'Analyzing your request...',
        messageType: 'system',
        isStreaming: true
      })

      setIsProcessing(true)
      try {
        await onRefine(content)
        // Remove thinking message and add success message
        setMessages(prev => prev.filter(msg => msg.id !== thinkingId))
        addAssistantMessage('Plan updated based on your feedback. Review the changes on the canvas.')
      } catch {
        // Remove thinking message and add error message
        setMessages(prev => prev.filter(msg => msg.id !== thinkingId))
        addAssistantMessage('I could not apply that refinement. Please try rephrasing.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onRefine, onStartBuild, addAssistantMessage, appendMessage]
  )

  const handleCompleteSend = useCallback(
    async (content: string) => {
      if (!onFixSend) {
        addAssistantMessage('Fix chat is not available for this build.')
        return
      }
      setIsProcessing(true)
      try {
        await onFixSend(content)
        addAssistantMessage('Applied. Review the updated preview on the canvas.', 'fix')
      } catch {
        addAssistantMessage('I could not apply this fix. Please try again.', 'fix')
      } finally {
        setIsProcessing(false)
      }
    },
    [onFixSend, addAssistantMessage]
  )

  const handleSend = useCallback(
    (content: string) => {
      let messageType: ChatMessageType = 'general'
      if (viewStateRef.current === 'review') messageType = 'refinement'
      else if (viewStateRef.current === 'complete') messageType = 'fix'

      appendMessage({ role: 'user', content, messageType })

      const currentState = viewStateRef.current
      if (currentState === 'review') {
        void handleReviewSend(content)
      } else if (currentState === 'complete') {
        void handleCompleteSend(content)
      } else if (currentState === 'building') {
        addAssistantMessage('A build is in progress. Please wait until it completes.')
      } else {
        addAssistantMessage('Please submit a prompt from the canvas first.')
      }
    },
    [appendMessage, handleReviewSend, handleCompleteSend, addAssistantMessage]
  )

  const resetMessages = useCallback(() => {
    setMessages([])
    setIsProcessing(false)
  }, [])

  return useMemo(
    () => ({
      messages,
      isProcessing,
      handleSend,
      addSystemMessage,
      addAssistantMessage,
      addUserMessage,
      resetMessages
    }),
    [messages, isProcessing, handleSend, addSystemMessage, addAssistantMessage, addUserMessage, resetMessages]
  )
}
