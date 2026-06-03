import React, { useState } from 'react'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Archive,
  MessageSquare,
  Undo2,
  Pencil,
  Bot,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import type { EmailMessage, ComposeMode } from '../../types'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { WorkforceInboundDispatchResponse } from '@/common/network/ai/prompt-manager/PromptManagerClient'

interface EmailReaderToolbarProps {
  message: EmailMessage
  threadEnabled: boolean
  mailboxAddress?: string | null
  accessToken?: string
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onEditDraft?: (draftMessage: EmailMessage) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onRestore?: (id: string) => void
  isTrashView?: boolean
  onToggleStar: (id: string) => void
  onToggleThreadView?: () => void
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

// Maps the prompt-manager inbound dispatch response onto toast copy.
function describeInboundDispatchResult(result: WorkforceInboundDispatchResponse, mailbox: string): string {
  if (result.accepted && result.session_id) {
    return `Workforce run started for ${mailbox} (session: ${result.session_id}).`
  }
  if (result.accepted && !result.session_id) {
    return `Trigger matched for ${mailbox}, but the agent did not start a run. ${result.reason ?? ''}`.trim()
  }
  return result.reason ?? 'Workforce dispatch did not accept the email.'
}

export const EmailReaderToolbar: React.FC<EmailReaderToolbarProps> = ({
  message,
  threadEnabled,
  mailboxAddress,
  accessToken,
  onCompose,
  onEditDraft,
  onArchive,
  onDelete,
  onRestore,
  isTrashView = false,
  onToggleStar,
  onToggleThreadView,
  t,
  testId
}) => {
  const [isResending, setIsResending] = useState(false)
  const promptManagerClient = usePromptManagerClient(accessToken ?? '')

  const handleResendToWorkforce = async () => {
    if (isResending) return

    const mailbox = mailboxAddress?.trim()
    if (!mailbox) {
      toast.warning('Workforce re-send skipped', {
        description: 'No mailbox address is available for the active email account.'
      })
      return
    }

    setIsResending(true)
    try {
      const result = await promptManagerClient.dispatchWorkforceInboundEmail({
        to: mailbox,
        from: message.fromAddress?.address ?? '',
        subject: message.subject ?? '',
        body: (message.textBody || message.snippet || '').slice(0, 200_000),
        message_id: message.messageId ?? message.id
      })
      const description = describeInboundDispatchResult(result, mailbox)
      if (result.accepted && result.session_id) {
        toast.success('Sent to Workforce', { description })
      } else {
        toast.warning('Workforce re-send skipped', { description })
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error'
      if (reason.includes('404')) {
        toast.warning('Workforce re-send skipped', {
          description: `No Workforce Agent has an inbound_email trigger for ${mailbox}.`
        })
      } else {
        toast.error('Workforce re-send failed', { description: reason })
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:bg-card">
      <TooltipProvider>
        <div className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-1 gba:overflow-x-auto">
          {message.status === 'draft' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditDraft?.(message)}
                  disabled={!onEditDraft}
                  data-testid={`${testId}-edit-draft`}
                >
                  <Pencil className="gba:w-4 gba:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('reader-edit-draft')}</TooltipContent>
            </Tooltip>
          ) : (
            <>
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
            </>
          )}

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
        </div>

        <Button
          variant="outline"
          size="sm"
          className="gba:ml-2 gba:shrink-0"
          onClick={() => void handleResendToWorkforce()}
          disabled={isResending}
          data-testid={`${testId}-resend-to-workforce`}
        >
          {isResending ? (
            <Loader2 className="gba:mr-2 gba:h-4 gba:w-4 gba:animate-spin" />
          ) : (
            <Bot className="gba:mr-2 gba:h-4 gba:w-4" />
          )}
          Send to Workforce
        </Button>
      </TooltipProvider>
    </div>
  )
}
