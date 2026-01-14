import React, { useEffect, useRef } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { MessageItemV2 } from './MessageItemV2'
import type { Message, ConversationType } from '../types'
import { measureRender, devPerf, startPerformanceTimer } from '../utils/performanceUtils'

interface MessageListV2Props {
  messages: Message[]
  currentUserId: string | null
  conversationType: ConversationType
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
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
export const MessageListV2: React.FC<MessageListV2Props> = React.memo(
  ({ messages, currentUserId, conversationType, isLoading = false, hasMore = false, onLoadMore }) => {
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const prevMessagesLengthRef = useRef(0)
    const isUserScrollingRef = useRef(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout>()
    const renderTimerRef = useRef<ReturnType<typeof startPerformanceTimer> | null>(null)
    const isLoadingMoreRef = useRef(false) // Track if we're already loading to prevent duplicate requests

    const isGroupChat = conversationType === 'group'

    // Track renders
    devPerf(() => {
      measureRender('MessageListV2')
      console.log('[V2 List] Render:', {
        messageCount: messages.length,
        isLoading,
        hasMore,
        conversationType
      })
    })

    // OPTIMIZATION: Auto-scroll to bottom on new messages (if user is near bottom)
    // Only depend on messages.length to minimize re-renders
    useEffect(() => {
      const container = containerRef.current
      if (!container || messages.length === 0) return

      // Start measuring render to display time (only once)
      if (!renderTimerRef.current && messages.length > 0) {
        const timer = startPerformanceTimer('messages-render-to-display')
        if (process.env.NODE_ENV === 'development' && timer) {
          renderTimerRef.current = timer
        }
      }

      // OPTIMIZATION: Only check and scroll if message count actually changed
      const prevCount = prevMessagesLengthRef.current
      const currentCount = messages.length

      if (prevCount === currentCount) {
        return // No change, skip scroll logic
      }

      // Check if user is near bottom (within 100px)
      const threshold = 100
      const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      const isNearBottom = scrollBottom < threshold

      const hasNewMessages = currentCount > prevCount
      const isInitialLoad = prevCount === 0
      const shouldScroll = isInitialLoad || (hasNewMessages && isNearBottom)

      devPerf(() => {
        console.log('[V2 List] Scroll check:', {
          hasNewMessages,
          isInitialLoad,
          shouldScroll,
          prevCount,
          currentCount
        })
      })

      if (shouldScroll && messagesEndRef.current) {
        // OPTIMIZATION: Use requestAnimationFrame for smooth, non-blocking scroll
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: isInitialLoad ? 'auto' : 'smooth',
              block: 'end'
            })
          }
        })

        // End performance measurement on initial load
        if (isInitialLoad && renderTimerRef.current) {
          renderTimerRef.current.endAndLog()
          renderTimerRef.current = null
        }
      }

      prevMessagesLengthRef.current = currentCount
    }, [messages.length]) // OPTIMIZATION: Only re-run when length changes

    // Handle scroll - detect if user is manually scrolling
    const handleScroll = () => {
      // Mark that user is scrolling
      isUserScrollingRef.current = true

      // Clear previous timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }

      // Reset after user stops scrolling (100ms)
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 100)

      // OPTIMIZATION: Load more when scrolled to top
      // Add ref check to prevent duplicate requests
      const container = containerRef.current
      if (container && onLoadMore && hasMore && !isLoading && !isLoadingMoreRef.current) {
        if (container.scrollTop < 50) {
          isLoadingMoreRef.current = true
          devPerf(() => console.log('[V2 List] Loading more messages (scrolled to top)'))
          onLoadMore()

          // Reset after a delay to allow next load
          setTimeout(() => {
            isLoadingMoreRef.current = false
          }, 500)
        }
      }
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
      }
    }, [])

    return (
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:min-h-0"
        data-testid="message-list-v2"
      >
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
        {messages.length === 0 && !isLoading ? (
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
        ) : messages.length === 0 && isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="gba:flex gba:flex-col gba:py-2">
            {messages.map((message, index) => {
              // Show sender name for first message or when sender changes
              const prevMessage = index > 0 ? messages[index - 1] : null
              const showSender = !prevMessage || prevMessage.senderId !== message.senderId

              return (
                <MessageItemV2
                  key={message.id}
                  message={message}
                  currentUserId={currentUserId}
                  isGroupChat={isGroupChat}
                  showSender={showSender}
                />
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // OPTIMIZATION: Custom comparison function for React.memo
    // Only re-render if these specific props actually change

    // Check primitive props
    if (prevProps.currentUserId !== nextProps.currentUserId) return false
    if (prevProps.conversationType !== nextProps.conversationType) return false
    if (prevProps.isLoading !== nextProps.isLoading) return false
    if (prevProps.hasMore !== nextProps.hasMore) return false
    if (prevProps.onLoadMore !== nextProps.onLoadMore) return false

    // Check messages array
    // IMPORTANT: Compare length and first/last message IDs for performance
    // Full array comparison would be expensive for 100+ messages
    if (prevProps.messages.length !== nextProps.messages.length) return false
    if (prevProps.messages.length > 0 && nextProps.messages.length > 0) {
      // Compare first and last message IDs (catches most changes)
      const prevFirst = prevProps.messages[0]?.id
      const nextFirst = nextProps.messages[0]?.id
      const prevLast = prevProps.messages[prevProps.messages.length - 1]?.id
      const nextLast = nextProps.messages[nextProps.messages.length - 1]?.id

      if (prevFirst !== nextFirst || prevLast !== nextLast) return false
    }

    // All props are equal, skip re-render
    return true
  }
)
