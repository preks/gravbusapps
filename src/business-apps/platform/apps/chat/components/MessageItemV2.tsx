import React from 'react'
import type { Message } from '../types'
import { Avatar } from '@newwork/nw-design-system'

interface MessageItemV2Props {
  message: Message
  currentUserId: string | null
  isGroupChat: boolean
  showSender?: boolean
}

/**
 * Simplified message item component
 *
 * Focuses on:
 * - Clean rendering
 * - Minimal re-renders
 * - Simple styling
 */
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
  ({ message, currentUserId, isGroupChat, showSender = true }) => {
    // OPTIMIZATION: Removed per-message render logging - too verbose for 100+ messages
    // Enable only for debugging: devPerf(() => console.log('[V2 Item] Rendering:', message.id))

    const isOwnMessage = message.senderId === currentUserId
    const sender = message.sender

    return (
      <div
        className={`gba:flex gba:gap-2 gba:px-4 gba:py-2 ${isOwnMessage ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
        data-testid={`message-item-${message.id}`}
      >
        {/* Avatar (only show for other users in group chats) */}
        {!isOwnMessage && isGroupChat && showSender && (
          <div className="gba:flex-shrink-0">
            <Avatar src={sender?.avatarUrl} alt={sender?.displayName || sender?.username || 'User'} size="sm" />
          </div>
        )}

        {/* Message content */}
        <div className={`gba:flex gba:flex-col gba:max-w-[70%] ${isOwnMessage ? 'gba:items-end' : 'gba:items-start'}`}>
          {/* Sender name (for group chats, other users only) */}
          {!isOwnMessage && isGroupChat && showSender && sender && (
            <span className="gba:text-xs gba:text-muted-foreground gba:mb-1">
              {sender.displayName || sender.username || 'Unknown User'}
            </span>
          )}

          {/* Message bubble */}
          <div
            className={`gba:rounded-lg gba:px-3 gba:py-2 gba:break-words ${
              isOwnMessage ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-muted gba:text-foreground'
            }`}
          >
            <p className="gba:text-sm gba:whitespace-pre-wrap">{message.content}</p>
          </div>

          {/* Timestamp */}
          <span className="gba:text-xs gba:text-muted-foreground gba:mt-1">{formatTime(message.createdAt)}</span>
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
      prevProps.currentUserId === nextProps.currentUserId &&
      prevProps.isGroupChat === nextProps.isGroupChat &&
      prevProps.showSender === nextProps.showSender &&
      prevProps.message.senderId === nextProps.message.senderId
    )
  }
)

MessageItemV2.displayName = 'MessageItemV2'
