import { useCallback, useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/enterpriseAgent'
import { AgentTypingIndicator } from '../chat/AgentTypingIndicator'
import { MessageBubble } from '../chat/MessageBubble'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_COMPOSER_OFFSET_CLASS,
  WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS
} from './workspaceLayout.constants'

interface ConversationPanelProps {
  sessionId: string
  messages: ChatMessage[]
  isStreaming: boolean
  isWaitingForInput: boolean
  hasFixedFollowUps?: boolean
  onReply: (message: string) => void | Promise<unknown>
  onViewArtifact?: (artifactName: string) => void
  composer?: React.ReactNode
}

const isTranscriptMessage = (message: ChatMessage) =>
  message.type === 'user_input' ||
  message.type === 'expert_call' ||
  message.type === 'final_answer' ||
  message.type === 'error'

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionId,
  messages,
  isStreaming,
  hasFixedFollowUps = false,
  onReply,
  onViewArtifact,
  composer
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)

  const visibleMessages = messages.filter(isTranscriptMessage)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    userScrolledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
  }, [])

  useEffect(() => {
    if (!userScrolledRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleMessages.length, isStreaming])

  return (
    <div
      className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:bg-background"
      data-testid="fabric-conversation-panel"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:pt-12 sm:gba:pt-16 ${WORKSPACE_CHAT_GUTTER_CLASS} ${
          hasFixedFollowUps ? WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS : WORKSPACE_COMPOSER_OFFSET_CLASS
        }`}
      >
        <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:space-y-4`}>
          {visibleMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              sessionId={sessionId}
              onReply={onReply}
              onViewArtifact={onViewArtifact}
            />
          ))}

          {isStreaming && <AgentTypingIndicator />}

          <div ref={endRef} />
        </div>
      </div>

      {composer}
    </div>
  )
}
