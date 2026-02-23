import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { MessageItem } from './MessageItem'
import { TypingIndicator } from './TypingIndicator'
import type {
  Message,
  ConversationType,
  TypingIndicator as TypingIndicatorType,
  ConversationParticipant
} from '../types'
import type { ChatApiClient } from '../services/chatApiClient'
import { useChatTranslation } from '../contexts/TranslationContext'

interface MessageListProps {
  messages: Message[]
  currentUserId: string | null
  conversationType: ConversationType
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  conversationId: string | null
  typingUsers?: TypingIndicatorType[]
  onReplyToAI?: () => void
  accessToken?: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
  participants?: ConversationParticipant[]
  compact?: boolean // Compact mode for in-call chat
  apiClient?: ChatApiClient | null // For transcript/meeting minutes functionality
  onUpdateMessage?: (messageId: string, updates: Partial<Message>) => void
  scrollToMessageId?: string | null
  onScrollToMessageDone?: () => void
  highlightedMessageId?: string | null
  onReplyWithQuote?: (message: Message) => void
  onNavigateToQuotedMessage?: (quotedMessageId: string) => void
}

/**
 * Simplified message list component
 *
 * Key simplifications:
 * - Simple auto-scroll logic
 * - Basic load more at top
 * - No complex scroll position tracking
 * - Clean, minimal rendering
 *
 * OPTIMIZATION: Wrapped in React.memo to prevent unnecessary re-renders
 * when parent component re-renders but props haven't changed
 */
