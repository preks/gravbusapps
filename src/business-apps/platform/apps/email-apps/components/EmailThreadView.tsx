/**
 * EmailThreadView - Displays a conversation thread as a list of expandable messages.
 * The most recent message is expanded by default; older messages are collapsed.
 */

import React, { useState, useRef, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Paperclip } from 'lucide-react'
import { EmailThreadSummary } from './EmailThreadSummary'
import { useAttachmentDownload } from '../hooks/useAttachmentDownload'
import { useSenderAvatar } from '../hooks/useSenderAvatar'
import { getInitials, formatCompactDate } from '../utils/emailDisplayUtils'
import { EmailMessageBody } from './message/EmailMessageBody'
import { EmailAttachmentsSection } from './message/EmailAttachmentsSection'
import type { EmailMessage } from '../types'

interface EmailThreadViewProps {
  messages: EmailMessage[]
  accessToken?: string
  /** Reader’s selected message — used for AI suggestion “create” flows */
  primaryMessage?: EmailMessage | null
  'data-testid'?: string
}

/** Single message card in the thread */
const ThreadMessage: React.FC<{
  message: EmailMessage
  isLatest: boolean
  testId: string
  accessToken?: string
  highlight: boolean
  messageCardRef: (el: HTMLDivElement | null) => void
}> = ({ message, isLatest, testId, accessToken, highlight, messageCardRef }) => {
  const { t } = useTranslation(translations)
  const [isExpanded, setIsExpanded] = useState(isLatest)
  const { downloadingAttId, handleDownloadAttachment } = useAttachmentDownload(t)

  const from = message.fromAddress
  const attachmentCount = message.attachments?.filter(a => !a.isInline).length || 0
  const senderAvatar = useSenderAvatar(from?.address, accessToken)

  return (
    <div
      ref={messageCardRef}
      className={`gba:border gba:rounded-lg gba:bg-card gba:transition-shadow gba:duration-300 ${isLatest ? 'gba:border-primary/30' : ''} ${highlight ? 'gba:ring-2 gba:ring-primary/50' : ''}`}
      data-testid={`${testId}-message-${message.id}`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:text-left gba:hover:bg-muted/30 gba:transition-colors gba:rounded-lg"
      >
        {isExpanded ? (
          <ChevronDown className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
        ) : (
          <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
        )}
        <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
          {senderAvatar && <AvatarImage src={senderAvatar} alt={from.name || from.address} />}
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
                {t('reader-latest')}
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

          <EmailMessageBody
            messageId={message.id}
            htmlBody={message.htmlBody}
            textBody={message.textBody}
            emptyBodyText={t('reader-empty-body')}
            testId={`${testId}-message-${message.id}`}
          />

          <EmailAttachmentsSection
            attachments={message.attachments}
            hasAttachments={attachmentCount > 0 || message.hasAttachments}
            downloadingAttachmentId={downloadingAttId}
            onDownload={attachmentId => void handleDownloadAttachment(message.id, attachmentId)}
            countLabel={t('reader-attachments-count', { count: attachmentCount })}
            fallbackLabel={t('reader-attachments')}
            syncingLabel={t('reader-attachments-syncing')}
            variant="compact"
            showTooltip
          />
        </div>
      )}
    </div>
  )
}

export const EmailThreadView: React.FC<EmailThreadViewProps> = ({
  messages,
  accessToken,
  primaryMessage,
  'data-testid': testId = 'email-thread'
}) => {
  const { t } = useTranslation(translations)
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const [flashIndex, setFlashIndex] = useState<number | null>(null)

  const attachMessageRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) {
        messageRefs.current.set(index, el)
      } else {
        messageRefs.current.delete(index)
      }
    },
    []
  )

  const jumpToMessageIndex = useCallback((index: number) => {
    const el = messageRefs.current.get(index)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashIndex(index)
      window.setTimeout(() => setFlashIndex(null), 2000)
    }
  }, [])

  const sorted = [...messages].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const threadId = sorted[0]?.threadId

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      {threadId && sorted.length > 1 && (
        <EmailThreadSummary
          threadId={threadId}
          messageCount={sorted.length}
          accessToken={accessToken}
          primaryMessage={primaryMessage ?? undefined}
          onJumpToMessageIndex={jumpToMessageIndex}
          data-testid={`${testId}-ai-summary`}
        />
      )}

      <p className="gba:text-xs gba:text-muted-foreground gba:px-1">
        {t('reader-thread-messages', { count: sorted.length })}
      </p>
      {sorted.map((msg, idx) => (
        <ThreadMessage
          key={msg.id}
          message={msg}
          isLatest={idx === sorted.length - 1}
          testId={testId}
          accessToken={accessToken}
          highlight={flashIndex === idx}
          messageCardRef={attachMessageRef(idx)}
        />
      ))}
    </div>
  )
}
