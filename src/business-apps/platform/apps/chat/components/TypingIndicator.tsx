import React from 'react'
import type { TypingIndicator } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TypingIndicatorProps {
  typingUsers: TypingIndicator[]
  conversationId: string
}

export const TypingIndicatorComponent: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) {
    return null
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const username = typingUsers[0].username || getTranslationFromI18nKeyAndLabel('chat.someone', 'Someone')
      return getTranslationFromI18nKeyAndLabel('chat.isTyping', '{user} is typing').replace('{user}', username)
    } else if (typingUsers.length === 2) {
      const username1 = typingUsers[0].username || getTranslationFromI18nKeyAndLabel('chat.someone', 'Someone')
      const username2 = typingUsers[1].username || getTranslationFromI18nKeyAndLabel('chat.someone', 'someone')
      return getTranslationFromI18nKeyAndLabel('chat.twoAreTyping', '{user1} and {user2} are typing')
        .replace('{user1}', username1)
        .replace('{user2}', username2)
    } else {
      return getTranslationFromI18nKeyAndLabel('chat.multipleAreTyping', '{count} people are typing').replace(
        '{count}',
        typingUsers.length.toString()
      )
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5" data-testid="typing-indicator">
      <div className="gba:flex gba:items-center gba:gap-0.5 gba:bg-muted/50 gba:px-2.5 gba:py-1.5 gba:rounded-full">
        <span className="gba:inline-block gba:w-1.5 gba:h-1.5 gba:bg-muted-foreground/70 gba:rounded-full gba:animate-bounce [animation-delay:0ms]"></span>
        <span className="gba:inline-block gba:w-1.5 gba:h-1.5 gba:bg-muted-foreground/70 gba:rounded-full gba:animate-bounce [animation-delay:150ms]"></span>
        <span className="gba:inline-block gba:w-1.5 gba:h-1.5 gba:bg-muted-foreground/70 gba:rounded-full gba:animate-bounce [animation-delay:300ms]"></span>
      </div>
      <span className="gba:text-xs gba:text-muted-foreground">{getTypingText()}</span>
    </div>
  )
}
