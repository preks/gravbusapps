import React, { useEffect, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import { Paperclip, Download, Loader2 } from 'lucide-react'
import { getInitials, formatFullDate, formatFileSize } from '../../utils/emailDisplayUtils'
import type { EmailMessage } from '../../types'

interface EmailReaderSingleMessageViewProps {
  message: EmailMessage
  senderAvatar?: string | null
  downloadingAttId: string | null
  onDownloadAttachment: (messageId: string, attachmentId: string) => Promise<void>
  t: (key: string, vars?: Record<string, string | number>) => string
  testId: string
}

export const EmailReaderSingleMessageView: React.FC<EmailReaderSingleMessageViewProps> = ({
  message,
  senderAvatar,
  downloadingAttId,
  onDownloadAttachment,
  t,
  testId
}) => {
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current && message.htmlBody) {
      bodyRef.current.innerHTML = message.htmlBody
    }
  }, [message.htmlBody])

  const from = message.fromAddress
  const toNames = message.toAddresses.map(a => a.name || a.address).join(', ')
  const hasAnyAttachments = (message.attachments?.length ?? 0) > 0 || message.hasAttachments
  const nonInlineAttachments = (message.attachments || []).filter(a => !a.isInline)

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

      {hasAnyAttachments && (
        <div className="gba:mt-6 gba:pt-4 gba:border-t">
          <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
            <Paperclip className="gba:w-4 gba:h-4" />
            {nonInlineAttachments.length > 0
              ? t('reader-attachments-count', { count: nonInlineAttachments.length })
              : t('reader-attachments')}
          </h3>
          {nonInlineAttachments.length > 0 ? (
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              {nonInlineAttachments.map(att => (
                <button
                  key={att.id}
                  onClick={() => void onDownloadAttachment(message.id, att.id)}
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
            <p className="gba:text-xs gba:text-muted-foreground gba:italic">{t('reader-attachments-syncing')}</p>
          )}
        </div>
      )}
    </>
  )
}
