import React from 'react'
import {
  Button,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { History, MessageSquare, Plus, Trash2, X } from 'lucide-react'
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
  'data-testid': testId = 'document-chat-header'
}) => {
  return (
    <CardHeader
      className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:border-b gba:border-border gba:bg-transparent gba:px-4 gba:py-3"
      data-testid={testId}
    >
      <div className="gba:flex gba:flex-col gba:flex-1 gba:gap-0.5 gba:min-w-0">
        <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:text-base gba:leading-tight">
          <MessageSquare className="gba:h-4 gba:w-4 gba:flex-shrink-0" />
          <span className={['gba:truncate', animateTitle ? 'gba:animate-pulse' : ''].join(' ')}>
            {title || 'Ask your content'}
          </span>
        </CardTitle>
        <div className="gba:text-xs gba:text-muted-foreground">Documents · Notes · Sheets</div>
      </div>

      <div className="gba:flex gba:flex-shrink-0 gba:items-center gba:gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSessionsDisabled}
              className="gba:h-8 gba:w-8 gba:p-0"
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
                {sessions.map((s) => (
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
          className="gba:h-8 gba:w-8 gba:p-0"
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
            className="gba:h-8 gba:w-8 gba:p-0"
            data-testid="chat-delete-session-button"
          >
            <Trash2 className="gba:h-4 gba:w-4" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gba:h-8 gba:w-8 gba:p-0 gba:mr-1"
          data-testid="chat-close-button"
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>
    </CardHeader>
  )
}

