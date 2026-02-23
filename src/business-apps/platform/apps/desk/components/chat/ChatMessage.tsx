import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, useTranslation } from '@newwork/nw-design-system'
import { User } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../../types/chat.types'
import { SourceCitation } from './SourceCitation'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown'
import deskTranslations from '../../_i18n'

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
  const { t } = useTranslation(deskTranslations)
  const isUser = message.role === 'user'
  const showAnsweringPlaceholder = isStreaming && !message.content.trim()
  const assistantContent = showAnsweringPlaceholder ? '' : message.content

  // User message - bubble style aligned right
  if (isUser) {
    return (
      <div className="gba:flex gba:gap-3 gba:justify-end" data-testid="chat-message-user">
        <div className="gba:flex gba:flex-col gba:items-end gba:max-w-[80%]">
          <div className="gba:px-4 gba:py-2.5 gba:rounded-2xl gba:rounded-br-sm gba:bg-primary gba:text-primary-foreground">
            <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
        <Avatar className="gba:w-7 gba:h-7 gba:flex-shrink-0">
          {userAvatarSrc ? <AvatarImage src={userAvatarSrc} alt={userName || t('chat-you')} /> : null}
          <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs gba:font-medium">
            {(userName || t('chat-you'))
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(s => s[0]?.toUpperCase())
              .join('') || <User className="gba:h-3.5 gba:w-3.5" />}
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  // Assistant message - clean left-aligned response
  return (
    <div className="gba:flex gba:flex-col gba:gap-1 gba:w-full" data-testid="chat-message-assistant">
      {showAnsweringPlaceholder ? (
        <div className="gba:flex gba:items-center gba:gap-2 gba:px-1 gba:py-2" data-testid="chat-answering-placeholder">
          <div className="gba:flex gba:gap-1">
            <span className="gba:w-1.5 gba:h-1.5 gba:bg-primary gba:rounded-full gba:animate-bounce" />
            <span className="gba:w-1.5 gba:h-1.5 gba:bg-primary gba:rounded-full gba:animate-bounce gba:[animation-delay:150ms]" />
            <span className="gba:w-1.5 gba:h-1.5 gba:bg-primary gba:rounded-full gba:animate-bounce gba:[animation-delay:300ms]" />
          </div>
          <span className="gba:text-sm gba:text-muted-foreground">{t('chat-thinking')}</span>
        </div>
      ) : (
        <div className="gba:max-w-none gba:overflow-x-auto gba:overflow-y-visible">
          <MarkdownWithChipsRenderer
            content={assistantContent}
            accessToken={accessToken}
            variant="chat"
            renderHttpLinksAsChips={true}
            className="gba:text-foreground gba:text-sm gba:leading-relaxed [&_table]:gba:w-full [&_table]:gba:border-collapse [&_td]:gba:align-top [&_td]:gba:py-3 [&_td]:gba:pr-4 [&_td]:gba:border-b [&_td]:gba:border-border/30 [&_th]:gba:text-left [&_th]:gba:py-2 [&_th]:gba:pr-4 [&_th]:gba:border-b [&_th]:gba:border-border/50 [&_p]:gba:my-0 [&_td_p]:gba:my-0"
            data-testid="chat-assistant-markdown"
          />
        </div>
      )}

      {message.sources && message.sources.length > 0 && <SourceCitation sources={message.sources} />}

      {isStreaming && !showAnsweringPlaceholder && (
        <div className="gba:flex gba:items-center gba:gap-1.5 gba:mt-1">
          <div className="gba:w-1.5 gba:h-1.5 gba:bg-primary gba:rounded-full gba:animate-pulse" />
          <span className="gba:text-xs gba:text-muted-foreground">{t('chat-generating')}</span>
        </div>
      )}
    </div>
  )
}
