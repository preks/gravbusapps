/**
 * SpaceSettingsDialog - Edit space name, description, and visibility
 *
 * Uses design system Dialog, Input, Textarea, Switch. Only shown to owners/admins.
 */

import React, { useState, useCallback, useEffect } from 'react'
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
import type { Space, UpdateSpaceInput } from '../types/space.types'

export interface SpaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  space: Space | null
  onSave: (input: UpdateSpaceInput) => Promise<void>
  'data-testid'?: string
}

export const SpaceSettingsDialog: React.FC<SpaceSettingsDialogProps> = ({
  open,
  onOpenChange,
  space,
  onSave,
  'data-testid': testId = 'space-settings-dialog'
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && space) {
      setName(space.name ?? '')
      setDescription(space.description ?? '')
      setIsPublic(space.isPublic ?? false)
    }
  }, [open, space])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && !isLoading) {
        onOpenChange(false)
      }
    },
    [onOpenChange, isLoading]
  )

  const handleSave = useCallback(async () => {
    if (!name.trim()) return

    setIsLoading(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic
      })
      onOpenChange(false)
    } finally {
      setIsLoading(false)
    }
  }, [name, description, isPublic, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gba:max-w-md gba:p-0 gba:overflow-hidden" data-testid={testId}>
        <DialogHeader className="gba:p-6 gba:pb-4">
          <DialogTitle className="gba:text-lg gba:font-semibold">Space settings</DialogTitle>
          <DialogDescription className="gba:text-sm gba:text-muted-foreground">
            Change the name, description, and visibility of this space
          </DialogDescription>
        </DialogHeader>

        <div className="gba:px-6 gba:pb-6 gba:space-y-5">
          <div className="gba:space-y-2">
            <Label htmlFor="space-settings-name" className="gba:text-sm gba:font-medium">
              Name
            </Label>
            <Input
              id="space-settings-name"
              placeholder="e.g., Marketing Team"
              value={name}
              onChange={e => setName(e.target.value)}
              className="gba:h-10"
              data-testid={`${testId}-name-input`}
            />
          </div>

          <div className="gba:space-y-2">
            <Label htmlFor="space-settings-description" className="gba:text-sm gba:font-medium">
              Description
              <span className="gba:text-muted-foreground gba:font-normal gba:ml-1">(optional)</span>
            </Label>
            <Textarea
              id="space-settings-description"
              placeholder="What is this space for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="gba:resize-none"
              data-testid={`${testId}-description-input`}
            />
          </div>

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

          <div className="gba:flex gba:gap-3 gba:pt-2">
            <Button
              variant="secondary"
              className="gba:flex-1"
              onClick={() => handleClose(false)}
              disabled={isLoading}
              data-testid={`${testId}-cancel-button`}
            >
              Cancel
            </Button>
            <Button
              className="gba:flex-1"
              onClick={handleSave}
              disabled={!name.trim() || isLoading}
              data-testid={`${testId}-save-button`}
            >
              {isLoading ? <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpaceSettingsDialog
