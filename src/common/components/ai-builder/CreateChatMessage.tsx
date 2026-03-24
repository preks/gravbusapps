/**
 * Standardized chat message layout: User (avatar + content) and Assistant (bot icon + content).
 * Content is passed as children so consumers can use MarkdownRenderer or custom render.
 */

import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { Bot } from 'lucide-react'

export interface CreateChatMessageUserProps {
  userAvatar?: string
  userName?: string
  children: React.ReactNode
}

export const CreateChatMessageUser: React.FC<CreateChatMessageUserProps> = ({
  userAvatar,
  userName = 'You',
  children
}) => {
  const initials = userName
    .trim()
    .split(/\s+/)
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="gba:flex gba:gap-2.5 gba:justify-end gba:items-end">
      <div className="gba:max-w-[85%] gba:min-w-0">
        <div className="gba:text-sm gba:leading-relaxed gba:rounded-lg gba:bg-muted gba:px-3 gba:py-2 gba:whitespace-pre-wrap">
          {children}
        </div>
      </div>
      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
        {userAvatar ? <AvatarImage src={userAvatar} alt={userName} /> : null}
        <AvatarFallback className="gba:text-xs">{initials || '?'}</AvatarFallback>
      </Avatar>
    </div>
  )
}

export interface CreateChatMessageAssistantToolCall {
  id?: string
  tool: string
  displayTitle?: string
  displayDetail?: string
  status: 'running' | 'complete'
}

export interface CreateChatMessageAssistantProps {
  toolCalls?: CreateChatMessageAssistantToolCall[]
  children: React.ReactNode
}

export const CreateChatMessageAssistant: React.FC<CreateChatMessageAssistantProps> = ({ toolCalls, children }) => {
  return (
    <div className="gba:flex gba:gap-3 gba:justify-start">
      <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
        <Bot className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
      </div>
      <div className="gba:max-w-[85%] gba:min-w-0">
        {toolCalls && toolCalls.length > 0 ? (
          <div className="gba:space-y-2 gba:mb-2">
            {toolCalls.map((tc, i) => (
              <div
                key={tc.id ?? `${tc.tool}-${i}`}
                className="gba:rounded-lg gba:border gba:border-muted-foreground/20 gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs"
              >
                <span className="gba:font-medium">{tc.displayTitle ?? tc.tool}</span>
                {tc.displayDetail ? (
                  <span className="gba:text-muted-foreground gba:ml-2">{tc.displayDetail}</span>
                ) : null}
                {tc.status === 'running' ? <span className="gba:ml-2 gba:text-primary">...</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="gba:bg-card gba:border gba:rounded-lg gba:px-3 gba:py-2 gba:text-sm gba:leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}
