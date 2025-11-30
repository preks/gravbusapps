import React, { useEffect, useRef, useState } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { MessageItem } from './MessageItem'
import { TypingIndicatorComponent } from './TypingIndicator'
import type { Message, TypingIndicator } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface MessageListProps {
  messages: Message[]
  currentUserId: string | null
  isGroupChat: boolean
  typingUsers: TypingIndicator[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  conversationId: string
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isGroupChat,
  typingUsers,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  conversationId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef<number>(0)
  const isInitialLoadRef = useRef<boolean>(true)
  const hasScrolledInitiallyRef = useRef<boolean>(false)
  const prevTypingCountRef = useRef<number>(0)
  const wasAtBottomRef = useRef<boolean>(true)
  const prevFirstMessageIdRef = useRef<string | null>(null)
  const prevLastMessageIdRef = useRef<string | null>(null)
  const isProgrammaticScrollRef = useRef<boolean>(false)
  const lastScrollTopRef = useRef<number>(0)
  const hasUserInteractedRef = useRef<boolean>(false)
  const prevConversationIdRef = useRef<string | null>(null)
  const initialScrollConversationIdRef = useRef<string | null>(null)

  // Keep track of previous messages to prevent flicker when switching conversations
  const [displayMessages, setDisplayMessages] = useState<Message[]>(messages)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Filter typing users for this conversation
  const conversationTypingUsers = typingUsers.filter(t => t.conversationId === conversationId && t.isTyping)

  // Scroll to bottom when messages change or conversation switches
  useEffect(() => {
    const shouldScroll = displayMessages.length > 0 && !isTransitioning && messagesEndRef.current

    if (shouldScroll) {
      // Use requestAnimationFrame to ensure DOM has fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: 'auto',
              block: 'end',
              inline: 'nearest'
            })
          }
        })
      })

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
      }
    }

    prevMessagesLengthRef.current = displayMessages.length
  }, [displayMessages, isTransitioning, conversationId])

  useEffect(() => {
    if (conversationTypingUsers.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversationTypingUsers.length])

  // Update display messages smoothly to prevent flicker
  useEffect(() => {
    // If conversation changed, enter transition state briefly
    if (prevConversationIdRef.current !== null && prevConversationIdRef.current !== conversationId) {
      setIsTransitioning(true)
      // Immediately update to new messages without waiting for loading to complete
      // This prevents the loading spinner from showing
      if (messages.length > 0) {
        setDisplayMessages(messages)
        // End transition quickly once messages are set
        requestAnimationFrame(() => {
          setIsTransitioning(false)
        })
      } else {
        // No messages yet, keep old messages visible briefly
        setTimeout(() => {
          setDisplayMessages([])
          setIsTransitioning(false)
        }, 50)
      }
    } else {
      // Same conversation - update messages normally
      if (messages.length > 0) {
        setDisplayMessages(messages)
        setIsTransitioning(false)
      } else if (!isLoading) {
        setDisplayMessages([])
        setIsTransitioning(false)
      }
    }
  }, [messages, isLoading, conversationId])

  // Reset refs when conversation changes
  useEffect(() => {
    if (prevConversationIdRef.current !== conversationId) {
      isInitialLoadRef.current = true
      hasScrolledInitiallyRef.current = false
      prevMessagesLengthRef.current = 0
      prevTypingCountRef.current = 0
      wasAtBottomRef.current = true
      hasUserInteractedRef.current = false
      lastScrollTopRef.current = 0
      prevFirstMessageIdRef.current = null
      prevLastMessageIdRef.current = null
      prevConversationIdRef.current = conversationId
      initialScrollConversationIdRef.current = null

      // Reset scroll position when conversation changes
      const container = messagesContainerRef.current
      if (container) {
        container.scrollTop = 0
      }
    }
  }, [conversationId])

  // Recurring timestamp update - triggers re-render every minute
  const [, setTimestampUpdate] = useState(0)

  useEffect(() => {
    // Set up interval to update timestamps every minute
    const intervalId = setInterval(() => {
      setTimestampUpdate(prev => prev + 1)
    }, 60000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  // Handle scroll to top for loading more messages
  const handleScroll = () => {
    if (!messagesContainerRef.current || !onLoadMore || isLoading || !hasMore) {
      return
    }

    const container = messagesContainerRef.current
    // Ignore scrolls we caused ourselves or during initial load setup
    if (isProgrammaticScrollRef.current || isInitialLoadRef.current) {
      lastScrollTopRef.current = container.scrollTop
      return
    }

    // Detect user interaction and direction
    const currentTop = container.scrollTop
    const scrollingUp = currentTop < lastScrollTopRef.current
    if (!hasUserInteractedRef.current && lastScrollTopRef.current !== currentTop) {
      hasUserInteractedRef.current = true
    }

    // Require overflow to exist to consider load-more
    const hasOverflow = container.scrollHeight - container.clientHeight > 4

    // Only trigger when truly at top (<=2px), content overflows, user scrolled up, and user interacted
    if (hasOverflow && hasUserInteractedRef.current && scrollingUp && currentTop <= 2) {
      onLoadMore()
    }

    lastScrollTopRef.current = currentTop
  }

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="gba:flex-1 gba:overflow-y-auto gba:min-h-0"
      data-testid="message-list"
    >
      <div
        className={`gba:min-h-full gba:flex gba:flex-col gba:px-3 gba:py-2 gba:transition-opacity gba:duration-150 ${isTransitioning ? 'gba:opacity-50' : 'gba:opacity-100'}`}
      >
        {isLoading && displayMessages.length === 0 ? (
          <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center">
            <Spinner size="sm" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center gba:p-4">
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
            <p className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('chat.noMessages', 'No messages yet. Start the conversation!')}
            </p>
          </div>
        ) : (
          <div className="gba:mt-auto gba:space-y-0.5">
            {hasMore && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-2 gba:mb-2">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="gba:text-xs gba:text-primary gba:hover:text-primary/80 gba:font-medium gba:transition-colors"
                  data-testid="load-more-messages"
                >
                  {isLoading
                    ? getTranslationFromI18nKeyAndLabel('common.loading', 'Loading...')
                    : getTranslationFromI18nKeyAndLabel('chat.loadOlderMessages', 'Load older messages')}
                </button>
              </div>
            )}

            {displayMessages.map(message => (
              <MessageItem key={message.id} message={message} currentUserId={currentUserId} isGroupChat={isGroupChat} />
            ))}

            {conversationTypingUsers.length > 0 && (
              <TypingIndicatorComponent typingUsers={conversationTypingUsers} conversationId={conversationId} />
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
