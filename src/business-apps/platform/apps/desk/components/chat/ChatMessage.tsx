import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { User, Bot } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../../types/chat.types'
import { SourceCitation } from './SourceCitation'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user'

  return (
    <div
      className={`gba:flex gba:gap-3 ${isUser ? 'gba:justify-end' : 'gba:justify-start'}`}
      data-testid={`chat-message-${message.role}`}
    >
      {!isUser && (
        <div className="gba:flex-shrink-0 gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:flex gba:items-center gba:justify-center">
          <Bot className="gba:h-5 gba:w-5" />
        </div>
      )}

      <div className={`gba:max-w-[80%] ${isUser ? 'gba:flex gba:flex-col gba:items-end' : ''}`}>
        <Card className={`gba:p-3 ${isUser ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-card'}`}>
          <p className="gba:text-sm gba:whitespace-pre-wrap">{message.content}</p>
        </Card>

        {!isUser && message.sources && message.sources.length > 0 && <SourceCitation sources={message.sources} />}

        {isStreaming && <span className="gba:text-xs gba:text-muted-foreground gba:mt-1">Typing...</span>}
      </div>

      {isUser && (
        <div className="gba:flex-shrink-0 gba:w-8 gba:h-8 gba:rounded-full gba:bg-accent gba:text-accent-foreground gba:flex gba:items-center gba:justify-center">
          <User className="gba:h-5 gba:w-5" />
        </div>
      )}
    </div>
  )
}
