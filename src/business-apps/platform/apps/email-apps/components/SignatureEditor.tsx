/**
 * SignatureEditor - Inline per-account signature editor.
 * Expands below an account card to edit and save the rich HTML signature.
 */

import React, { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button, useTranslation } from '@newwork/nw-design-system'
import translations from '../_i18n'
import { PenLine, Save, X } from 'lucide-react'
import { EmailApiService } from '../services/EmailApiService'
import { RichSignatureEditor } from './RichSignatureEditor'

interface SignatureEditorProps {
  accountId: string
  currentSignature: string
  onSaved: (newSignature: string) => void
  'data-testid'?: string
}

/** Strip HTML tags for preview text */
function getPreviewText(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  const text = div.textContent || div.innerText || ''
  return text.trim().slice(0, 60)
}

export const SignatureEditor: React.FC<SignatureEditorProps> = ({
  accountId,
  currentSignature,
  onSaved,
  'data-testid': testId = 'signature-editor'
}) => {
  const { t } = useTranslation(translations)
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentSignature)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await EmailApiService.updateAccount(accountId, { signature: value })
      onSaved(value)
      setIsEditing(false)
      toast.success(t('signature-saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('signature-save-failed'))
    } finally {
      setIsSaving(false)
    }
  }, [accountId, value, onSaved, t])

  const handleCancel = useCallback(() => {
    setValue(currentSignature)
    setIsEditing(false)
  }, [currentSignature])

  if (!isEditing) {
    const preview = currentSignature ? getPreviewText(currentSignature) : ''

    return (
      <div className="gba:flex gba:items-center gba:justify-between" data-testid={testId}>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
          <PenLine className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:flex-shrink-0" />
          <span className="gba:text-sm gba:text-foreground">{t('signature-label')}</span>
          {preview ? (
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-48">{preview}...</span>
          ) : (
            <span className="gba:text-xs gba:text-muted-foreground">{t('signature-not-set')}</span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} data-testid={`${testId}-edit`}>
          {currentSignature ? t('signature-edit') : t('signature-add')}
        </Button>
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <PenLine className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('signature-edit-title')}</span>
        <span className="gba:text-xs gba:text-muted-foreground">{t('signature-edit-hint')}</span>
      </div>

      <RichSignatureEditor content={value} onChange={setValue} data-testid={`${testId}-rich-editor`} />

      <div className="gba:flex gba:items-center gba:gap-2 gba:justify-end">
        <Button variant="ghost" size="sm" onClick={handleCancel} data-testid={`${testId}-cancel`}>
          <X className="gba:w-3 gba:h-3 gba:mr-1" />
          {t('signature-cancel')}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
          <Save className="gba:w-3 gba:h-3 gba:mr-1" />
          {isSaving ? t('signature-saving') : t('signature-save')}
        </Button>
      </div>
    </div>
  )
}
