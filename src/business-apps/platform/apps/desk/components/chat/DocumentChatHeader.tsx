import React from 'react'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { Cpu, History, Plus, Sparkles, Trash2, X } from 'lucide-react'
import type { ChatSession } from '../../types/chat.types'

export interface DocumentChatHeaderProps {
  title?: string
  animateTitle?: boolean
  sessions: ChatSession[]
  isSessionsDisabled: boolean
  onSelectSession: (sessionId: string) => void
  onNewSession: () => void
  onDeleteSession: () => void
  onClose: () => void
  isStreaming: boolean
  showDelete: boolean
  llmProvider?: string
  onLlmProviderChange: (provider?: string) => void
  'data-testid'?: string
}

export const DocumentChatHeader: React.FC<DocumentChatHeaderProps> = ({
  title,
  animateTitle = false,
  sessions,
  isSessionsDisabled,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClose,
  isStreaming,
  showDelete,
  llmProvider,
  onLlmProviderChange,
  'data-testid': testId = 'document-chat-header'
}) => {
  return (
    <div className="gba:relative gba:flex gba:flex-col gba:border-b gba:border-border/50" data-testid={testId}>
      {/* Header background with gradient */}
      <div className="gba:absolute gba:inset-0 gba:bg-gradient-to-b gba:from-primary/8 gba:to-transparent gba:pointer-events-none" />

      {/* Main header content */}
      <div className="gba:relative gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3">
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
          {/* AI Icon with glow effect */}
          <div className="gba:relative gba:flex-shrink-0">
            <div className="gba:absolute gba:inset-0 gba:bg-primary/20 gba:rounded-full gba:blur-md" />
            <div className="gba:relative gba:h-9 gba:w-9 gba:rounded-full gba:bg-gradient-to-br gba:from-primary gba:to-primary/80 gba:flex gba:items-center gba:justify-center">
              <Sparkles className="gba:h-4 gba:w-4 gba:text-primary-foreground" />
            </div>
          </div>

          {/* Title and subtitle */}
          <div className="gba:flex gba:flex-col gba:min-w-0 gba:gap-0.5">
            <h3
              className={[
                'gba:text-sm gba:font-semibold gba:truncate gba:text-foreground',
                animateTitle ? 'gba:animate-pulse' : ''
              ].join(' ')}
            >
              {title || 'Ask your content'}
            </h3>
            <div className="gba:flex gba:items-center gba:gap-1.5">
              <Badge variant="secondary" className="gba:text-[10px] gba:px-1.5 gba:py-0 gba:h-4 gba:font-normal">
                {llmProvider === 'groq' ? 'Fast' : 'Smart'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="gba:flex gba:flex-shrink-0 gba:items-center gba:gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isSessionsDisabled || isStreaming}
                className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-accent/80"
                data-testid="chat-llm-provider-menu-trigger"
              >
                <Cpu className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:w-56" data-testid="chat-llm-provider-menu-content">
              <DropdownMenuLabel className="gba:text-xs">LLM provider</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onLlmProviderChange('openai')}
                data-testid="chat-llm-provider-option-openai"
              >
                Smart {llmProvider !== 'groq' ? '✓' : ''}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLlmProviderChange('groq')} data-testid="chat-llm-provider-option-groq">
                Fast {llmProvider === 'groq' ? '✓' : ''}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isSessionsDisabled}
                className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-accent/80"
                data-testid="chat-session-menu-trigger"
              >
                <History className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:w-72" data-testid="chat-session-menu-content">
              {sessions.length === 0 ? (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground">No sessions yet</div>
              ) : (
                <>
                  <div className="gba:px-3 gba:py-2">
                    <p className="gba:text-xs gba:font-medium gba:text-muted-foreground">Recent chats</p>
                  </div>
                  {sessions.map(s => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => onSelectSession(s.id)}
                      data-testid={`chat-session-option-${s.id}`}
                    >
                      <span className="gba:truncate">{s.title || 'New chat'}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onNewSession}
                    disabled={isStreaming}
                    className="gba:gap-2"
                    data-testid="chat-session-option-new"
                  >
                    <Plus className="gba:h-4 gba:w-4" />
                    New chat
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNewSession}
            disabled={isSessionsDisabled || isStreaming}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-accent/80"
            data-testid="chat-new-session-button"
          >
            <Plus className="gba:h-4 gba:w-4" />
          </Button>

          {showDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteSession}
              disabled={isStreaming}
              className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-destructive/10 gba:hover:text-destructive"
              data-testid="chat-delete-session-button"
            >
              <Trash2 className="gba:h-4 gba:w-4" />
            </Button>
          )}

          <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-accent/80"
            data-testid="chat-close-button"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
