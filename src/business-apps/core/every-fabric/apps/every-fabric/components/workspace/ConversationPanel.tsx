import { useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import type { ChatMessage, EnterprisePresentationMode, PlanItem } from '../../types/enterpriseAgent'
import { MessageBubble } from '../chat/MessageBubble'
import { StreamingAnswerBubble } from '../chat/StreamingAnswerBubble'
import {
  WORKSPACE_CHAT_GUTTER_CLASS,
  WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS,
  WORKSPACE_CHAT_RAIL_CLASS,
  WORKSPACE_COMPOSER_OFFSET_CLASS,
  WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS,
  WORKSPACE_END_SENTINEL_SCROLL_MARGIN_DEFAULT_CLASS,
  WORKSPACE_END_SENTINEL_SCROLL_MARGIN_WITH_FOLLOWUPS_CLASS
} from './workspaceLayout.constants'

const SCROLL_THRESHOLD_PX = 100
const SCROLL_FOLLOW_INTERVAL_MS = 50

interface ConversationPanelProps {
  sessionId: string
  messages: ChatMessage[]
  streamingGreeting: string
  streamingContent: string
  streamingThinking: string
  statusHeadline: string | null
  planItems?: PlanItem[]
  activityLines?: readonly string[]
  isStreaming: boolean
  isWaitingForInput: boolean
  hasFixedFollowUps?: boolean
  /**
   * Resolved right-offset utility class (e.g. `WORKSPACE_CHAT_RIGHT_OFFSET_OPEN_CLASS`
   * or the preview variant) when the right workspace panel is open, otherwise
   * an empty string. Applied on an **outer** wrapper around the scroll region
   * so it can't collide with the responsive gutter's `padding-right` in the
   * Tailwind cascade (base utilities are emitted before responsive variants,
   * so a `pr-[...]` on the same element as `sm:px-6` loses at ≥640px).
   */
  chatOffsetClass?: string
  onReply: (message?: string, structuredInput?: Record<string, any>) => void | Promise<unknown>
  onViewArtifact?: (artifactName: string) => void
  composer?: React.ReactNode
  accessToken?: string
  presentationMode?: EnterprisePresentationMode
}

const isTranscriptMessage = (message: ChatMessage) =>
  message.type === 'user_input' ||
  message.type === 'expert_call' ||
  message.type === 'final_answer' ||
  message.type === 'structured_input_request' ||
  message.type === 'human_interrupt' ||
  message.type === 'error'

function useSmartScroll(
  scrollRef: React.RefObject<HTMLDivElement>,
  endRef: React.RefObject<HTMLDivElement>,
  isStreaming: boolean,
  streamingGreeting: string,
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
  }, [scrollRef, isStreaming, streamingGreeting, streamingContent])

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
  streamingGreeting,
  streamingContent,
  streamingThinking,
  statusHeadline,
  planItems,
  activityLines,
  isStreaming,
  hasFixedFollowUps = false,
  chatOffsetClass = '',
  onReply,
  onViewArtifact,
  composer,
  accessToken,
  presentationMode = 'default'
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const hadFixedFollowUpsRef = useRef(false)

  const { handleScroll, scrollToBottom, isUserScrolledRef } = useSmartScroll(
    scrollRef,
    endRef,
    isStreaming,
    streamingGreeting,
    streamingContent
  )

  const visibleMessages = messages.filter(isTranscriptMessage)

  // When streaming, insert the streaming bubble at the end of all messages
  // The streaming bubble represents the CURRENT agent turn, so it should always be last
  const messagesBeforeStreaming = visibleMessages
  const messagesAfterStreaming: ChatMessage[] = []

  // Only show greeting on the very first turn
  // Check if there are any prior human_interrupt (HITL questions) which indicate follow-up context
  const hasHitlQuestions = messages.some(m => m.type === 'human_interrupt' || m.type === 'structured_input_request')
  const hasCompletedResponses = messages.some(m => m.type === 'final_answer' || m.type === 'expert_call')
  const isFollowup = hasHitlQuestions || hasCompletedResponses
  const displayGreeting = isFollowup ? '' : streamingGreeting

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
  }, [visibleMessages.length, hasFixedFollowUps, scrollToBottom, isUserScrolledRef])

  let bottomPaddingClass = WORKSPACE_COMPOSER_OFFSET_CLASS
  if (hasFixedFollowUps) bottomPaddingClass = WORKSPACE_COMPOSER_WITH_FOLLOWUPS_OFFSET_CLASS

  let endSentinelMarginClass = WORKSPACE_END_SENTINEL_SCROLL_MARGIN_DEFAULT_CLASS
  if (hasFixedFollowUps) endSentinelMarginClass = WORKSPACE_END_SENTINEL_SCROLL_MARGIN_WITH_FOLLOWUPS_CLASS

  const hasChatOffset = chatOffsetClass.length > 0

  return (
    <div
      className={`gba:relative gba:flex gba:flex-col gba:flex-1 gba:h-full gba:min-h-0 ${chatOffsetClass} ${WORKSPACE_CHAT_OFFSET_TRANSITION_CLASS}`}
      data-testid="fabric-conversation-panel"
      data-chat-offset={hasChatOffset ? 'true' : 'false'}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ scrollbarWidth: 'none' }}
        className={`gba:flex-1 gba:min-h-0 gba:overflow-y-auto [&::-webkit-scrollbar]:gba:hidden gba:pt-12 sm:gba:pt-16 ${WORKSPACE_CHAT_GUTTER_CLASS} ${bottomPaddingClass}`}
      >
        <div className={`${WORKSPACE_CHAT_RAIL_CLASS} gba:mx-auto gba:space-y-8`}>
          {messagesBeforeStreaming.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              sessionId={sessionId}
              allMessages={messages}
              onReply={onReply}
              onViewArtifact={onViewArtifact}
              accessToken={accessToken}
              presentationMode={msg.presentationMode ?? presentationMode}
            />
          ))}

          {isStreaming ? (
            <StreamingAnswerBubble
              greetingContent={displayGreeting}
              responseContent={streamingContent}
              thinkingContent={streamingThinking}
              isStreaming={isStreaming}
              statusMessage={statusHeadline}
              planItems={planItems ?? []}
              activityLines={activityLines ?? []}
              presentationMode={presentationMode}
            />
          ) : null}

          {messagesAfterStreaming.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              sessionId={sessionId}
              allMessages={messages}
              onReply={onReply}
              onViewArtifact={onViewArtifact}
              accessToken={accessToken}
              presentationMode={msg.presentationMode ?? presentationMode}
            />
          ))}

          <div ref={endRef} className={endSentinelMarginClass} aria-hidden />
        </div>
      </div>

      {composer}
    </div>
  )
}
