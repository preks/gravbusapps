/**
 * useCreateChat - Manages the agent chat message state and routes
 * user messages to the appropriate orchestrator handler based on viewState.
 *
 * - In 'review' state: routes to refinePlan or triggers build
 * - In 'complete' state: routes to AI builder fix chat
 * - In other states: adds informational system messages
 */

import { useState, useCallback, useRef, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import type { CreateChatMessage, ChatMessageType, OrchestratorFixComposerScope } from '../types/chat'
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
    onPartial?: (partial: AssistantStreamUpdate) => void,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) => Promise<void | FixSendResult>
  onStartBuild: (skipComponents?: string[]) => Promise<void>
  onFixSend?: (
    prompt: string,
    onPartial?: (partial: AssistantStreamUpdate) => void,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { changeScope: OrchestratorFixComposerScope }
  ) => Promise<void | FixSendResult>
  /** When set, passed to `onFixSend` as `options.changeScope` for post-build (complete) messages. */
  fixComposerChangeScope?: OrchestratorFixComposerScope
  userInfo?: { id?: string }
}

export interface UseCreateChatResult {
  messages: CreateChatMessage[]
  isProcessing: boolean
  handleSend: (content: string) => void
  editAndResendMessage: (
    messageId: string,
    content: string,
    editorId?: string,
    forcedState?: OrchestratorViewState
  ) => void
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
  onSend: (
    content: string,
    onPartial: (partial: AssistantStreamUpdate) => void,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: { changeScope: OrchestratorFixComposerScope }
  ) => Promise<void | FixSendResult>
  fixSendOptions?: { changeScope: OrchestratorFixComposerScope }
}

function createStreamingSendHandler(
  content: string,
  setMessages: Dispatch<SetStateAction<CreateChatMessage[]>>,
  appendMessage: (msg: AppendableCreateChatMessage) => string,
  setIsProcessing: (value: boolean) => void,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
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
      const result = await options.onSend(content, applyPartial, conversationHistory, options.fixSendOptions)
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

function buildConversationHistorySnapshot(
  messages: CreateChatMessage[],
  pendingUserContent?: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history = messages
    .filter(message => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
    .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content }))
  const pending = pendingUserContent?.trim()
  if (pending) {
    history.push({ role: 'user', content: pending })
  }
  return history
}

export function useCreateChat({
  viewState,
  onRefine,
  onRefineSend,
  onStartBuild,
  onFixSend,
  fixComposerChangeScope = 'screen',
  userInfo
}: UseCreateChatOptions): UseCreateChatResult {
  const [messages, setMessages] = useState<CreateChatMessage[]>([])
  const messagesRef = useRef<CreateChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const viewStateRef = useRef(viewState)

  useEffect(() => {
    viewStateRef.current = viewState
  }, [viewState])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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
      return appendMessage({
        ...extras,
        role: 'user',
        content,
        messageType: type,
        createdBy: extras?.createdBy ?? userInfo?.id
      })
    },
    [appendMessage, userInfo?.id]
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
        const conversationHistory = buildConversationHistorySnapshot(messagesRef.current, content)
        setIsProcessing(true)
        const handler = createStreamingSendHandler(
          content,
          setMessages,
          appendMessage,
          setIsProcessing,
          conversationHistory,
          {
            messageType: 'refinement',
            fallbackContent: 'Plan updated based on your feedback. Review the changes on the canvas.',
            errorMessage: 'I could not apply that refinement. Please try rephrasing.',
            onSend: onRefineSend
          }
        )
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
      const conversationHistory = buildConversationHistorySnapshot(messagesRef.current, content)
      setIsProcessing(true)
      const handler = createStreamingSendHandler(
        content,
        setMessages,
        appendMessage,
        setIsProcessing,
        conversationHistory,
        {
          messageType: 'fix',
          fallbackContent: 'Applied. Review the updated preview on the canvas.',
          errorMessage: 'I could not apply this fix. Please try again.',
          onSend: onFixSend,
          fixSendOptions: { changeScope: fixComposerChangeScope }
        }
      )
      await handler()
    },
    [onFixSend, fixComposerChangeScope, addAssistantMessage, appendMessage]
  )

  const routeMessageByState = useCallback(
    (content: string, currentState: OrchestratorViewState) => {
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
    [addAssistantMessage, handleCompleteSend, handleReviewSend]
  )

  const handleSend = useCallback(
    (content: string) => {
      const currentState = viewStateRef.current
      let messageType: ChatMessageType = 'general'
      if (currentState === 'review') messageType = 'refinement'
      else if (currentState === 'complete') messageType = 'fix'

      appendMessage({ role: 'user', content, messageType, createdBy: userInfo?.id })
      routeMessageByState(content, currentState)
    },
    [appendMessage, routeMessageByState, userInfo?.id]
  )

  const resetMessages = useCallback(() => {
    setMessages([])
    setIsProcessing(false)
  }, [])

  const editAndResendMessage = useCallback(
    (messageId: string, content: string, editorId?: string, forcedState?: OrchestratorViewState) => {
      const nextContent = content.trim()
      if (!messageId || !nextContent) return
      const now = new Date().toISOString()
      const actorId = editorId ?? userInfo?.id
      const currentState = forcedState ?? viewStateRef.current

      setMessages(prev => {
        const next = [...prev]
        const targetIndex = next.findIndex(message => message.id === messageId && message.role === 'user')
        if (targetIndex === -1) {
          next.push({
            id: messageId,
            role: 'user',
            content: nextContent,
            createdAt: now,
            messageType: currentState === 'review' ? 'refinement' : currentState === 'complete' ? 'fix' : 'prompt',
            createdBy: actorId ?? userInfo?.id,
            editHistory: actorId ? [{ userId: actorId, editedAt: now }] : undefined
          })
          return next
        }

        const target = next[targetIndex]
        const nextHistory = [...(target.editHistory ?? [])]
        if (actorId) {
          nextHistory.push({ userId: actorId, editedAt: now })
        }
        next[targetIndex] = {
          ...target,
          content: nextContent,
          createdBy: target.createdBy ?? actorId ?? userInfo?.id,
          editHistory: nextHistory
        }
        return next
      })

      routeMessageByState(nextContent, currentState)
    },
    [routeMessageByState, userInfo?.id]
  )

  return useMemo(
    () => ({
      messages,
      isProcessing,
      handleSend,
      editAndResendMessage,
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
      editAndResendMessage,
      addSystemMessage,
      addAssistantMessage,
      addUserMessage,
      replaceMessages,
      resetMessages
    ]
  )
}
