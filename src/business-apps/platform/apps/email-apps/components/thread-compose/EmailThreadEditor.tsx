import React, { useMemo, useRef, useState, useEffect } from 'react'
import { Textarea, useTranslation } from '@newwork/nw-design-system'
import { Loader2 } from 'lucide-react'
import type { EmailMessage } from '../../types'
import translations from '../../_i18n'

interface EmailThreadEditorProps {
  subject: string
  onSubjectChange: (value: string) => void
  body: string
  onBodyChange: (value: string) => void
  replyToMessage?: EmailMessage | null
  signatureHtml?: string
  isDragging: boolean
  dragHandlers: {
    onDragOver: (event: React.DragEvent) => void
    onDragLeave: (event: React.DragEvent) => void
    onDrop: (event: React.DragEvent) => void
  }
  afterSubjectSlot?: React.ReactNode
  belowBodySlot?: React.ReactNode
  'data-testid'?: string
}

export const EmailThreadEditor: React.FC<EmailThreadEditorProps> = ({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  replyToMessage,
  signatureHtml,
  isDragging,
  dragHandlers,
  afterSubjectSlot,
  belowBodySlot,
  'data-testid': testId = 'email-thread-editor'
}) => {
  const { t } = useTranslation(translations)
  const [showOriginalMessage, setShowOriginalMessage] = useState(true)
  const signaturePreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (signaturePreviewRef.current) {
      signaturePreviewRef.current.innerHTML = signatureHtml || ''
    }
  }, [signatureHtml])

  const originalMessageText = useMemo(() => {
    if (!replyToMessage) return ''
    return replyToMessage.textBody || ''
  }, [replyToMessage])

  return (
    <div className="gba:space-y-3 gba:relative" data-testid={testId} {...dragHandlers}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-xs gba:text-muted-foreground gba:w-10">{t('composer-subj')}</span>
        <input
          value={subject}
          onChange={event => onSubjectChange(event.target.value)}
          placeholder={t('composer-subject-placeholder')}
          className="gba:flex-1 gba:h-9 gba:text-sm gba:bg-background gba:border gba:rounded-md gba:px-3 gba:outline-none"
          data-testid={`${testId}-subject`}
        />
      </div>

      {afterSubjectSlot}

      <Textarea
        value={body}
        onChange={event => onBodyChange(event.target.value)}
        placeholder={t('composer-body-placeholder')}
        className="gba:min-h-48 gba:text-sm"
        data-testid={`${testId}-body`}
      />

      {belowBodySlot}

      {signatureHtml && (
        <div className="gba:pt-2 gba:border-t gba:border-dashed gba:border-muted-foreground/30">
          <p className="gba:text-[10px] gba:text-muted-foreground gba:mb-1">--</p>
          <div
            ref={signaturePreviewRef}
            className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:pointer-events-none gba:opacity-80"
            data-testid={`${testId}-signature-preview`}
          />
        </div>
      )}

      {replyToMessage && (
        <div className="gba:border gba:rounded-lg gba:bg-muted/30">
          <button
            type="button"
            onClick={() => setShowOriginalMessage(previous => !previous)}
            className="gba:w-full gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2"
            data-testid={`${testId}-toggle-original`}
          >
            <span className="gba:text-xs gba:font-medium">{replyToMessage.subject || t('reader-no-subject')}</span>
            <span className="gba:text-xs gba:text-muted-foreground">{showOriginalMessage ? '▾' : '▸'}</span>
          </button>
          {showOriginalMessage && (
            <div className="gba:px-3 gba:pb-3">
              <p className="gba:text-xs gba:text-muted-foreground gba:mb-2">
                {new Date(replyToMessage.date).toLocaleString()} -{' '}
                {replyToMessage.fromAddress.name || replyToMessage.fromAddress.address}
              </p>
              <pre
                className="gba:text-sm gba:whitespace-pre-wrap gba:break-words gba:text-foreground gba:max-h-40 gba:overflow-y-auto"
                data-testid={`${testId}-original-body`}
              >
                {originalMessageText || t('reader-empty-body')}
              </pre>
            </div>
          )}
        </div>
      )}

      {isDragging && (
        <div className="gba:absolute gba:inset-0 gba:z-10 gba:flex gba:items-center gba:justify-center gba:bg-primary/5 gba:border-2 gba:border-dashed gba:border-primary gba:rounded-lg">
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-primary">
            <Loader2 className="gba:w-4 gba:h-4" />
            <span className="gba:text-sm">{t('composer-drop-files')}</span>
          </div>
        </div>
      )}
    </div>
  )
}
