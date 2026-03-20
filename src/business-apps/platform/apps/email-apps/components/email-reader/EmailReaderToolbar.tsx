import React from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { Reply, ReplyAll, Forward, Trash2, Star, Archive, MessageSquare, Undo2 } from 'lucide-react'
import type { EmailMessage, ComposeMode } from '../../types'

interface EmailReaderToolbarProps {
  message: EmailMessage
  threadEnabled: boolean
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onRestore?: (id: string) => void
  isTrashView?: boolean
  onToggleStar: (id: string) => void
  onToggleThreadView?: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

export const EmailReaderToolbar: React.FC<EmailReaderToolbarProps> = ({
  message,
  threadEnabled,
  onCompose,
  onArchive,
  onDelete,
  onRestore,
  isTrashView = false,
  onToggleStar,
  onToggleThreadView,
  t,
  testId
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:bg-card">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCompose('reply', message)}
              data-testid={`${testId}-reply`}
            >
              <Reply className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reader-reply')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCompose('reply-all', message)}
              data-testid={`${testId}-reply-all`}
            >
              <ReplyAll className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reader-reply-all')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCompose('forward', message)}
              data-testid={`${testId}-forward`}
            >
              <Forward className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reader-forward')}</TooltipContent>
        </Tooltip>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onArchive(message.id)}>
              <Archive className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reader-archive')}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onDelete(message.id)} data-testid={`${testId}-delete`}>
              <Trash2 className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('reader-delete')}</TooltipContent>
        </Tooltip>
        {isTrashView && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRestore?.(message.id)}
                disabled={!onRestore}
                data-testid={`${testId}-restore`}
              >
                <Undo2 className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('reader-restore')}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onToggleStar(message.id)}>
              <Star className={`gba:w-4 gba:h-4 ${message.isStarred ? 'gba:fill-current gba:text-warning' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{message.isStarred ? t('reader-unstar') : t('reader-star')}</TooltipContent>
        </Tooltip>

        <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={threadEnabled ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => onToggleThreadView?.()}
              data-testid={`${testId}-thread-toggle`}
            >
              <MessageSquare className="gba:w-4 gba:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{threadEnabled ? t('reader-thread-on') : t('reader-thread-off')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
