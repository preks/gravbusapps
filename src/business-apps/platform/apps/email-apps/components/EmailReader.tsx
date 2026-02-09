/**
 * EmailReader - Displays the full content of a selected email message.
 * Shows headers, body, attachments with download, and action buttons.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { Reply, ReplyAll, Forward, Trash2, Star, Paperclip, Download, Archive, Mail, Loader2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailMessage, ComposeMode } from '../types'

interface EmailReaderProps {
  message: EmailMessage | null
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  'data-testid'?: string
}

function getInitials(name?: string, email?: string): string {
  const str = name || email || '?'
  return str
    .split(/[\s@.]/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const EmailReader: React.FC<EmailReaderProps> = ({
  message,
  onCompose,
  onDelete,
  onToggleStar,
  onArchive,
  'data-testid': testId = 'email-reader'
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)

  // Safely render HTML body in an isolated div
  useEffect(() => {
    if (bodyRef.current && message?.htmlBody) {
      bodyRef.current.innerHTML = message.htmlBody
    }
  }, [message?.htmlBody])

  const handleDownloadAttachment = useCallback(async (messageId: string, attachmentId: string) => {
    setDownloadingAttId(attachmentId)
    try {
      const { url, filename } = await EmailApiService.downloadAttachment(messageId, attachmentId)
      // Trigger browser download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download attachment')
    } finally {
      setDownloadingAttId(null)
    }
  }, [])

  if (!message) {
    return (
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-muted-foreground"
        data-testid={testId}
      >
        <Mail className="gba:w-16 gba:h-16 gba:mb-4 gba:opacity-20" />
        <p className="gba:text-lg">Select an email to read</p>
        <p className="gba:text-sm gba:mt-1">Choose from the list on the left</p>
      </div>
    )
  }

  const from = message.fromAddress
  const toNames = message.toAddresses.map(a => a.name || a.address).join(', ')

  return (
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:overflow-hidden" data-testid={testId}>
      {/* Toolbar */}
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
            <TooltipContent>Reply</TooltipContent>
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
            <TooltipContent>Reply all</TooltipContent>
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
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>

          <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onArchive(message.id)}>
                <Archive className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onDelete(message.id)} data-testid={`${testId}-delete`}>
                <Trash2 className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onToggleStar(message.id)}>
                <Star className={`gba:w-4 gba:h-4 ${message.isStarred ? 'gba:fill-current gba:text-warning' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{message.isStarred ? 'Unstar' : 'Star'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Email content */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:p-6">
        {/* Subject */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:flex-1">
            {message.subject || '(no subject)'}
          </h2>
          {message.importance === 'high' && (
            <Badge variant="destructive" className="gba:flex-shrink-0">
              Important
            </Badge>
          )}
        </div>

        {/* Sender info */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-6 gba:pb-4 gba:border-b">
          <Avatar className="gba:w-10 gba:h-10">
            <AvatarFallback className="gba:bg-primary/10 gba:text-primary gba:text-sm">
              {getInitials(from.name, from.address)}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex-1 gba:min-w-0">
            <div className="gba:flex gba:items-center gba:justify-between">
              <span className="gba:font-medium gba:text-foreground">{from.name || from.address}</span>
              <span className="gba:text-xs gba:text-muted-foreground">{formatFullDate(message.date)}</span>
            </div>
            <p className="gba:text-xs gba:text-muted-foreground">
              To: {toNames}
              {message.ccAddresses.length > 0 &&
                ` | CC: ${message.ccAddresses.map(a => a.name || a.address).join(', ')}`}
            </p>
          </div>
        </div>

        {/* Body */}
        {message.htmlBody ? (
          <div
            ref={bodyRef}
            className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground"
            data-testid={`${testId}-body`}
          />
        ) : (
          <div className="gba:whitespace-pre-wrap gba:text-sm gba:text-foreground" data-testid={`${testId}-body`}>
            {message.textBody || '(empty)'}
          </div>
        )}

        {/* Attachments with download */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="gba:mt-6 gba:pt-4 gba:border-t">
            <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
              <Paperclip className="gba:w-4 gba:h-4" />
              Attachments ({message.attachments.length})
            </h3>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {message.attachments
                .filter(a => !a.isInline)
                .map(att => (
                  <button
                    key={att.id}
                    onClick={() => handleDownloadAttachment(message.id, att.id)}
                    disabled={downloadingAttId === att.id}
                    className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:bg-muted/30 hover:gba:bg-muted/50 gba:cursor-pointer gba:transition-colors disabled:gba:opacity-50"
                    data-testid={`${testId}-attachment-${att.id}`}
                  >
                    <Paperclip className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                    <div className="gba:text-left">
                      <p className="gba:text-xs gba:font-medium gba:text-foreground">{att.filename}</p>
                      <p className="gba:text-[10px] gba:text-muted-foreground">{formatFileSize(att.size)}</p>
                    </div>
                    {downloadingAttId === att.id ? (
                      <Loader2 className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:animate-spin" />
                    ) : (
                      <Download className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
