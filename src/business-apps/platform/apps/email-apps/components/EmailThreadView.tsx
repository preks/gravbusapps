/**
 * EmailThreadView - Displays a conversation thread as a list of expandable messages.
 * The most recent message is expanded by default; older messages are collapsed.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Paperclip, Download, Loader2 } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { getInitials, formatCompactDate, formatFileSize } from '../utils/emailDisplayUtils'
import type { EmailMessage } from '../types'

interface EmailThreadViewProps {
  messages: EmailMessage[]
  'data-testid'?: string
}

/** Single message card in the thread */
const ThreadMessage: React.FC<{
  message: EmailMessage
  isLatest: boolean
  testId: string
}> = ({ message, isLatest, testId }) => {
  const [isExpanded, setIsExpanded] = useState(isLatest)
  const [downloadingAttId, setDownloadingAttId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current && message.htmlBody && isExpanded) {
      bodyRef.current.innerHTML = message.htmlBody
    }
  }, [message.htmlBody, isExpanded])

  const handleDownload = useCallback(
    async (attachmentId: string) => {
      setDownloadingAttId(attachmentId)
      try {
        const { url, filename } = await EmailApiService.downloadAttachment(message.id, attachmentId)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to download')
      } finally {
        setDownloadingAttId(null)
      }
    },
    [message.id]
  )

  const from = message.fromAddress
  const attachmentCount = message.attachments?.filter(a => !a.isInline).length || 0

  return (
    <div
      className={`gba:border gba:rounded-lg gba:bg-card ${isLatest ? 'gba:border-primary/30' : ''}`}
      data-testid={`${testId}-message-${message.id}`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:text-left hover:gba:bg-muted/30 gba:transition-colors gba:rounded-lg"
      >
        {isExpanded ? (
          <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
        ) : (
          <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
        )}
        <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
          <AvatarFallback className="gba:bg-primary/10 gba:text-primary gba:text-xs">
            {getInitials(from.name, from.address)}
          </AvatarFallback>
        </Avatar>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
              {from.name || from.address}
            </span>
            {isLatest && (
              <Badge variant="info" className="gba:text-xs">
                Latest
              </Badge>
            )}
            {attachmentCount > 0 && <Paperclip className="gba:w-3 gba:h-3 gba:text-muted-foreground" />}
          </div>
          {!isExpanded && (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">
              {message.snippet || message.textBody?.slice(0, 100) || ''}
            </p>
          )}
        </div>
        <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
          {formatCompactDate(message.date)}
        </span>
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="gba:px-4 gba:pb-4 gba:pt-1 gba:border-t gba:mx-4">
          {/* To/Cc info */}
          <p className="gba:text-xs gba:text-muted-foreground gba:mb-3 gba:pt-3">
            To: {message.toAddresses.map(a => a.name || a.address).join(', ')}
            {message.ccAddresses.length > 0 && ` | Cc: ${message.ccAddresses.map(a => a.name || a.address).join(', ')}`}
          </p>

          {/* Body */}
          {message.htmlBody ? (
            <div ref={bodyRef} className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground" />
          ) : (
            <div className="gba:whitespace-pre-wrap gba:text-sm gba:text-foreground">
              {message.textBody || '(empty)'}
            </div>
          )}

          {/* Attachments */}
          {(attachmentCount > 0 || message.hasAttachments) && (
            <div className="gba:mt-4 gba:pt-3 gba:border-t">
              <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
                Attachments{attachmentCount > 0 ? ` (${attachmentCount})` : ''}
              </p>
              {attachmentCount > 0 ? (
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {message.attachments
                    ?.filter(a => !a.isInline)
                    .map(att => (
                      <TooltipProvider key={att.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleDownload(att.id)}
                              disabled={downloadingAttId === att.id}
                              className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1.5 gba:rounded gba:border gba:bg-muted/30 hover:gba:bg-muted/50 gba:text-xs disabled:gba:opacity-50"
                            >
                              <Paperclip className="gba:w-3 gba:h-3" />
                              <span className="gba:truncate gba:max-w-32">{att.filename}</span>
                              {downloadingAttId === att.id ? (
                                <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" />
                              ) : (
                                <Download className="gba:w-3 gba:h-3" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {att.filename} ({formatFileSize(att.size)})
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground gba:italic">
                  Attachment details are being synchronized...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const EmailThreadView: React.FC<EmailThreadViewProps> = ({
  messages,
  'data-testid': testId = 'email-thread'
}) => {
  // Sort messages chronologically (oldest first), latest at bottom
  const sorted = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="gba:space-y-2" data-testid={testId}>
      <p className="gba:text-xs gba:text-muted-foreground gba:px-1">
        {sorted.length} message{sorted.length !== 1 ? 's' : ''} in this conversation
      </p>
      {sorted.map((msg, idx) => (
        <ThreadMessage key={msg.id} message={msg} isLatest={idx === sorted.length - 1} testId={testId} />
      ))}
    </div>
  )
}
