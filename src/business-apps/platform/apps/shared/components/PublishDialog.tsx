/**
 * PublishDialog Component
 *
 * Dialog for publishing documents/notes/spreadsheets with options.
 */

import React, { useState } from 'react'
import {
  Dialog,
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

export interface PublishDialogProps {
  isOpen: boolean
  onClose: () => void
  onPublish: (publishNotes?: string, createCheckpoint?: boolean) => Promise<void>
  isPublishing?: boolean
  entityType: 'document' | 'note' | 'spreadsheet'
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
  'data-testid': testId = 'publish-dialog'
}) => {
  const [publishNotes, setPublishNotes] = useState('')
  const [createCheckpoint, setCreateCheckpoint] = useState(true)

  const entityLabel = entityType === 'spreadsheet' ? 'spreadsheet app' : entityType

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
            Publish {entityLabel.charAt(0).toUpperCase() + entityLabel.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <Alert variant="info">
            <AlertCircle className="gba:h-4 gba:w-4" />
            <p className="gba:text-sm">
              Publishing will make this {entityLabel} publicly available and mark it as final.
            </p>
          </Alert>

          <div className="gba:space-y-2">
            <Label htmlFor="publish-notes">Publishing Notes (Optional)</Label>
            <Textarea
              id="publish-notes"
              placeholder={`e.g., Final version ready for distribution, Approved by team`}
              value={publishNotes}
              onChange={e => setPublishNotes(e.target.value)}
              disabled={isPublishing}
              rows={3}
              data-testid="publish-notes-textarea"
            />
            <p className="gba:text-sm gba:text-muted-foreground">
              Add notes about this publication for future reference.
            </p>
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
              Create version checkpoint when publishing
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isPublishing} data-testid="publish-cancel-button">
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing} data-testid="publish-confirm-button">
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
