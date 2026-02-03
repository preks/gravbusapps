/**
 * CheckpointDialog Component
 *
 * Dialog for creating manual version checkpoints with description.
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label
} from '@newwork/nw-design-system'
import { Save } from 'lucide-react'

export interface CheckpointDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (description: string) => Promise<void>
  isSaving?: boolean
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
  'data-testid': testId = 'checkpoint-dialog'
}) => {
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
            Save Version Checkpoint
          </DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4 gba:py-4">
          <div className="gba:space-y-2">
            <Label htmlFor="checkpoint-description">Description (Optional)</Label>
            <Input
              id="checkpoint-description"
              placeholder="e.g., Added new section, Fixed typos, Major revision"
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
            <p className="gba:text-sm gba:text-muted-foreground">
              Add a description to help you remember what changed in this version.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving} data-testid="checkpoint-cancel-button">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="checkpoint-save-button">
            {isSaving ? 'Saving...' : 'Save Checkpoint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
