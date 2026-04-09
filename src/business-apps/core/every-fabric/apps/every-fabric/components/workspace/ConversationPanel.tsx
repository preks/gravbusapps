import { useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import type { ChatMessage } from '../../types/enterpriseAgent'
import { AgentTypingIndicator } from '../chat/AgentTypingIndicator'
import { MessageBubble } from '../chat/MessageBubble'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_COMPOSER_OFFSET_CLASS,
  WORKSPACE_COMPOSER_STREAMING_ISLAND_OFFSET_CLASS,
  WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS,
  WORKSPACE_END_SENTINEL_SCROLL_MARGIN_DEFAULT_CLASS,
  WORKSPACE_END_SENTINEL_SCROLL_MARGIN_STREAMING_ISLAND_CLASS,
  WORKSPACE_END_SENTINEL_SCROLL_MARGIN_WITH_FOLLOWUPS_CLASS
} from './workspaceLayout.constants'

interface ConversationPanelProps {
  sessionId: string
  messages: ChatMessage[]
  isStreaming: boolean
  isWaitingForInput: boolean
  hasFixedFollowUps?: boolean
  hasStreamingIsland?: boolean
  onReply: (message?: string, structuredInput?: Record<string, any>) => void | Promise<unknown>
  onViewArtifact?: (artifactName: string) => void
  composer?: React.ReactNode
}

const isTranscriptMessage = (message: ChatMessage) =>
  message.type === 'user_input' ||
  message.type === 'expert_call' ||
  message.type === 'final_answer' ||
  message.type === 'structured_input_request' ||
  message.type === 'error'

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionId,
  messages,
  isStreaming,
  hasFixedFollowUps = false,
  hasStreamingIsland = false,
  onReply,
  onViewArtifact,
  composer
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const userScrolledRef = useRef(false)
  const hadFixedFollowUpsRef = useRef(false)

  const visibleMessages = messages.filter(isTranscriptMessage)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    userScrolledRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
  }, [])

  /** When follow-ups mount, padding changes and prior scroll may leave text under the overlay — always jump clear. */
  useLayoutEffect(() => {
    if (!hasFixedFollowUps) {
      hadFixedFollowUpsRef.current = false
      return
    }
    const justOpened = !hadFixedFollowUpsRef.current
    hadFixedFollowUpsRef.current = true
    if (!justOpened) return

    const el = scrollRef.current
    if (!el) return

    const scrollToEnd = () => {
      el.scrollTop = el.scrollHeight
    }

    scrollToEnd()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToEnd()
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      })
    })
  }, [hasFixedFollowUps])

  useEffect(() => {
    if (!userScrolledRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [visibleMessages.length, isStreaming, hasFixedFollowUps, hasStreamingIsland])

  let bottomPaddingClass = WORKSPACE_COMPOSER_OFFSET_CLASS
  if (hasFixedFollowUps) bottomPaddingClass = WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS
  else if (hasStreamingIsland) bottomPaddingClass = WORKSPACE_COMPOSER_STREAMING_ISLAND_OFFSET_CLASS

  let endSentinelMarginClass = WORKSPACE_END_SENTINEL_SCROLL_MARGIN_DEFAULT_CLASS
  if (hasFixedFollowUps) endSentinelMarginClass = WORKSPACE_END_SENTINEL_SCROLL_MARGIN_WITH_FOLLOWUPS_CLASS
  else if (hasStreamingIsland) endSentinelMarginClass = WORKSPACE_END_SENTINEL_SCROLL_MARGIN_STREAMING_ISLAND_CLASS

  return (
    <div
      className="gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 gba:bg-background"
      data-testid="fabric-conversation-panel"
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:pt-12 sm:gba:pt-16 ${WORKSPACE_CHAT_GUTTER_CLASS} ${bottomPaddingClass}`}
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

          <div ref={endRef} className={endSentinelMarginClass} aria-hidden />
        </div>
      </div>

      {composer}
    </div>
  )
}
