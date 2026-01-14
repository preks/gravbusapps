import React from 'react'
import type { TypingIndicator } from '../types'

interface TypingIndicatorV2Props {
  typingUsers: TypingIndicator[]
  conversationId: string
}

/**
 * Typing Indicator Component V2
 *
 * Shows who is currently typing in the conversation
 */
export const TypingIndicatorV2: React.FC<TypingIndicatorV2Props> = React.memo(
  ({ typingUsers, conversationId }) => {
    // Filter typing users for this conversation
    const activeTypingUsers = typingUsers.filter(u => u.conversationId === conversationId && u.isTyping)

    if (activeTypingUsers.length === 0) {
      return null
    }

    // Format typing indicator text
    let typingText: string
    if (activeTypingUsers.length === 1) {
      const userName = activeTypingUsers[0].username || 'Someone'
      typingText = `${userName} is typing...`
    } else if (activeTypingUsers.length === 2) {
      const user1 = activeTypingUsers[0].username || 'Someone'
      const user2 = activeTypingUsers[1].username || 'Someone'
      typingText = `${user1} and ${user2} are typing...`
    } else {
      typingText = `${activeTypingUsers.length} people are typing...`
    }

    return (
      <div className="gba:px-4 gba:py-2 gba:flex gba:items-center gba:gap-2" data-testid="typing-indicator-v2">
        <div className="gba:flex gba:gap-1">
          <div
            className="gba:w-2 gba:h-2 gba:bg-muted-foreground gba:rounded-full gba:animate-pulse"
            style={{ animationDelay: '0ms' }}
          />
          <div
            className="gba:w-2 gba:h-2 gba:bg-muted-foreground gba:rounded-full gba:animate-pulse"
            style={{ animationDelay: '150ms' }}
          />
          <div
            className="gba:w-2 gba:h-2 gba:bg-muted-foreground gba:rounded-full gba:animate-pulse"
            style={{ animationDelay: '300ms' }}
          />
        </div>
        <span className="gba:text-xs gba:text-muted-foreground gba:italic">{typingText}</span>
      </div>
    )
  },
  (prev, next) => {
    // Only re-render if typing users changed
    if (prev.typingUsers.length !== next.typingUsers.length) return false
    if (prev.conversationId !== next.conversationId) return false

    // Compare user IDs
    const prevIds = prev.typingUsers
      .map(u => u.userId)
      .sort()
      .join(',')
    const nextIds = next.typingUsers
      .map(u => u.userId)
      .sort()
      .join(',')

    return prevIds === nextIds
  }
)

TypingIndicatorV2.displayName = 'TypingIndicatorV2'
