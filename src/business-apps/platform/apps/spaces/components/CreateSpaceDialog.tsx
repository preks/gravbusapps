/**
 * CreateSpaceDialog - Dialog for creating new spaces
 *
 * Clean, minimal form following NEWWORK design system
 */

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
  Textarea,
  Switch
} from '@newwork/nw-design-system'
import { Globe, Lock, Loader2 } from 'lucide-react'
import type { CreateSpaceInput } from '../types/space.types'

export interface CreateSpaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: CreateSpaceInput) => Promise<void>
  'data-testid'?: string
}

export const CreateSpaceDialog: React.FC<CreateSpaceDialogProps> = ({
  open,
  onOpenChange,
  onCreate,
  'data-testid': testId = 'create-space-dialog'
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = useCallback(() => {
    setName('')
    setDescription('')
    setIsPublic(false)
  }, [])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic
      })
      resetForm()
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, description, isPublic, onCreate, resetForm, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden" data-testid={testId}>
        {/* Header */}
        <DialogHeader className="gba:p-6 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">Create Space</DialogTitle>
          <DialogDescription className="gba:text-sm gba:text-muted-foreground">
            Create a workspace to organize your team's content
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="gba:px-6 gba:pb-6 gba:space-y-5">
          {/* Name Input */}
          <div className="gba:space-y-2">
            <Label htmlFor="space-name" className="gba:text-sm gba:font-medium">
              Name
            </Label>
            <Input
              id="space-name"
              placeholder="e.g., Marketing Team"
              value={name}
              onChange={e => setName(e.target.value)}
              className="gba:h-10"
              data-testid={`${testId}-name-input`}
            />
          </div>

          {/* Description Input */}
          <div className="gba:space-y-2">
            <Label htmlFor="space-description" className="gba:text-sm gba:font-medium">
              Description
              <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">(optional)</span>
            </Label>
            <Textarea
              id="space-description"
              placeholder="What is this space for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="gba:resize-none"
              data-testid={`${testId}-description-input`}
            />
          </div>

          {/* Visibility Toggle */}
          <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:rounded-lg gba:bg-card">
            <div className="gba:flex gba:items-center gba:gap-3">
              {isPublic ? (
                <Globe className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
              ) : (
                <Lock className="gba:w-5 gba:h-5 gba:text-muted-foreground" />
              )}
              <div>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">{isPublic ? 'Public' : 'Private'}</p>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {isPublic ? 'Discoverable by organization' : 'Only invited members'}
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} data-testid={`${testId}-public-switch`} />
          </div>

          {/* Actions */}
          <div className="gba:flex gba:gap-3 gba:pt-2">
            <Button variant="secondary" className="gba:flex-1" onClick={() => handleClose(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              className="gba:flex-1"
              onClick={handleCreate}
              disabled={!name.trim() || isLoading}
              data-testid={`${testId}-create-button`}
            >
              {isLoading ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default CreateSpaceDialog
