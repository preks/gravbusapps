import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { getInitials, formatFullDate } from '../../utils/emailDisplayUtils'
import { EmailMessageBody } from '../message/EmailMessageBody'
import { EmailAttachmentsSection } from '../message/EmailAttachmentsSection'
import type { EmailMessage } from '../../types'
import { EmailMessageAiInsights } from './EmailMessageAiInsights'

interface EmailReaderSingleMessageViewProps {
  message: EmailMessage
  senderAvatar?: string | null
  downloadingAttId: string | null
  onDownloadAttachment: (messageId: string, attachmentId: string) => Promise<void>
  accessToken?: string
  initiatorUserId?: string
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

export const EmailReaderSingleMessageView: React.FC<EmailReaderSingleMessageViewProps> = ({
  message,
  senderAvatar,
  downloadingAttId,
  onDownloadAttachment,
  accessToken,
  initiatorUserId,
  t,
  testId
}) => {
  const from = message.fromAddress
  const toNames = message.toAddresses.map(a => a.name || a.address).join(', ')
  const hasAnyAttachments = (message.attachments?.length ?? 0) > 0 || message.hasAttachments

  return (
    <>
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
            {message.ccAddresses.length > 0 && ` | CC: ${message.ccAddresses.map(a => a.name || a.address).join(', ')}`}
          </p>
        </div>
      </div>

      <EmailMessageBody
        messageId={message.id}
        htmlBody={message.htmlBody}
        textBody={message.textBody}
        emptyBodyText={t('reader-empty-body')}
        testId={testId}
      />

      <EmailAttachmentsSection
        attachments={message.attachments}
        hasAttachments={hasAnyAttachments}
        downloadingAttachmentId={downloadingAttId}
        onDownload={attachmentId => void onDownloadAttachment(message.id, attachmentId)}
        countLabel={t('reader-attachments-count', {
          count: (message.attachments || []).filter(a => !a.isInline).length
        })}
        fallbackLabel={t('reader-attachments')}
        syncingLabel={t('reader-attachments-syncing')}
        variant="detailed"
        testIdPrefix={`${testId}-attachment`}
      />

      {accessToken ? (
        <EmailMessageAiInsights
          message={message}
          accessToken={accessToken}
          initiatorUserId={initiatorUserId}
          data-testid={`${testId}-ai-insights`}
        />
      ) : null}
    </>
  )
}
