/**
 * EmailReader - Displays the full content of a selected email message.
 * Shows headers, body, attachments with download, and action buttons.
 * Supports optional thread/conversation view.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import {
  Button,
  Badge,
  Input,
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
  MessageSquare,
  Plus,
  X
} from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { EmailThreadView } from './EmailThreadView'
import { EmailCrmBooking } from './EmailCrmBooking'
import { useSenderAvatar } from '../hooks/useSenderAvatar'
import { getInitials, formatFullDate, formatFileSize } from '../utils/emailDisplayUtils'
import { normalizeLabels } from '../utils/labelUtils'
import type { EmailMessage, EmailAccount, ComposeMode } from '../types'

interface EmailReaderProps {
  message: EmailMessage | null
  onCompose: (mode: ComposeMode, replyTo?: EmailMessage) => void
  onDelete: (id: string) => void
  onToggleStar: (id: string) => void
  onArchive: (id: string) => void
  onRefreshMessages?: () => void
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
  onRefreshMessages,
  accessToken,
  activeAccount,
  employeeId,
  threadEnabled = false,
  onToggleThreadView,
  'data-testid': testId = 'email-reader'
}) => {
  const { t } = useTranslation(translations)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([])
  const [isLoadingThread, setIsLoadingThread] = useState(false)
  const [labelsInput, setLabelsInput] = useState('')
  const [localLabels, setLocalLabels] = useState<string[]>([])
  const [isMutatingLabels, setIsMutatingLabels] = useState(false)
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

  useEffect(() => {
    setLocalLabels(normalizeLabels(message?.labels || []))
    setLabelsInput('')
  }, [message?.id, message?.labels])

  const showThread =
    threadEnabled && threadMessages.length > 1 && !!message?.threadId && lastThreadIdRef.current === message.threadId

  const handleAddLabel = useCallback(async () => {
    if (!message || isMutatingLabels) return

    const toAdd = normalizeLabels(labelsInput.split(','))
    if (toAdd.length === 0) return

    const previous = localLabels
    const optimistic = normalizeLabels([...previous, ...toAdd])
    setLocalLabels(optimistic)
    setLabelsInput('')
    setIsMutatingLabels(true)

    try {
      const result = await EmailApiService.addMessageLabels(message.id, toAdd)
      setLocalLabels(normalizeLabels(result.labels || []))
      toast.success(t('reader-labels-add-success'))
      onRefreshMessages?.()
    } catch {
      setLocalLabels(previous)
      toast.error(t('reader-labels-add-failed'))
      onRefreshMessages?.()
    } finally {
      setIsMutatingLabels(false)
    }
  }, [message, labelsInput, localLabels, isMutatingLabels, t, onRefreshMessages])

  const handleRemoveLabel = useCallback(
    async (label: string) => {
      if (!message || isMutatingLabels) return

      const normalized = normalizeLabels([label])
      if (normalized.length === 0) return

      const previous = localLabels
      const optimistic = previous.filter(existing => existing !== normalized[0])
      setLocalLabels(optimistic)
      setIsMutatingLabels(true)

      try {
        const result = await EmailApiService.removeMessageLabels(message.id, normalized)
        setLocalLabels(normalizeLabels(result.labels || []))
        toast.success(t('reader-labels-remove-success'))
        onRefreshMessages?.()
      } catch {
        setLocalLabels(previous)
        toast.error(t('reader-labels-remove-failed'))
        onRefreshMessages?.()
      } finally {
        setIsMutatingLabels(false)
      }
    },
    [message, localLabels, isMutatingLabels, t, onRefreshMessages]
  )

  const handleDownloadAttachment = useCallback(
    async (messageId: string, attachmentId: string) => {
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
        toast.error(err instanceof Error ? err.message : t('reader-toast-download-failed'))
      } finally {
        setDownloadingAttId(null)
      }
    },
    [t]
  )

  if (!message) {
    return (
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-muted-foreground"
        data-testid={testId}
      >
        <Mail className="gba:w-16 gba:h-16 gba:mb-4 gba:opacity-20" />
        <p className="gba:text-lg">{t('reader-select-prompt')}</p>
        <p className="gba:text-sm gba:mt-1">{t('reader-select-hint')}</p>
      </div>
    )
  }

  const from = message.fromAddress
  const toNames = message.toAddresses.map(a => a.name || a.address).join(', ')
  const hasAnyAttachments = (message.attachments?.length ?? 0) > 0 || message.hasAttachments

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
                onClick={toggleThreadView}
                data-testid={`${testId}-thread-toggle`}
              >
                <MessageSquare className="gba:w-4 gba:h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{threadEnabled ? t('reader-thread-on') : t('reader-thread-off')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Email content */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:p-6">
        {/* Subject */}
        <div className="gba:flex gba:items-start gba:gap-3 gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:text-foreground gba:flex-1">
            {message.subject || t('reader-no-subject')}
          </h2>
          {message.importance === 'high' && (
            <Badge variant="destructive" className="gba:flex-shrink-0">
              {t('reader-important')}
            </Badge>
          )}
        </div>

        <div className="gba:mb-4 gba:space-y-2">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1.5">
            <span className="gba:text-xs gba:text-muted-foreground">{t('reader-labels-title')}</span>
            {localLabels.length === 0 && (
              <span className="gba:text-xs gba:text-muted-foreground">{t('reader-labels-empty')}</span>
            )}
            {localLabels.map(label => (
              <span key={`${message.id}-label-${label}`} className="gba:inline-flex gba:items-center gba:gap-1">
                <Badge variant="secondary" className="gba:h-5 gba:text-[10px]">
                  {label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="gba:h-5 gba:w-5"
                  onClick={() => handleRemoveLabel(label)}
                  disabled={isMutatingLabels}
                  data-testid={`${testId}-remove-label-${label}`}
                >
                  <X className="gba:w-3 gba:h-3" />
                </Button>
              </span>
            ))}
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Input
              value={labelsInput}
              onChange={e => setLabelsInput(e.target.value)}
              placeholder={t('reader-labels-input-placeholder')}
              className="gba:h-8"
              data-testid={`${testId}-labels-input`}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddLabel}
              disabled={isMutatingLabels}
              data-testid={`${testId}-labels-add`}
            >
              <Plus className="gba:w-3.5 gba:h-3.5 gba:mr-1" />
              {t('reader-labels-add')}
            </Button>
          </div>
        </div>

        {/* Thread loading state */}
        {isLoadingThread && threadEnabled && (
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-4">
            <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
            {t('reader-loading-thread')}
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
                {message.textBody || t('reader-empty-body')}
              </div>
            )}

            {/* Attachments with download */}
            {hasAnyAttachments &&
              (() => {
                const nonInline = (message.attachments || []).filter(a => !a.isInline)
                return (
                  <div className="gba:mt-6 gba:pt-4 gba:border-t">
                    <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
                      <Paperclip className="gba:w-4 gba:h-4" />
                      {nonInline.length > 0
                        ? t('reader-attachments-count', { count: nonInline.length })
                        : t('reader-attachments')}
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
                        {t('reader-attachments-syncing')}
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
          threadMessages={showThread ? threadMessages : undefined}
          accessToken={accessToken}
          activeAccount={activeAccount}
          employeeId={employeeId}
          data-testid={`${testId}-crm-booking`}
        />
      )}
    </div>
  )
}
