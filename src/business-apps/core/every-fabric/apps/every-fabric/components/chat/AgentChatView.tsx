import { useRef, useEffect, useCallback } from 'react'
import type { ChatMessage, DeepAgentSession, SessionConfig } from '../../types/enterpriseAgent'
import { MessageBubble } from './MessageBubble'
import { AgentTypingIndicator } from './AgentTypingIndicator'
import { ChatInput } from './ChatInput'
import { AgentPickerScreen } from '../empty-states/AgentPickerScreen'

interface AgentChatViewProps {
  accessToken: string
  session: DeepAgentSession | null
  messages: ChatMessage[]
  isStreaming: boolean
  isWaitingForInput: boolean
  onStartSession: (task: string, config: SessionConfig) => Promise<string>
  onReply: (message?: string, structuredInput?: Record<string, any>) => void | Promise<void>
  onStopSession: () => void
  onOpenMemory: () => void
}

const isTranscriptMessage = (message: ChatMessage) =>
  message.type === 'user_input' ||
  message.type === 'expert_call' ||
  message.type === 'final_answer' ||
  message.type === 'error'

export const AgentChatView = ({
  accessToken,
  session,
  messages,
  isStreaming,
  isWaitingForInput,
  onStartSession,
  onReply,
  onStopSession,
  onOpenMemory
}: AgentChatViewProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  const visibleMessages = messages.filter(isTranscriptMessage)

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleMessages.length, isStreaming])

  const handleSubmit = useCallback(
    async (task: string, config: SessionConfig) => {
      if (session) {
        await onReply(task)
      } else {
        await onStartSession(task, config)
      }
    },
    [session, onStartSession, onReply]
  )

  const interruptQuestion =
    session?.human_question && !session.structured_input_request && (isWaitingForInput || isStreaming)
      ? session.human_question
      : undefined

  if (!session) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-chat">
        <AgentPickerScreen
          accessToken={accessToken}
          onSubmit={handleSubmit}
          onReply={onReply}
          onOpenMemory={onOpenMemory}
        />
      </div>
    )
  }

  const isRunning = isStreaming
  const isDisabled = isRunning && !isWaitingForInput

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-chat">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:py-4 gba:space-y-2"
      >
        {visibleMessages.map(msg => (
          <MessageBubble key={msg.id} message={msg} sessionId={session.session_id} onReply={onReply} />
        ))}

        {isStreaming && <AgentTypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSubmit={handleSubmit}
        disabled={isDisabled}
        isRunning={isRunning}
        onStop={onStopSession}
        onReply={msg => {
          void onReply(msg)
        }}
        activeInterrupt={interruptQuestion}
        onOpenMemory={onOpenMemory}
      />
    </div>
  )
}
