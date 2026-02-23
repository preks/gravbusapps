/**
 * PublishDialog Component
 *
 * Dialog for publishing documents/notes/spreadsheets with options.
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
  Label,
  Textarea,
  Alert,
  Checkbox
} from '@newwork/nw-design-system'
import { CheckCircle, AlertCircle } from 'lucide-react'
import sharedTranslations from '../_i18n'

export interface PublishDialogMessages {
  title?: string
  info?: string
  notesLabel?: string
  notesPlaceholder?: string
  notesHint?: string
  createCheckpoint?: string
  cancel?: string
  publishing?: string
  publish?: string
}

export interface PublishDialogProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (publishNotes?: string, createCheckpoint?: boolean) => Promise<void>
  isPublishing?: boolean
  entityType: 'document' | 'note' | 'spreadsheet'
  messages?: PublishDialogMessages
  'data-testid'?: string
}

/**
 * Dialog for publishing content
 */
export const PublishDialog: React.FC<PublishDialogProps> = ({
  isOpen,
  onClose,
  onPublish,
  isPublishing = false,
  entityType,
  messages: messagesProp,
  'data-testid': testId = 'publish-dialog'
}) => {
  const { t } = useTranslation(sharedTranslations)
  const entityLabel =
    entityType === 'spreadsheet'
      ? t('publish-dialog-entity-spreadsheet')
      : entityType === 'note'
        ? t('publish-dialog-entity-note')
        : t('publish-dialog-entity-document')
  const defaultMessages = {
    title: t('publish-dialog-title', { entityType: entityLabel }),
    info: t('publish-dialog-info', { entityType: entityLabel }),
    notesLabel: t('publish-dialog-notes-label'),
    notesPlaceholder: t('publish-dialog-notes-placeholder'),
    notesHint: t('publish-dialog-notes-hint'),
    createCheckpoint: t('publish-dialog-create-checkpoint'),
    cancel: t('publish-dialog-cancel'),
    publishing: t('publish-dialog-publishing'),
    publish: t('publish-dialog-publish')
  }
  const messages = { ...defaultMessages, ...(messagesProp || {}) }
  const [publishNotes, setPublishNotes] = useState('')
  const [createCheckpoint, setCreateCheckpoint] = useState(true)

  const handlePublish = async () => {
    await onPublish(publishNotes || undefined, createCheckpoint)
    setPublishNotes('')
    onClose()
  }

  const handleCancel = () => {
    setPublishNotes('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <CheckCircle className="gba:h-5 gba:w-5" />
            {messages.title}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <Alert variant="info">
            <AlertCircle className="gba:h-4 gba:w-4" />
            <p className="gba:text-sm">{messages.info}</p>
          </Alert>

          <div className="gba:space-y-2">
            <Label htmlFor="publish-notes">{messages.notesLabel}</Label>
            <Textarea
              id="publish-notes"
              placeholder={messages.notesPlaceholder}
              value={publishNotes}
              onChange={e => setPublishNotes(e.target.value)}
              disabled={isPublishing}
              rows={3}
              data-testid="publish-notes-textarea"
            />
            <p className="gba:text-sm gba:text-muted-foreground">{messages.notesHint}</p>
          </div>

          <div className="gba:flex gba:items-center gba:space-x-2">
            <Checkbox
              id="create-checkpoint"
              checked={createCheckpoint}
              onCheckedChange={checked => setCreateCheckpoint(checked as boolean)}
              disabled={isPublishing}
              data-testid="create-checkpoint-checkbox"
            />
            <Label htmlFor="create-checkpoint" className="gba:text-sm gba:font-normal gba:cursor-pointer">
              {messages.createCheckpoint}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPublishing} data-testid="publish-cancel-button">
            {messages.cancel}
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} data-testid="publish-confirm-button">
            {isPublishing ? messages.publishing : messages.publish}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