export const MessageList: React.FC<MessageListProps> = React.memo(
  ({
    messages,
    currentUserId,
    conversationType,
    isLoading = false,
    hasMore = false,
    onLoadMore,
    conversationId,
    typingUsers = [],
    onReplyToAI,
    accessToken,
    onSendMessage,
    participants,
    compact = false,
    apiClient = null,
    onUpdateMessage,
    scrollToMessageId,
    onScrollToMessageDone,
    highlightedMessageId,
    onReplyWithQuote,
    onNavigateToQuotedMessage
  }) => {
    // OPTIMIZATION: Call useTranslation once and memoize the result
    const t = useChatTranslation()
    const previewLabel = useMemo(() => t('chat-preview-open'), [t])

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const prevMessagesLengthRef = useRef(0)
    const prevTypingUsersLengthRef = useRef(0)
    const isUserScrollingRef = useRef(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout>()
    const isLoadingMoreRef = useRef(false) // Track if we're already loading to prevent duplicate requests
    const lastScrollTopRef = useRef<number>(0) // Track last scroll position to detect actual movement
    const prevScrollHeightRef = useRef<number>(0) // Track scroll height to preserve position after prepending
    const scrollAdjustmentTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Track scroll adjustment timeout
    const scrollBeforeLoadRef = useRef<number>(0) // CRITICAL: Store scroll position BEFORE load-more triggers
    const lastScrollHeightIncreaseRef = useRef<number>(0) // Track scroll height increase for unseen message detection
    const lastLoadMoreTimeRef = useRef<number>(0) // Track when load-more was last triggered

    // State for "new messages" indicator
    const [hasUnseenMessages, setHasUnseenMessages] = useState(false)
    const [unseenCount, setUnseenCount] = useState(0)

    // OPTIMIZATION: Single timer for all timestamp updates (not 100+ individual timers)
    // Only updates timestamps if we have recent messages (< 1 hour old)
    const [timestampRefreshKey, setTimestampRefreshKey] = useState(0)

    const isGroupChat = conversationType === 'group'

    // Reset unseen messages counter when conversation changes
    useEffect(() => {
      setHasUnseenMessages(false)
      setUnseenCount(0)
      prevMessagesLengthRef.current = 0
      prevScrollHeightRef.current = 0
    }, [conversationId])

    // OPTIMIZATION: Single timer for timestamp updates (efficient approach)
    // Only runs if we have messages less than 24 hours old in current conversation
    useEffect(() => {
      // DEFENSIVE: Filter to current conversation before checking age
      const conversationMessages = messages.filter(m => m.conversationId === conversationId)

      // Check if we have any recent messages (< 24 hours old)
      const hasRecentMessages = conversationMessages.some(m => {
        const age = Date.now() - new Date(m.createdAt).getTime()
        return age < 86400000 // 24 hours
      })

      // Don't start timer if no recent messages
      if (!hasRecentMessages) {
        return
      }

      // Single interval for ALL messages (not 100+ individual timers)
      const interval = setInterval(() => {
        setTimestampRefreshKey(prev => prev + 1)
      }, 60000) // Every 60 seconds

      return () => {
        clearInterval(interval)
      }
    }, [messages.length, conversationId]) // Re-evaluate when messages change

    // OPTIMIZATION: Auto-scroll to bottom on new messages or typing indicator (if user is near bottom)
    useEffect(() => {
      const container = containerRef.current
      if (!container || messages.length === 0) return

      // Check if message count changed
      const prevCount = prevMessagesLengthRef.current
      const currentCount = messages.length
      const messagesChanged = prevCount !== currentCount

      // Check if typing users changed
      const prevTypingCount = prevTypingUsersLengthRef.current
      const currentTypingCount = typingUsers.length
      const typingChanged = prevTypingCount !== currentTypingCount

      // Skip if nothing changed
      if (!messagesChanged && !typingChanged) {
        return
      }

      // CRITICAL: Skip auto-scroll ONLY if we're actively loading (isLoading prop)
      // Don't skip during cooldown period - new messages should still auto-scroll!
      if (isLoading) {
        return
      }

      // Check if user is near bottom (within 100px)
      const threshold = 100
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = scrollBottom < threshold

      const hasNewMessages = currentCount > prevCount
      const isInitialLoad = prevCount === 0

      // Detect if this is a PREPEND (load-more) or APPEND (new message)
      // CRITICAL: Use the scroll height increase stored by useLayoutEffect
      // (calculating it here gives 0 because useLayoutEffect already updated the ref)
      const scrollHeightIncrease = lastScrollHeightIncreaseRef.current
      const isPrepending = scrollHeightIncrease > 1000 // Load-more adds ~1800px, new message adds ~72px

      // Skip auto-scroll if we're prepending messages (let scroll preservation handle it)
      if (isPrepending && isLoadingMoreRef.current) {
        return
      }

      // Check if the latest message is from the current user or is an AI response
      // In these cases, we should auto-scroll even if user was scrolled up
      const latestMessage = messages[messages.length - 1]
      const isOwnMessage = latestMessage?.senderId === currentUserId
      const isAIResponse = latestMessage?.metadata?.isAIResponse === true
      const shouldForceScroll = hasNewMessages && (isOwnMessage || isAIResponse)

      // When user is near bottom and someone starts typing, scroll so typing indicator is visible
      const typingAppeared = typingChanged && currentTypingCount > prevTypingCount

      const shouldScroll =
        isInitialLoad || (hasNewMessages && isNearBottom) || shouldForceScroll || (typingAppeared && isNearBottom)

      // FEATURE: Track unseen messages when user is scrolled up
      // CRITICAL: Only count real new messages, not pagination (load-more)
      // Detection logic:
      // - Large scroll increase (>1000px) = pagination loading old messages → skip
      // - Small scroll increase (>0 and <1000px) = new message arrived → count
      // - No scroll increase (0px) = re-render without new content → skip
      const isRealNewMessage = hasNewMessages && scrollHeightIncrease > 0 && scrollHeightIncrease < 1000

      // Don't count unseen messages if we're force-scrolling (own messages or AI responses)
      if (isRealNewMessage && !isNearBottom && !isInitialLoad && !shouldForceScroll) {
        const newMessageCount = currentCount - prevCount
        setUnseenCount(prev => prev + newMessageCount)
        setHasUnseenMessages(true)
      }

      if (shouldScroll && messagesEndRef.current) {
        // Clear unseen messages indicator when auto-scrolling to bottom
        if (hasUnseenMessages) {
          setHasUnseenMessages(false)
          setUnseenCount(0)
        }

        // OPTIMIZATION: Use requestAnimationFrame for smooth, non-blocking scroll
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: isInitialLoad ? 'auto' : 'smooth',
              block: 'end'
            })

            // CRITICAL: Update scroll tracking after scrolling to bottom
            if (containerRef.current) {
              setTimeout(() => {
                if (containerRef.current) {
                  lastScrollTopRef.current = containerRef.current.scrollTop
                  prevScrollHeightRef.current = containerRef.current.scrollHeight
                }
              }, 100) // Wait for scroll to complete
            }
          }
        })
      }

      prevMessagesLengthRef.current = currentCount
      prevTypingUsersLengthRef.current = currentTypingCount
    }, [messages.length, typingUsers.length]) // Re-run when messages or typing users change

    // CRITICAL: Preserve scroll position after prepending messages (load more)
    // This runs BEFORE auto-scroll to prevent conflicts
    useLayoutEffect(() => {
      const container = containerRef.current
      if (!container || messages.length === 0) return

      const currentScrollHeight = container.scrollHeight
      const prevScrollHeight = prevScrollHeightRef.current
      const currentScrollTop = container.scrollTop

      // CRITICAL: Calculate and store scroll height increase for useEffect to use
      const scrollHeightDiff = currentScrollHeight - prevScrollHeight
      lastScrollHeightIncreaseRef.current = prevScrollHeight > 0 ? scrollHeightDiff : 0

      // CRITICAL: Only preserve scroll for LARGE increases (pagination/load-more)
      // Small increases (<1000px) are new messages - let auto-scroll and unseen logic handle them
      const isAtBottom = currentScrollTop + container.clientHeight >= currentScrollHeight - 100
      const scrollHeightIncreased = prevScrollHeight > 0 && currentScrollHeight > prevScrollHeight
      const isLargeBatchPrepend = scrollHeightDiff > 1000 // Pagination adds ~1800px, new message adds ~72px
      const messagesWerePrepended = scrollHeightIncreased && !isAtBottom && isLargeBatchPrepend

      if (messagesWerePrepended) {
        // Clear any existing timeout
        if (scrollAdjustmentTimeoutRef.current) {
          clearTimeout(scrollAdjustmentTimeoutRef.current)
        }

        // Block scroll events temporarily while adjusting position
        isLoadingMoreRef.current = true

        // CRITICAL: Use the saved scroll position from BEFORE load-more triggered
        // The browser resets scrollTop to ~0 after prepending, so we can't trust container.scrollTop here
        const savedScrollTop = scrollBeforeLoadRef.current
        const newScrollTop = savedScrollTop + scrollHeightDiff

        // Adjust scroll to maintain viewport
        container.scrollTop = newScrollTop
        lastScrollTopRef.current = newScrollTop

        // Re-enable scroll detection after DOM is stable (2 seconds)
        scrollAdjustmentTimeoutRef.current = setTimeout(() => {
          isLoadingMoreRef.current = false
          if (containerRef.current) {
            lastScrollTopRef.current = containerRef.current.scrollTop
          }
        }, 2000) // 2 seconds to ensure DOM is fully settled

        // Reset saved scroll position
        scrollBeforeLoadRef.current = 0
      }

      // Always update prevScrollHeightRef for next comparison
      prevScrollHeightRef.current = currentScrollHeight
    }, [messages.length])

    // Handle scroll - detect if user is manually scrolling
    const handleScroll = () => {
      const container = containerRef.current

      // CRITICAL: Check isLoading PROP (not ref) - V1 pattern
      // This prevents infinite loop while messages are being loaded
      if (!container) {
        return
      }

      // FEATURE: Clear unseen messages indicator when user scrolls to bottom manually
      const threshold = 100
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      const isAtBottom = scrollBottom < threshold

      if (isAtBottom && hasUnseenMessages) {
        setHasUnseenMessages(false)
        setUnseenCount(0)
      }

      // Load more handling
      if (!onLoadMore || isLoading || !hasMore) {
        return
      }

      // Mark that user is scrolling
      isUserScrollingRef.current = true

      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // OPTIMIZATION: Debounce load-more check to prevent excessive triggers
      // Wait 150ms after user stops scrolling before checking if we should load more
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false

        // Check if we should load more after scroll stabilizes
        if (!container || !onLoadMore || isLoading || !hasMore) {
          return
        }

        const scrollTop = container.scrollTop

        // CRITICAL: Prevent load-more cascade after scroll preservation
        // If we just loaded more (within last 3 seconds), don't trigger again
        const timeSinceLastLoad = Date.now() - lastLoadMoreTimeRef.current
        const isRecentlyLoaded = timeSinceLastLoad < 3000

        // Load more if near top (< 200px
        // Also check if not already loading and not recently loaded to prevent cascade
        if (scrollTop < 200 && !isLoadingMoreRef.current && !isRecentlyLoaded) {
          // CRITICAL: Save scroll position BEFORE loading (browser will reset it to 0)
          scrollBeforeLoadRef.current = scrollTop
          prevScrollHeightRef.current = container.scrollHeight

          // Mark as loading to prevent duplicate triggers
          isLoadingMoreRef.current = true
          lastScrollTopRef.current = scrollTop
          lastLoadMoreTimeRef.current = Date.now()

          onLoadMore()
        } else {
          // Update last scroll position for tracking
          lastScrollTopRef.current = scrollTop
        }
      }, 150)
    }

    // Cleanup and reset loading ref when loading state changes
    useEffect(() => {
      if (!isLoading) {
        isLoadingMoreRef.current = false
      }
    }, [isLoading])

    // Cleanup
    useEffect(() => {
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        if (scrollAdjustmentTimeoutRef.current) {
          clearTimeout(scrollAdjustmentTimeoutRef.current)
        }
      }
    }, [])

    // Scroll to a specific message (e.g. from search result or quoted message). Retries once if
    // the element isn't in the DOM yet (e.g. message was just loaded and React hasn't committed).
    useEffect(() => {
      if (!scrollToMessageId || !containerRef.current) return
      const tryScroll = (): (() => void) | null => {
        const el = containerRef.current?.querySelector(`[data-message-id="${scrollToMessageId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          const t = setTimeout(() => onScrollToMessageDone?.(), 500)
          return () => clearTimeout(t)
        }
        return null
      }
      const cleanup = tryScroll()
      if (cleanup) return cleanup
      const retryId = setTimeout(() => {
        const el = containerRef.current?.querySelector(`[data-message-id="${scrollToMessageId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => onScrollToMessageDone?.(), 500)
        } else {
          onScrollToMessageDone?.()
        }
      }, 150)
      return () => clearTimeout(retryId)
    }, [scrollToMessageId, onScrollToMessageDone])

    // Handle click on "new messages" banner
    const handleScrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        setHasUnseenMessages(false)
        setUnseenCount(0)
      }
    }

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:min-h-0 gba:relative"
        data-testid="message-list-v2"
      >
        {/* "New Messages" indicator */}
        {hasUnseenMessages && unseenCount > 0 && (
          <div
            className="gba:fixed gba:bottom-24 gba:left-1/2 gba:-translate-x-1/2 gba:z-[9999]"
            data-testid="new-messages-banner-v2"
            style={{ pointerEvents: 'auto' }}
          >
            <button
              onClick={handleScrollToBottom}
              className="gba:bg-primary gba:text-primary-foreground gba:px-6 gba:py-3 gba:rounded-full gba:shadow-2xl hover:gba:bg-primary/90 gba:transition-all gba:text-sm gba:font-semibold gba:flex gba:items-center gba:gap-2 gba:whitespace-nowrap gba:animate-in gba:fade-in gba:slide-in-from-bottom-4 gba:duration-300"
              data-testid="new-messages-button-v2"
              style={{
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
              }}
            >
              <svg className="gba:w-4 gba:h-4 gba:flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span>
                {unseenCount} new message{unseenCount !== 1 ? 's' : ''}
              </span>
            </button>
          </div>
        )}

        {/* Loading indicator at top */}
        {isLoading && messages.length > 0 && (
          <div className="gba:flex gba:justify-center gba:py-2">
            <Spinner size="sm" />
          </div>
        )}

        {/* Load more button */}
        {!isLoading && hasMore && messages.length > 0 && (
          <div className="gba:flex gba:justify-center gba:py-2">
            <button
              onClick={onLoadMore}
              className="gba:text-xs gba:text-primary hover:gba:text-primary/80 gba:font-medium"
              data-testid="load-more-messages-v2"
            >
              Load older messages
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 && !isLoading && typingUsers.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-center gba:p-8">
            <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-3">
              <svg
                className="gba:w-6 gba:h-6 gba:text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="gba:text-sm gba:text-muted-foreground">No messages yet</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Start the conversation!</p>
          </div>
        ) : (
          (() => {
            if (messages.length === 0 && isLoading) {
              return (
                <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
                  <Spinner size="md" />
                </div>
              )
            }

            return (
              <div className="gba:flex gba:flex-col gba:py-2">
                {(() => {
                  // DEFENSIVE: Filter messages to only show those matching current conversation
                  // Prevents race conditions when switching conversations quickly
                  const filteredByConversation = messages.filter(m => m.conversationId === conversationId)
                  // DEFENSIVE: Dedupe by id so React keys are unique (avoids "two children with the same key")
                  const seenIds = new Set<string>()
                  const filteredMessages = filteredByConversation.filter(m => {
                    if (seenIds.has(m.id)) return false
                    seenIds.add(m.id)
                    return true
                  })

                  return filteredMessages.map((message, index) => {
                    // Show sender name for first message or when sender changes
                    const prevMessage = index > 0 ? filteredMessages[index - 1] : null
                    const showSender = !prevMessage || prevMessage.senderId !== message.senderId

                    // Compute if AI message was initiated by current user (for backward compatibility)
                    let aiInitiatedByCurrentUser: boolean | undefined
                    if (message.metadata?.isAIResponse || message.metadata?.isEveryExpertResponse) {
                      // Primary: use explicit initiatedBy field (new messages)
                      if (message.metadata?.initiatedBy !== undefined) {
                        aiInitiatedByCurrentUser = message.metadata.initiatedBy === currentUserId
                      }
                      // Fallback for old messages: CONSERVATIVE approach for privacy
                      // Only use prevMessage fallback in 1:1 direct chats where it's safer
                      // In group chats, default to undefined (MessageItem will hide sensitive data)
                      else if (
                        conversationType === 'direct' &&
                        prevMessage &&
                        !prevMessage.metadata?.isAIResponse &&
                        !prevMessage.metadata?.isEveryExpertResponse
                      ) {
                        // In 1:1 chat, if prev message was from current user, they initiated it
                        aiInitiatedByCurrentUser = prevMessage.senderId === currentUserId
                      }
                      // Default: undefined (MessageItem will hide forms/entities for safety)
                    }

                    const isHighlighted = message.id === highlightedMessageId
                    return (
                      <div
                        key={message.id}
                        data-message-id={message.id}
                        className={
                          isHighlighted
                            ? 'gba:rounded-lg gba:px-1 gba:py-0.5 gba:bg-accent/40 gba:ring-1 gba:ring-accent gba:ring-inset gba:transition-colors gba:duration-300'
                            : undefined
                        }
                      >
                        <MessageItem
                          message={message}
                          currentUserId={currentUserId}
                          isGroupChat={isGroupChat}
                          showSender={showSender}
                          onReplyToAI={message.metadata?.isAIResponse ? onReplyToAI : undefined}
                          accessToken={accessToken}
                          onSendMessage={onSendMessage}
                          participants={participants}
                          previewLabel={previewLabel}
                          timestampRefreshKey={timestampRefreshKey}
                          aiInitiatedByCurrentUser={aiInitiatedByCurrentUser}
                          compact={compact}
                          apiClient={apiClient}
                          onUpdateMessage={onUpdateMessage}
                          onReplyWithQuote={onReplyWithQuote}
                          onNavigateToQuotedMessage={onNavigateToQuotedMessage}
                        />
                      </div>
                    )
                  })
                })()}

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <TypingIndicator typingUsers={typingUsers} conversationId={conversationId} />
                )}

                <div ref={messagesEndRef} />
              </div>
            )
          })()
        )}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // OPTIMIZATION: Efficient comparison for React.memo
    // Check only the props that frequently change and matter for rendering

    // Conversation changed? Always re-render
    if (prevProps.conversationId !== nextProps.conversationId) return false

    // Loading state changed? Re-render
    if (prevProps.isLoading !== nextProps.isLoading) return false

    // Re-render when messages array reference changes (e.g. reaction update, edit)
    // so that in-place updates like reactions are visible without refresh
    if (prevProps.messages !== nextProps.messages) return false

    // OPTIMIZATION: Check messages more efficiently than array reference
    // Instead of comparing array reference, check length + first/last message IDs
    if (prevProps.messages.length !== nextProps.messages.length) return false

    // Check first and last message IDs (cheaper than comparing entire array)
    if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
      const prevFirst = prevProps.messages[0]?.id
      const nextFirst = nextProps.messages[0]?.id
      const prevLast = prevProps.messages[prevProps.messages.length - 1]?.id
      const nextLast = nextProps.messages[nextProps.messages.length - 1]?.id

      if (prevFirst !== nextFirst || prevLast !== nextLast) return false
    }

    // Typing users changed? Check length instead of array reference
    if (prevProps.typingUsers?.length !== nextProps.typingUsers?.length) return false

    // Scroll-to-message request changed
    if (prevProps.scrollToMessageId !== nextProps.scrollToMessageId) return false

    if (prevProps.highlightedMessageId !== nextProps.highlightedMessageId) return false

    // Skip checking: currentUserId, conversationType, hasMore, callbacks, etc.
    // These rarely change and checking them wastes time

    // All important props are equal, skip re-render
    return true
  }
)
