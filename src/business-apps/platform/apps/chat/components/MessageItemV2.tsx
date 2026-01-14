import React from 'react'
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

interface MessageItemV2Props {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  showSender?: boolean
  onReplyToAI?: () => void
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
  ({ message, currentUserId, isGroupChat, showSender = true, onReplyToAI }) => {
    // OPTIMIZATION: Removed per-message render logging - too verbose for 100+ messages
    // Enable only for debugging: devPerf(() => console.log('[V2 Item] Rendering:', message.id))

    const isOwnMessage = message.senderId === currentUserId
    const sender = message.sender
    const isAIResponse = message.metadata?.isAIResponse === true

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
          {/* Sender name (for group chats, other users only) or AI header with reply button */}
          {!isOwnMessage && isGroupChat && showSender && sender && !isAIResponse && (
            <span className="gba:text-xs gba:text-muted-foreground gba:mb-1">
              {sender.displayName || sender.username || 'Unknown User'}
            </span>
          )}

          {/* AI Response header with reply button */}
          {isAIResponse && onReplyToAI && (
            <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:mb-1">
              <span className="gba:text-xs gba:font-semibold gba:text-primary gba:flex gba:items-center gba:gap-1">
                <span>✨</span>
                Every AI
              </span>
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
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`gba:rounded-lg gba:px-3 gba:py-2 gba:break-words ${
              isOwnMessage ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-foreground'
            }`}
          >
            <div className="gba:text-sm gba:whitespace-pre-wrap">
              {renderContentWithReferences(message.content, message.metadata, isOwnMessage)}
            </div>
          </div>

          {/* Timestamp and Status */}
          <div className="gba:flex gba:items-center gba:gap-1 gba:mt-1">
            <span className="gba:text-xs gba:text-muted-foreground">{formatTime(message.createdAt)}</span>
            {/* Status icon (only for own messages) */}
            {isOwnMessage && message.status && (
              <span className="gba:text-xs" title={message.status}>
                {message.status === 'sending' && '⏳'}
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && <span className="gba:text-primary">✓✓</span>}
              </span>
            )}
          </div>
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
      prevProps.onReplyToAI === nextProps.onReplyToAI
    )
  }
)

MessageItemV2.displayName = 'MessageItemV2'
