/**
 * EmailReader - Displays the full content of a selected email message.
 * Shows headers, body, attachments with download, and action buttons.
 * Supports optional thread/conversation view.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Paperclip,
  Download,
  Archive,
  Mail,
  Loader2,
  MessageSquare
} from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailThreadView } from './EmailThreadView'
import { EmailCrmBooking } from './EmailCrmBooking'
import { useSenderAvatar } from '../hooks/useSenderAvatar'
import { getInitials, formatFullDate, formatFileSize } from '../utils/emailDisplayUtils'
import type { EmailMessage, EmailAccount, ComposeMode } from '../types'

interface EmailReaderProps {
  message: EmailMessage | null
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  accessToken?: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  /** Conversation / thread view toggle (controlled by parent) */
  threadEnabled?: boolean
  onToggleThreadView?: () => void
  'data-testid'?: string
}

export const EmailReader: React.FC<EmailReaderProps> = ({
  message,
  onCompose,
  onDelete,
  onToggleStar,
  onArchive,
  accessToken,
  activeAccount,
  employeeId,
  threadEnabled = false,
  onToggleThreadView,
  'data-testid': testId = 'email-reader'
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const lastThreadIdRef = useRef<string | null>(null)

  const senderAvatar = useSenderAvatar(message?.fromAddress?.address, accessToken)

  const toggleThreadView = useCallback(() => {
    onToggleThreadView?.()
  }, [onToggleThreadView])

  // Fetch thread when enabled and message has a threadId
  useEffect(() => {
    if (!message?.threadId || !threadEnabled) {
      setThreadMessages([])
      lastThreadIdRef.current = null
      return
    }
    // Avoid refetching the same thread
    if (lastThreadIdRef.current === message.threadId) return
    lastThreadIdRef.current = message.threadId
    setThreadMessages([]) // Clear stale thread immediately when switching to different thread

    let cancelled = false
    setIsLoadingThread(true)
    EmailApiService.getThread(message.threadId)
      .then(msgs => {
        if (!cancelled) setThreadMessages(msgs)
      })
      .catch(() => {
        if (!cancelled) setThreadMessages([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingThread(false)
      })

    return () => {
      cancelled = true
    }
  }, [message?.threadId, threadEnabled, message?.id])

  // Safely render HTML body in an isolated div
  useEffect(() => {
    if (bodyRef.current && message?.htmlBody) {
      bodyRef.current.innerHTML = message.htmlBody
    }
  }, [message?.htmlBody])

  const showThread =
    threadEnabled && threadMessages.length > 1 && !!message?.threadId && lastThreadIdRef.current === message.threadId

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
    <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
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

          <div className="gba:w-px gba:h-5 gba:bg-border gba:mx-1" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={threadEnabled ? 'secondary' : 'ghost'}
                size="icon"
                onClick={toggleThreadView}
                data-testid={`${testId}-thread-toggle`}
              >
                <MessageSquare className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{threadEnabled ? 'Conversation view on' : 'Conversation view off'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Email content */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-6">
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

        {/* Thread loading state */}
        {isLoadingThread && threadEnabled && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-4">
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            Loading conversation...
          </div>
        )}

        {/* Thread view OR single-message view */}
        {showThread ? (
          <EmailThreadView messages={threadMessages} accessToken={accessToken} data-testid={`${testId}-thread`} />
        ) : (
          <>
            {/* Sender info */}
            <div className="gba:flex gba:items-start gba:gap-3 gba:mb-6 gba:pb-4 gba:border-b">
              <Avatar className="gba:w-10 gba:h-10">
                {senderAvatar && <AvatarImage src={senderAvatar} alt={from.name || from.address} />}
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
                key={message.id}
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
            {(message.attachments?.length > 0 || message.hasAttachments) &&
              (() => {
                const nonInline = (message.attachments || []).filter(a => !a.isInline)
                return (
                  <div className="gba:mt-6 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
                      <Paperclip className="gba:w-4 gba:h-4" />
                      Attachments{nonInline.length > 0 ? ` (${nonInline.length})` : ''}
                    </h3>
                    {nonInline.length > 0 ? (
                      <div className="gba:flex gba:flex-wrap gba:gap-2">
                        {nonInline.map(att => (
                          <button
                            key={att.id}
                            onClick={() => handleDownloadAttachment(message.id, att.id)}
                            disabled={downloadingAttId === att.id}
                            className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:bg-muted/30 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors gba:disabled:opacity-50"
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
                    ) : (
                      <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                        Attachment details are being synchronized...
                      </p>
                    )}
                  </div>
                )
              })()}
          </>
        )}
      </div>

      {/* CRM Booking Panel */}
      {accessToken && (
        <EmailCrmBooking
          message={message}
          accessToken={accessToken}
          activeAccount={activeAccount}
          employeeId={employeeId}
          data-testid={`${testId}-crm-booking`}
        />
      )}
    </div>
  )
}
