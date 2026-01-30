import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Card } from '@newwork/nw-design-system'
import { User, Bot } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../../types/chat.types'
import { SourceCitation } from './SourceCitation'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  userName?: string
  userAvatarSrc?: string
  accessToken?: string
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  userName,
  userAvatarSrc,
  accessToken
}) => {
  const isUser = message.role === 'user'
  const assistantContent = isStreaming && !message.content.trim() ? 'Thinking…' : message.content

  return (
    <div
      className={`gba:flex gba:gap-3 ${isUser ? 'gba:justify-end' : 'gba:justify-start'}`}
      data-testid={`chat-message-${message.role}`}
    >
      {!isUser && (
        <Avatar className="gba:w-8 gba:h-8">
          <AvatarFallback className="gba:bg-primary gba:text-primary-foreground">
            <Bot className="gba:h-4 gba:w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`${isUser ? 'gba:flex gba:flex-col gba:items-end' : ''} gba:max-w-xs gba:sm:max-w-md`}>
        <Card
          className={[
            'gba:p-3 gba:rounded-2xl gba:border gba:border-border/60',
            isUser ? 'gba:bg-primary gba:text-primary-foreground' : 'gba:bg-card/70 gba:backdrop-blur-md'
          ].join(' ')}
        >
          {isUser ? (
            <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap gba:font-sans">{message.content}</p>
          ) : (
            <MarkdownWithChipsRenderer
              content={assistantContent}
              accessToken={accessToken}
              variant="chat"
              renderHttpLinksAsChips={true}
              className="gba:font-sans"
              data-testid="chat-assistant-markdown"
            />
          )}
        </Card>

        {!isUser && message.sources && message.sources.length > 0 && <SourceCitation sources={message.sources} />}

        {isStreaming && <span className="gba:text-xs gba:text-muted-foreground gba:mt-1">Typing...</span>}
      </div>

      {isUser && (
        <Avatar className="gba:w-8 gba:h-8">
          {userAvatarSrc ? <AvatarImage src={userAvatarSrc} alt={userName || 'You'} /> : null}
          <AvatarFallback className="gba:bg-accent gba:text-accent-foreground gba:text-xs gba:font-semibold">
            {(userName || 'You')
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(s => s[0]?.toUpperCase())
              .join('') || <User className="gba:h-4 gba:w-4" />}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
