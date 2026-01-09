import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { TypingIndicator } from '../types'
import translations from '../_i18n'

interface TypingIndicatorProps {
  typingUsers: TypingIndicator[]
  conversationId: string
}

export const TypingIndicatorComponent: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  const { t } = useTranslation(translations)

  if (typingUsers.length === 0) {
    return null
  }

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      const username = typingUsers[0].username || t('chat-someone')
      return t('chat-isTyping', { user: username })
    } else if (typingUsers.length === 2) {
      const username1 = typingUsers[0].username || t('chat-someone')
      const username2 = typingUsers[1].username || t('chat-someone')
      return t('chat-twoAreTyping', { user1: username1, user2: username2 })
    } else {
      return t('chat-multipleAreTyping', { count: typingUsers.length.toString() })
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
