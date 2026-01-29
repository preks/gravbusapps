import React, { useMemo } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Card } from '@newwork/nw-design-system'
import { User, Bot } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '../../types/chat.types'
import { SourceCitation } from './SourceCitation'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  userName?: string
  userAvatarSrc?: string
}

type FormattedBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

const normalizeText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

const formatAssistantContent = (value: string): FormattedBlock[] => {
  const text = normalizeText(value)
  if (!text) return []

  const lines = text.split('\n')
  const blocks: FormattedBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      paragraph = []
    }
  }

  const flushList = () => {
    if (list.length > 0) {
      blocks.push({ type: 'ul', items: list })
      list = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushList()
      flushParagraph()
      continue
    }

    const isBullet = line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')
    if (isBullet) {
      flushParagraph()
      list.push(line.slice(2).trim())
      continue
    }

    flushList()
    paragraph.push(line)
  }

  flushList()
  flushParagraph()

  return blocks
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isStreaming = false, userName, userAvatarSrc }) => {
  const isUser = message.role === 'user'
  const formattedBlocks = useMemo(
    () => (isUser ? [] : formatAssistantContent(message.content)),
    [isUser, message.content]
  )

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
            <p className="gba:text-sm gba:leading-relaxed gba:whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="gba:text-sm gba:leading-relaxed gba:space-y-2">
              {formattedBlocks.length === 0 ? (
                <p className="gba:whitespace-pre-wrap">
                  {isStreaming && !message.content.trim() ? 'Thinking…' : message.content}
                </p>
              ) : (
                formattedBlocks.map((block, idx) => {
                  if (block.type === 'p') {
                    return (
                      <p key={idx} className="gba:whitespace-pre-wrap">
                        {block.text}
                      </p>
                    )
                  }

                  return (
                    <ul key={idx} className="gba:list-disc gba:pl-5 gba:space-y-1">
                      {block.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="gba:whitespace-pre-wrap">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )
                })
              )}
            </div>
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
