/**
 * CreateAgentChatMessage - Individual message bubble for the CREATE agent chat.
 * User messages right-aligned with primary style, assistant messages left-aligned.
 */

import React from 'react'
import { Bot, User, Loader2 } from 'lucide-react'
import type { CreateChatMessage } from '../../types/chat'

interface CreateAgentChatMessageProps {
  message: CreateChatMessage
  isStreaming?: boolean
  testId?: string
}

export const CreateAgentChatMessage: React.FC<CreateAgentChatMessageProps> = ({
  message,
  isStreaming = false,
  testId = 'create-chat-message'
}) => {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="gba:flex gba:justify-center gba:py-2" data-testid={`${testId}-system`}>
        <div className="gba:px-3 gba:py-1.5 gba:rounded-lg gba:bg-muted/60 gba:text-xs gba:text-muted-foreground gba:text-center gba:max-w-[85%]">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`gba:flex gba:gap-2.5 gba:py-2 ${isUser ? 'gba:flex-row-reverse' : 'gba:flex-row'}`}
      data-testid={`${testId}-${message.role}`}
    >
      {/* Avatar */}
      <div
        className={`gba:shrink-0 gba:w-7 gba:h-7 gba:rounded-full gba:flex gba:items-center gba:justify-center ${
          isUser ? 'gba:bg-primary' : 'gba:bg-muted'
        }`}
      >
        {isUser ? (
          <User className="gba:w-3.5 gba:h-3.5 gba:text-primary-foreground" />
        ) : (
          <Bot className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`gba:max-w-[80%] gba:rounded-2xl gba:px-3.5 gba:py-2.5 gba:text-sm gba:leading-relaxed ${
          isUser
            ? 'gba:bg-primary gba:text-primary-foreground gba:rounded-tr-md'
            : 'gba:bg-muted gba:text-foreground gba:rounded-tl-md'
        }`}
      >
        {message.content || (isStreaming && <StreamingDots />)}
        {isStreaming && message.content && <StreamingCursor />}
      </div>
    </div>
  )
}

const StreamingDots: React.FC = () => (
  <div className="gba:flex gba:items-center gba:gap-1 gba:py-1">
    <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:text-muted-foreground" />
    <span className="gba:text-xs gba:text-muted-foreground">Thinking...</span>
  </div>
)

const StreamingCursor: React.FC = () => (
  <span className="gba:inline-block gba:w-1.5 gba:h-4 gba:bg-foreground/60 gba:animate-pulse gba:ml-0.5 gba:align-text-bottom gba:rounded-sm" />
)
