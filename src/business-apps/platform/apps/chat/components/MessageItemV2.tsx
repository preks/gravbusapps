import React, { useState } from 'react'
import type { Message } from '../types'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@newwork/nw-design-system'
import { ArrowBendUpLeft } from '@phosphor-icons/react'
import { renderContentWithReferences } from './EntityReferenceBadge'
import { EveryAIMessageRenderer } from './EveryAIMessageRenderer'
import { ExpertResponseRenderer } from './ExpertResponseRenderer'

interface MessageItemV2Props {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  showSender?: boolean
  onReplyToAI?: () => void
  accessToken?: string
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>
}

/**
 * Simplified message item component
 *
 * Focuses on:
 * - Clean rendering
 * - Minimal re-renders
 * - Simple styling
 */

// Helper to get user initials from name
const getInitials = (name: string): string => {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// OPTIMIZATION: Memoize the time formatting function outside component
const formatTime = (date: Date | string): string => {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  // Show date for older messages
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const MessageItemV2: React.FC<MessageItemV2Props> = React.memo(
  ({ message, currentUserId, isGroupChat, showSender = true, onReplyToAI, accessToken, onSendMessage }) => {
    // OPTIMIZATION: Removed per-message render logging - too verbose for 100+ messages
    // Enable only for debugging: devPerf(() => console.log('[V2 Item] Rendering:', message.id))

    const isAIResponse = message.metadata?.isAIResponse === true
    const isExpertResponse = message.metadata?.isEveryExpertResponse === true
    // AI/Expert responses should never be styled as "own message" even if sent by current user
    const isOwnMessage = message.senderId === currentUserId && !isAIResponse && !isExpertResponse
    const sender = message.sender

    // State for tracking if AI message has hidden cards (form outputs not visible to others)
    const [hasHiddenResultCards, setHasHiddenResultCards] = useState(false)

    // Check if AI message was initiated by current user
    const isAIMessageInitiatedByCurrentUser = message.metadata?.initiatedBy === currentUserId

    // Check if AI message has form outputs
    const hasFormOutputs = message.metadata?.hasFormOutputs === true

    return (
      <div
        className={`gba:flex gba:gap-2 gba:px-4 gba:py-2 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
        data-testid={`message-item-${message.id}`}
      >
        {/* Avatar (only show for other users in group chats) */}
        {!isOwnMessage && isGroupChat && showSender && (
          <div className="gba:flex-shrink-0">
            <Avatar size="sm">
              {sender?.avatarUrl && (
                <AvatarImage src={sender.avatarUrl} alt={sender.displayName || sender.username || 'User'} />
              )}
              <AvatarFallback className="gba:text-xs">
                {getInitials(sender?.displayName || sender?.username || 'User')}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Message content */}
        <div className={`gba:flex gba:flex-col gba:max-w-[70%] ${isOwnMessage ? 'gba:items-end' : 'gba:items-start'}`}>
          {/* Sender name (for group chats, other users only) - but not for AI/Expert responses */}
          {!isOwnMessage && isGroupChat && showSender && sender && !isAIResponse && !isExpertResponse && (
            <span className="gba:text-xs gba:text-muted-foreground gba:mb-1">
              {sender.displayName || sender.username || 'Unknown User'}
            </span>
          )}

          {/* Message bubble - AI and Expert responses get special rendering */}
          {isAIResponse && !isExpertResponse ? (
            <>
              {/* Show special messages for form outputs or hidden cards */}
              {hasFormOutputs && !isAIMessageInitiatedByCurrentUser ? (
                <div className="gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20">
                  <div className="gba:text-sm gba:italic gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                    <span>✨</span>
                    <span>
                      {isGroupChat
                        ? `${sender?.firstName || 'Someone'} is interacting with ${message.metadata?.aiAssistant || 'Every AI'}`
                        : `${message.metadata?.aiAssistant || 'Every AI'} is preparing a form for the other user`}
                    </span>
                  </div>
                </div>
              ) : hasHiddenResultCards ? (
                <div className="gba:max-w-[80%] gba:px-3 gba:py-2 gba:shadow-sm gba:bg-gradient-to-br gba:from-muted gba:to-accent/10 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border gba:border-primary/20">
                  <div className="gba:space-y-2">
                    <div className="gba:text-sm gba:italic gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                      <span>✨</span>
                      <span>
                        {isGroupChat
                          ? `${sender?.firstName || 'Someone'} submitted a request to ${message.metadata?.aiAssistant || 'Every AI'}`
                          : `${message.metadata?.aiAssistant || 'Every AI'} processed a request`}
                      </span>
                    </div>
                    <div className="gba:text-xs gba:italic gba:text-muted-foreground gba:px-2 gba:py-1 gba:bg-muted/30 gba:rounded">
                      💼 Request details are only visible to the person who created them
                    </div>
                  </div>
                </div>
              ) : (
                <EveryAIMessageRenderer
                  message={message}
                  accessToken={accessToken || ''}
                  onSendMessage={onSendMessage}
                  isInitiatedByCurrentUser={isAIMessageInitiatedByCurrentUser}
                  onHasHiddenCards={setHasHiddenResultCards}
                  headerContent={
                    <div className="gba:text-[11px] gba:font-semibold gba:mb-0.5 gba:text-primary gba:flex gba:items-center gba:justify-between">
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <span className="gba:text-xs">✨</span>
                        Every AI
                      </div>
                      {onReplyToAI && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={e => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  onReplyToAI()
                                }}
                                className="gba:h-5 gba:w-5 gba:text-primary/70 hover:gba:text-primary hover:gba:bg-primary/10"
                                data-testid={`reply-to-ai-${message.id}`}
                              >
                                <ArrowBendUpLeft className="gba:w-3.5 gba:h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="gba:text-xs">Reply to AI</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  }
                  footerContent={
                    <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1 gba:text-muted-foreground">
                      <span className="gba:text-[10px]">{formatTime(message.createdAt)}</span>
                    </div>
                  }
                />
              )}
            </>
          ) : (
            <div
              className={`gba:rounded-lg gba:px-3 gba:py-2 gba:break-words ${
                isExpertResponse
                  ? 'gba:bg-gradient-to-br gba:from-muted/50 gba:to-accent/5 gba:text-foreground gba:rounded-2xl gba:rounded-bl-md gba:border-2'
                  : isOwnMessage
                    ? 'gba:bg-primary gba:text-primary-foreground'
                    : 'gba:bg-muted gba:text-foreground'
              }`}
              style={
                isExpertResponse && message.metadata?.expertColor
                  ? { borderColor: message.metadata.expertColor }
                  : undefined
              }
            >
              {/* Text content */}
              {message.content && (
                <div className="gba:text-sm gba:whitespace-pre-wrap">
                  {isExpertResponse ? (
                    <ExpertResponseRenderer
                      content={message.content}
                      expertColor={message.metadata?.expertColor}
                      citations={message.metadata?.citations}
                      confidence={message.metadata?.confidence}
                      accessToken={accessToken}
                    />
                  ) : (
                    renderContentWithReferences(message.content, message.metadata, isOwnMessage)
                  )}
                </div>
              )}

              {/* Timestamp and Status */}
              <div className="gba:flex gba:items-center gba:justify-end gba:gap-1 gba:mt-1">
                <span
                  className={`gba:text-xs ${isOwnMessage ? 'gba:text-primary-foreground gba:opacity-70' : 'gba:text-muted-foreground'}`}
                >
                  {formatTime(message.createdAt)}
                </span>
                {/* Status icon (only for own messages) */}
                {isOwnMessage && message.status && (
                  <span className="gba:text-xs gba:text-primary-foreground gba:opacity-70" title={message.status}>
                    {message.status === 'sending' && '⏳'}
                    {message.status === 'sent' && '✓'}
                    {message.status === 'delivered' && '✓✓'}
                    {message.status === 'read' && <span className="gba:text-primary-foreground">✓✓</span>}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // OPTIMIZATION: Custom comparison function for React.memo
    // Only re-render if these specific props change
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.isGroupChat === nextProps.isGroupChat &&
      prevProps.showSender === nextProps.showSender &&
      prevProps.message.senderId === nextProps.message.senderId &&
      prevProps.onReplyToAI === nextProps.onReplyToAI &&
      prevProps.accessToken === nextProps.accessToken &&
      prevProps.onSendMessage === nextProps.onSendMessage &&
      prevProps.message.metadata?.isAIResponse === nextProps.message.metadata?.isAIResponse &&
      prevProps.message.metadata?.isEveryExpertResponse === nextProps.message.metadata?.isEveryExpertResponse
    )
  }
)

MessageItemV2.displayName = 'MessageItemV2'
