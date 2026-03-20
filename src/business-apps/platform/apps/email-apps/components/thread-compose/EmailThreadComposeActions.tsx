import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Paperclip } from 'lucide-react'
import translations from '../../_i18n'

interface EmailThreadComposeActionsProps {
  isSending: boolean
  onSend: () => void
  onSaveDraft: () => void
  onDiscard: () => void
  onAttachFile: () => void
  'data-testid'?: string
}

export const EmailThreadComposeActions: React.FC<EmailThreadComposeActionsProps> = ({
  isSending,
  onSend,
  onSaveDraft,
  onDiscard,
  onAttachFile,
  'data-testid': testId = 'email-thread-compose-actions'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:border-t gba:pt-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button size="sm" onClick={onSend} disabled={isSending} data-testid={`${testId}-send`}>
          {isSending ? t('composer-sending') : t('composer-send')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSaveDraft} data-testid={`${testId}-save-draft`}>
          {t('composer-save-draft')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} data-testid={`${testId}-discard`}>
          {t('thread-compose-discard')}
        </Button>
      </div>

      <Button variant="ghost" size="icon" onClick={onAttachFile} data-testid={`${testId}-attach`}>
        <Paperclip className="gba:w-4 gba:h-4" />
      </Button>
    </div>
  )
}
