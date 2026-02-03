/**
 * ChatMessage - Individual message bubble in conversation
 * Supports user and assistant messages with metadata
 */

import React from 'react'
import { cn } from '@newwork/nw-design-system'
import { User, Bot, Loader2, CheckCircle2 } from 'lucide-react'

export interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  metadata?: {
    componentCount?: number
    complexity?: string
    status?: 'analyzing' | 'planning' | 'building' | 'complete' | 'error'
  }
  'data-testid'?: string
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  role,
  content,
  timestamp,
  isStreaming = false,
  metadata,
  'data-testid': testId = 'chat-message'
}) => {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'gba:flex gba:gap-3 gba:mb-4 gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-300',
        isUser ? 'gba:flex-row-reverse' : 'gba:flex-row'
      )}
      data-testid={testId}
      data-message-id={id}
    >
      {/* Avatar */}
      <div
        className={cn(
          'gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:shrink-0 gba:mt-1',
          isUser ? 'gba:bg-foreground gba:text-background' : 'gba:bg-muted gba:text-foreground'
        )}
      >
        {isUser ? <User className="gba:w-4 gba:h-4" /> : <Bot className="gba:w-4 gba:h-4" />}
      </div>

      {/* Message Content */}
      <div className={cn('gba:flex gba:flex-col gba:max-w-[280px]', isUser ? 'gba:items-end' : 'gba:items-start')}>
        {/* Message Bubble */}
        <div
          className={cn(
            'gba:rounded-lg gba:px-4 gba:py-3 gba:text-sm gba:leading-relaxed',
            isUser
              ? 'gba:bg-foreground gba:text-background'
              : 'gba:bg-muted gba:text-foreground gba:border gba:border-border'
          )}
        >
          <p className="gba:whitespace-pre-wrap gba:leading-[1.6]">{content}</p>

          {/* Metadata - Only for assistant messages */}
          {!isUser && metadata && (
            <div className="gba:mt-3 gba:pt-3 gba:border-t gba:border-border/50 gba:space-y-1.5">
              {metadata.componentCount !== undefined && (
                <div className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
                  {metadata.componentCount} component{metadata.componentCount !== 1 ? 's' : ''}
                </div>
              )}
              {metadata.complexity && (
                <div className="gba:text-xs gba:text-muted-foreground gba:capitalize gba:leading-relaxed">
                  {metadata.complexity} complexity
                </div>
              )}
              {metadata.status && (
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground gba:leading-relaxed">
                  {metadata.status === 'analyzing' && <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" />}
                  {metadata.status === 'complete' && <CheckCircle2 className="gba:w-3 gba:h-3" />}
                  <span className="gba:capitalize">{metadata.status}</span>
                </div>
              )}
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="gba:flex gba:gap-1 gba:mt-1">
              <span className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"></span>
              <span
                className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"
                style={{ animationDelay: '0.1s' }}
              ></span>
              <span
                className="gba:w-1 gba:h-1 gba:bg-current gba:rounded-full gba:animate-bounce"
                style={{ animationDelay: '0.2s' }}
              ></span>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="gba:text-xs gba:text-muted-foreground gba:mt-1.5 gba:px-1">
          {isUser ? 'You' : 'AI'} • {timestamp}
        </span>
      </div>
    </div>
  )
}

export default ChatMessage
