/**
 * useCreateChat - Manages the agent chat message state and routes
 * user messages to the appropriate orchestrator handler based on viewState.
 *
 * - In 'review' state: routes to refinePlan or triggers build
 * - In 'complete' state: routes to AI builder fix chat
 * - In other states: adds informational system messages
 */

import { useState, useCallback, useRef, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { CreateChatMessage, ChatMessageType } from '../types/chat'
import type { OrchestratorViewState } from '../types'

type AssistantStreamUpdate = Partial<Omit<CreateChatMessage, 'id' | 'createdAt' | 'role'>>
type AppendableCreateChatMessage = Omit<CreateChatMessage, 'id' | 'createdAt'> & {
  // Streaming UIs attach timeline details while the base chat type may lag behind.
  blocks?: unknown[]
  toolCalls?: unknown[]
}

interface FixSendResult {
  assistantMessage?: Omit<CreateChatMessage, 'id' | 'createdAt' | 'role'>
}

interface UseCreateChatOptions {
  viewState: OrchestratorViewState
  onRefine: (feedback: string) => Promise<void>
  onRefineSend?: (
    feedback: string,
    onPartial?: (partial: AssistantStreamUpdate) => void
  ) => Promise<void | FixSendResult>
  onStartBuild: (skipComponents?: string[]) => Promise<void>
  onFixSend?: (prompt: string, onPartial?: (partial: AssistantStreamUpdate) => void) => Promise<void | FixSendResult>
}

export interface UseCreateChatResult {
  messages: CreateChatMessage[]
  isProcessing: boolean
  handleSend: (content: string) => void
  addSystemMessage: (content: string, extras?: Partial<CreateChatMessage>) => string
  addAssistantMessage: (content: string, type?: ChatMessageType, extras?: Partial<CreateChatMessage>) => string
  addUserMessage: (content: string, type?: ChatMessageType, extras?: Partial<CreateChatMessage>) => string
  replaceMessages: (messages: CreateChatMessage[]) => void
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

function isRefineIntent(content: string): boolean {
  const lower = content.toLowerCase().trim()
  return (
    lower.startsWith('refine') ||
    lower.startsWith('refine plan') ||
    lower.startsWith('update plan') ||
    lower.startsWith('modify plan') ||
    lower.startsWith('adjust plan')
  )
}

function applyStreamingUpdate(
  messages: CreateChatMessage[],
  streamingMessageId: string,
  partial: AssistantStreamUpdate
): CreateChatMessage[] {
  return messages.map(msg =>
    msg.id === streamingMessageId
      ? { ...msg, ...partial, isStreaming: true, messageType: partial.messageType ?? msg.messageType }
      : msg
  )
}

function finalizeStreamingMessage(
  messages: CreateChatMessage[],
  streamingMessageId: string,
  fallbackContent: string
): CreateChatMessage[] {
  return messages.map(msg =>
    msg.id === streamingMessageId
      ? {
          ...msg,
          content: msg.content?.trim() ? msg.content : fallbackContent,
          isStreaming: false
        }
      : msg
  )
}

function setStreamingError(
  messages: CreateChatMessage[],
  streamingMessageId: string,
  errorContent: string,
  messageType: ChatMessageType
): CreateChatMessage[] {
  return messages.map(msg =>
    msg.id === streamingMessageId ? { ...msg, content: errorContent, messageType, isStreaming: false } : msg
  )
}

interface StreamingSendOptions {
  messageType: ChatMessageType
  fallbackContent: string
  errorMessage: string
  onSend: (content: string, onPartial: (partial: AssistantStreamUpdate) => void) => Promise<void | FixSendResult>
}

function createStreamingSendHandler(
  content: string,
  setMessages: Dispatch<SetStateAction<CreateChatMessage[]>>,
  appendMessage: (msg: AppendableCreateChatMessage) => string,
  setIsProcessing: (value: boolean) => void,
  options: StreamingSendOptions
): () => Promise<void> {
  return async () => {
    const streamingMessageId = appendMessage({
      role: 'assistant',
      content: '',
      messageType: options.messageType,
      isStreaming: true,
      blocks: [],
      toolCalls: []
    })
    const applyPartial = (partial: AssistantStreamUpdate) => {
      setMessages(prev => applyStreamingUpdate(prev, streamingMessageId, partial))
    }
    try {
      const result = await options.onSend(content, applyPartial)
      if (result?.assistantMessage) {
        applyPartial(result.assistantMessage)
      } else {
        applyPartial({ content: options.fallbackContent, messageType: options.messageType })
      }
      setMessages(prev => finalizeStreamingMessage(prev, streamingMessageId, options.fallbackContent))
    } catch (error_) {
      const message = error_ instanceof Error && error_.message ? error_.message : null
      setMessages(prev =>
        setStreamingError(prev, streamingMessageId, message || options.errorMessage, options.messageType)
      )
    } finally {
      setIsProcessing(false)
    }
  }
}

export function useCreateChat({
  viewState,
  onRefine,
  onRefineSend,
  onStartBuild,
  onFixSend
}: UseCreateChatOptions): UseCreateChatResult {
  const [messages, setMessages] = useState<CreateChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const viewStateRef = useRef(viewState)

  useEffect(() => {
    viewStateRef.current = viewState
  }, [viewState])

  const appendMessage = useCallback((msg: AppendableCreateChatMessage) => {
    const full: CreateChatMessage = {
      ...msg,
      id: createId(),
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, full])
    return full.id
  }, [])

  const addSystemMessage = useCallback(
    (content: string, extras?: Partial<CreateChatMessage>) => {
      return appendMessage({ ...extras, role: 'system', content, messageType: 'system' })
    },
    [appendMessage]
  )

  const addAssistantMessage = useCallback(
    (content: string, type: ChatMessageType = 'general', extras?: Partial<CreateChatMessage>) => {
      return appendMessage({ ...extras, role: 'assistant', content, messageType: type })
    },
    [appendMessage]
  )

  const addUserMessage = useCallback(
    (content: string, type: ChatMessageType = 'prompt', extras?: Partial<CreateChatMessage>) => {
      return appendMessage({ ...extras, role: 'user', content, messageType: type })
    },
    [appendMessage]
  )

  const replaceMessages = useCallback((nextMessages: CreateChatMessage[]) => {
    const normalized = Array.isArray(nextMessages)
      ? nextMessages.map(message => ({
          ...message,
          id: message.id || createId(),
          createdAt: message.createdAt || new Date().toISOString()
        }))
      : []
    setMessages(normalized)
  }, [])

  const handleReviewSend = useCallback(
    async (content: string) => {
      if (isBuildIntent(content)) {
        addAssistantMessage("Starting the build now. You'll see progress on the canvas.")
        await onStartBuild()
        return
      }

      if (onRefineSend) {
        setIsProcessing(true)
        const handler = createStreamingSendHandler(content, setMessages, appendMessage, setIsProcessing, {
          messageType: 'refinement',
          fallbackContent: 'Plan updated based on your feedback. Review the changes on the canvas.',
          errorMessage: 'I could not apply that refinement. Please try rephrasing.',
          onSend: onRefineSend
        })
        await handler()
        return
      }

      setIsProcessing(true)
      const fallbackThinkingId = appendMessage({
        role: 'assistant',
        content: 'Analyzing your request...',
        messageType: 'system',
        isStreaming: true
      })
      try {
        await onRefine(content)
        setMessages(prev => prev.filter(msg => msg.id !== fallbackThinkingId))
        addAssistantMessage('Plan updated based on your feedback. Review the changes on the canvas.')
      } catch {
        setMessages(prev => prev.filter(msg => msg.id !== fallbackThinkingId))
        addAssistantMessage('I could not apply that refinement. Please try rephrasing.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onRefine, onRefineSend, onStartBuild, addAssistantMessage, appendMessage]
  )

  const handleCompleteSend = useCallback(
    async (content: string) => {
      if (!onFixSend) {
        addAssistantMessage('Fix chat is not available for this build.')
        return
      }
      setIsProcessing(true)
      const handler = createStreamingSendHandler(content, setMessages, appendMessage, setIsProcessing, {
        messageType: 'fix',
        fallbackContent: 'Applied. Review the updated preview on the canvas.',
        errorMessage: 'I could not apply this fix. Please try again.',
        onSend: onFixSend
      })
      await handler()
    },
    [onFixSend, addAssistantMessage, appendMessage]
  )

  const handleSend = useCallback(
    (content: string) => {
      const currentState = viewStateRef.current
      const refineFromComplete = currentState === 'complete' && !!onRefineSend && isRefineIntent(content)
      let messageType: ChatMessageType = 'general'
      if (currentState === 'review' || refineFromComplete) messageType = 'refinement'
      else if (currentState === 'complete') messageType = 'fix'

      appendMessage({ role: 'user', content, messageType })

      if (currentState === 'review' || refineFromComplete) {
        void handleReviewSend(content)
      } else if (currentState === 'complete') {
        void handleCompleteSend(content)
      } else if (currentState === 'building') {
        addAssistantMessage('A build is in progress. Please wait until it completes.')
      } else {
        addAssistantMessage('Please submit a prompt from the canvas first.')
      }
    },
    [appendMessage, handleReviewSend, handleCompleteSend, addAssistantMessage, onRefineSend]
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
      replaceMessages,
      resetMessages
    }),
    [
      messages,
      isProcessing,
      handleSend,
      addSystemMessage,
      addAssistantMessage,
      addUserMessage,
      replaceMessages,
      resetMessages
    ]
  )
}
