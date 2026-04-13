import { useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import type { ChatMessage } from '../../types/enterpriseAgent'
import { AgentTypingIndicator } from '../chat/AgentTypingIndicator'
import { MessageBubble } from '../chat/MessageBubble'
import { StreamingAnswerBubble } from '../chat/StreamingAnswerBubble'
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

const SCROLL_THRESHOLD_PX = 100
const SCROLL_FOLLOW_INTERVAL_MS = 50

interface ConversationPanelProps {
  sessionId: string
  messages: ChatMessage[]
  streamingContent: string
  isStreaming: boolean
  isWaitingForInput: boolean
  hasFixedFollowUps?: boolean
  hasStreamingIsland?: boolean
  onReply: (message?: string, structuredInput?: Record<string, any>) => void | Promise<unknown>
  onViewArtifact?: (artifactName: string) => void
  composer?: React.ReactNode
  accessToken?: string
}

const isTranscriptMessage = (message: ChatMessage) =>
  message.type === 'user_input' ||
  message.type === 'expert_call' ||
  message.type === 'final_answer' ||
  message.type === 'structured_input_request' ||
  message.type === 'error'

function useSmartScroll(
  scrollRef: React.RefObject<HTMLDivElement>,
  endRef: React.RefObject<HTMLDivElement>,
  isStreaming: boolean,
  streamingContent: string
) {
  const isUserScrolledRef = useRef(false)
  const lastScrollHeightRef = useRef(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const scrollEl = scrollRef.current
    const endEl = endRef.current
    if (!scrollEl || !endEl) return

    observerRef.current = new IntersectionObserver(
      entries => {
        const [entry] = entries
        isUserScrolledRef.current = !entry.isIntersecting
      },
      {
        root: scrollEl,
        rootMargin: `0px 0px ${SCROLL_THRESHOLD_PX}px 0px`,
        threshold: 0
      }
    )

    observerRef.current.observe(endEl)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [scrollRef, endRef])

  useEffect(() => {
    const scrollEl = scrollRef.current
    if (!scrollEl || !isStreaming) return

    lastScrollHeightRef.current = scrollEl.scrollHeight

    const followContent = () => {
      if (isUserScrolledRef.current) return

      const currentHeight = scrollEl.scrollHeight
      const heightDelta = currentHeight - lastScrollHeightRef.current

      if (heightDelta > 0) {
        scrollEl.scrollBy({
          top: heightDelta,
          behavior: 'smooth'
        })
      }

      lastScrollHeightRef.current = currentHeight
    }

    const intervalId = setInterval(followContent, SCROLL_FOLLOW_INTERVAL_MS)

    return () => clearInterval(intervalId)
  }, [scrollRef, isStreaming, streamingContent])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isUserScrolledRef.current = distanceFromBottom > SCROLL_THRESHOLD_PX
  }, [scrollRef])

  const scrollToBottom = useCallback(
    (immediate = false) => {
      const endEl = endRef.current
      if (!endEl) return
      endEl.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'end' })
      isUserScrolledRef.current = false
    },
    [endRef]
  )

  return { handleScroll, scrollToBottom, isUserScrolledRef }
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  sessionId,
  messages,
  streamingContent,
  isStreaming,
  hasFixedFollowUps = false,
  hasStreamingIsland = false,
  onReply,
  onViewArtifact,
  composer,
  accessToken
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const hadFixedFollowUpsRef = useRef(false)

  const { handleScroll, scrollToBottom, isUserScrolledRef } = useSmartScroll(
    scrollRef,
    endRef,
    isStreaming,
    streamingContent
  )

  const visibleMessages = messages.filter(isTranscriptMessage)

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

    el.scrollTop = el.scrollHeight
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom(true)
      })
    })
  }, [hasFixedFollowUps, scrollToBottom])

  useEffect(() => {
    if (!isUserScrolledRef.current) {
      scrollToBottom()
    }
  }, [visibleMessages.length, hasFixedFollowUps, hasStreamingIsland, scrollToBottom, isUserScrolledRef])

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
              accessToken={accessToken}
            />
          ))}

          {isStreaming &&
            (streamingContent ? (
              <StreamingAnswerBubble content={streamingContent} isStreaming={isStreaming} />
            ) : (
              <AgentTypingIndicator />
            ))}

          <div ref={endRef} className={endSentinelMarginClass} aria-hidden />
        </div>
      </div>

      {composer}
    </div>
  )
}
