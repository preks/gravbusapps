import React from 'react'
import { Card, CardContent } from '@newwork/nw-design-system'
import { navigateTo } from '@/common/utils/navigationUtils'
import type { ChatReferenceData } from '../../types/models'

interface ChatSnippetDisplayProps {
  data: ChatReferenceData
}

interface ParsedMessage {
  sender: string
  text: string
  timestamp: string
}

function parseSenderLine(line: string): ParsedMessage | null {
  if (!line.startsWith('[')) return null

  const closeBracketIndex = line.indexOf(']')
  if (closeBracketIndex < 0) return null

  const timestamp = line.slice(1, closeBracketIndex).trim()
  const rest = line.slice(closeBracketIndex + 1).trimStart()
  const colonIndex = rest.indexOf(':')
  if (colonIndex < 0) return null

  const sender = rest.slice(0, colonIndex).trim()
  if (!sender) return null

  const text = rest.slice(colonIndex + 1).trim()
  return { timestamp, sender, text }
}

function parseSnippetMessages(snippet: string): ParsedMessage[] {
  const lines = snippet.split('\n').filter(l => l.trim())
  const messages: ParsedMessage[] = []

  for (const line of lines) {
    if (line.startsWith('---') || line.startsWith('Conversation:')) continue
    const parsed = parseSenderLine(line)
    if (parsed) messages.push(parsed)
  }

  return messages.slice(0, 4)
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function formatTimestamp(raw: string): string {
  if (!raw) return ''
  try {
    const d = new Date(raw.replace(' ', 'T'))
    if (Number.isNaN(d.getTime())) return raw
    const month = d.toLocaleString('en', { month: 'short' })
    const day = d.getDate()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month} ${day}, ${hours}:${minutes}`
  } catch {
    return raw
  }
}

export const ChatSnippetDisplay: React.FC<ChatSnippetDisplayProps> = ({ data }) => {
  const messages = parseSnippetMessages(data.snippet)

  const handleClick = () => {
    const params = new URLSearchParams()
    params.set('conversationId', data.id)
    if (data.message_id) {
      params.set('messageId', data.message_id)
    }
    params.set('view', 'chat')
    navigateTo(`/platform/chat?${params.toString()}`)
  }

  return (
    <Card
      className="gba:border gba:border-border/40 gba:cursor-pointer hover:gba:border-border hover:gba:shadow-md gba:transition-all gba:overflow-hidden gba:rounded-xl gba:bg-muted/20"
      data-testid="chat-snippet-display"
      onClick={handleClick}
    >
      {/* Widget header bar */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:border-b gba:border-border/30 gba:bg-muted/40">
        <svg
          className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:truncate">
          {data.conversation_type === 'group' ? 'Group conversation' : 'Conversation'}
        </span>
      </div>

      <CardContent className="gba:px-3 gba:py-3">
        <div className="gba:space-y-3">
          {messages.length > 0 ? (
            messages.map(msg => (
              <div key={`${msg.timestamp}-${msg.sender}`} className="gba:flex gba:gap-2 gba:flex-row">
                <div className="gba:flex-shrink-0 gba:w-8 gba:h-8">
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                      {getInitials(msg.sender)}
                    </span>
                  </div>
                </div>

                <div className="gba:flex gba:flex-col gba:items-start gba:max-w-[80%]">
                  <p className="gba:text-xs gba:font-medium gba:text-foreground gba:mb-0.5">{msg.sender}</p>
                  <div className="gba:bg-background gba:text-foreground gba:rounded-lg gba:rounded-tl-sm gba:px-3 gba:py-2 gba:shadow-sm">
                    <p className="gba:text-sm gba:whitespace-pre-wrap gba:line-clamp-3">{msg.text}</p>
                    <p className="gba:text-[11px] gba:text-muted-foreground gba:text-right gba:mt-1">
                      {formatTimestamp(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="gba:bg-background gba:text-foreground gba:rounded-lg gba:px-3 gba:py-2 gba:shadow-sm">
              <p className="gba:text-sm gba:whitespace-pre-wrap gba:line-clamp-3">{data.snippet}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:flex gba:items-center gba:justify-end gba:mt-2 gba:pt-2 gba:border-t gba:border-border/30">
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-primary hover:gba:text-primary/80 gba:transition-colors">
            Open in Chat
            <svg className="gba:h-3 gba:w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatSnippetDisplay
