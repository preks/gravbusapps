import React, { useEffect, useRef, useState } from 'react'
import { Spinner, useTranslation } from '@newwork/nw-design-system'
import { MessageItem } from './MessageItem'
import { TypingIndicatorComponent } from './TypingIndicator'
import type { Message, TypingIndicator, ConversationParticipant } from '../types'
import translations from '../_i18n'

interface MessageListProps {
  messages: Message[]
  currentUserId: string | null
  isGroupChat: boolean
  typingUsers: TypingIndicator[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  conversationId: string
  accessToken?: string
  participants?: ConversationParticipant[]
  onReplyToAI?: () => void
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  isGroupChat,
  typingUsers,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  conversationId,
  accessToken,
  participants,
  onReplyToAI,
  onSendMessage
}) => {
  const { t } = useTranslation(translations)
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

  // Track if this is the first load for a new conversation
  const [isFirstLoad, setIsFirstLoad] = useState(true)

  // Filter messages to only show messages for the current conversation
  // This is a defensive measure to prevent showing wrong conversation's messages
  // in case of race conditions with async API calls
  const filteredMessages = messages.filter(m => m.conversationId === conversationId)

  // Filter typing users for this conversation
  const conversationTypingUsers = typingUsers.filter(t => t.conversationId === conversationId && t.isTyping)

  // Check if user is near bottom of the chat (within 150px)
  const isNearBottom = (): boolean => {
    const container = messagesContainerRef.current
    if (!container) return true
    const threshold = 150
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }

  // Scroll to bottom when messages load or new messages arrive
  useEffect(() => {
    // Only scroll if we have messages and the component is ready
    if (filteredMessages.length > 0 && messagesEndRef.current) {
      const isNewConversation = isInitialLoadRef.current
      const hasNewMessages = filteredMessages.length > prevMessagesLengthRef.current
      const lastMessage = filteredMessages[filteredMessages.length - 1]
      const isOwnNewMessage = hasNewMessages && lastMessage?.senderId === currentUserId

      // Only auto-scroll if:
      // 1. Initial load of conversation
      // 2. OR user was near bottom (they're following the conversation)
      // 3. OR user just sent a message
      const shouldScroll = isNewConversation || isNearBottom() || isOwnNewMessage

      if (shouldScroll) {
        // Use requestAnimationFrame to ensure DOM has fully updated
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: isNewConversation ? 'auto' : 'smooth',
              block: 'end',
              inline: 'nearest'
            })
          }
        })
      }

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false
      }

      // Mark first load as complete once we have messages
      if (isFirstLoad) {
        setIsFirstLoad(false)
      }
    }

    prevMessagesLengthRef.current = filteredMessages.length
  }, [filteredMessages, conversationId, isFirstLoad, currentUserId])

  useEffect(() => {
    // Only auto-scroll for typing indicator if user is near bottom
    if (conversationTypingUsers.length > 0 && messagesEndRef.current && isNearBottom()) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversationTypingUsers.length])

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
      setIsFirstLoad(true)

      // Don't reset scroll position - let it naturally scroll to bottom when messages load
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

  // Show loading when:
  // 1. First load for a new conversation (isFirstLoad)
  // 2. OR when loading with no messages (switching conversations)
  const showLoading = isLoading && filteredMessages.length === 0

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="gba:flex-1 gba:overflow-y-auto gba:min-h-0"
      data-testid="message-list"
    >
      <div className="gba:min-h-full gba:flex gba:flex-col gba:px-3 gba:py-2">
        {showLoading ? (
          <div className="gba:flex-1 gba:flex gba:items-center gba:justify-center">
            <Spinner size="sm" />
          </div>
        ) : filteredMessages.length === 0 && !isLoading ? (
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
            <p className="gba:text-sm gba:text-muted-foreground">{t('chat-noMessages')}</p>
          </div>
        ) : filteredMessages.length > 0 ? (
          <div className="gba:mt-auto gba:space-y-0.5">
            {hasMore && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-2 gba:mb-2">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="gba:text-xs gba:text-primary gba:hover:text-primary/80 gba:font-medium gba:transition-colors"
                  data-testid="load-more-messages"
                >
                  {isLoading ? t('common-loading') : t('chat-loadOlderMessages')}
                </button>
              </div>
            )}

            {filteredMessages.map(message => (
              <MessageItem
                key={message.id}
                message={message}
                currentUserId={currentUserId}
                isGroupChat={isGroupChat}
                accessToken={accessToken}
                participants={participants}
                onReplyToAI={message.metadata?.isAIResponse ? onReplyToAI : undefined}
                onSendMessage={onSendMessage}
              />
            ))}

            {conversationTypingUsers.length > 0 && (
              <TypingIndicatorComponent typingUsers={conversationTypingUsers} conversationId={conversationId} />
            )}

            <div ref={messagesEndRef} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
