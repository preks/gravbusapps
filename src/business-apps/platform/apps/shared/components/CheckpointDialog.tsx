/**
 * CheckpointDialog Component
 *
 * Dialog for creating manual version checkpoints with description.
 */

import React, { useState } from 'react'
import {
  Dialog,
  useTranslation,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label
} from '@newwork/nw-design-system'
import { Save } from 'lucide-react'
import sharedTranslations from '../_i18n'

export interface CheckpointDialogMessages {
  title?: string
  descriptionLabel?: string
  placeholder?: string
  hint?: string
  cancel?: string
  saving?: string
  save?: string
}

export interface CheckpointDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (description: string) => Promise<void>
  isSaving?: boolean
  messages?: CheckpointDialogMessages
  'data-testid'?: string
}

/**
 * Dialog for creating a manual checkpoint
 */
export const CheckpointDialog: React.FC<CheckpointDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  messages: messagesProp,
  'data-testid': testId = 'checkpoint-dialog'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const messages = {
    title: t('checkpoint-dialog-title'),
    descriptionLabel: t('checkpoint-dialog-description-label'),
    placeholder: t('checkpoint-dialog-placeholder'),
    hint: t('checkpoint-dialog-hint'),
    cancel: t('checkpoint-dialog-cancel'),
    saving: t('checkpoint-dialog-saving'),
    save: t('checkpoint-dialog-save'),
    ...(messagesProp || {})
  }
  const [description, setDescription] = useState('')

  const handleSave = async () => {
    await onSave(description)
    setDescription('')
    onClose()
  }

  const handleCancel = () => {
    setDescription('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <Save className="gba:h-5 gba:w-5" />
            {messages.title}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="checkpoint-description">{messages.descriptionLabel}</Label>
            <Input
              id="checkpoint-description"
              placeholder={messages.placeholder}
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSaving}
              data-testid="checkpoint-description-input"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
            <p className="gba:text-sm gba:text-muted-foreground">{messages.hint}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving} data-testid="checkpoint-cancel-button">
            {messages.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="checkpoint-save-button">
            {isSaving ? messages.saving : messages.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
