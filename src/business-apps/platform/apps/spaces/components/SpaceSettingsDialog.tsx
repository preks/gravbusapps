/**
 * SpaceSettingsDialog - Edit space name, description, visibility; owner can delete space
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
  Switch,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@newwork/nw-design-system'
import { Globe, Lock, Loader2, Trash2 } from 'lucide-react'
import type { Space, UpdateSpaceInput } from '../types/space.types'

export interface SpaceSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  space: Space | null
  onSave: (input: UpdateSpaceInput) => Promise<void>
  /** When true, shows delete space (owner only in parent) */
  isOwner?: boolean
  onDeleteSpace?: () => Promise<boolean>
  'data-testid'?: string
}

export const SpaceSettingsDialog: React.FC<SpaceSettingsDialogProps> = ({
  open,
  onOpenChange,
  space,
  onSave,
  isOwner = false,
  onDeleteSpace,
  'data-testid': testId = 'space-settings-dialog'
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open && space) {
      setName(space.name ?? '')
      setDescription(space.description ?? '')
      setIsPublic(space.isPublic ?? false)
    }
    if (!open) setDeleteAlertOpen(false)
  }, [open, space])

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && !isLoading && !isDeleting) {
        onOpenChange(false)
      }
    },
    [onOpenChange, isLoading, isDeleting]
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

  const handleConfirmDelete = useCallback(async () => {
    if (!onDeleteSpace) return
    setIsDeleting(true)
    try {
      const ok = await onDeleteSpace()
      if (ok) {
        setDeleteAlertOpen(false)
        onOpenChange(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }, [onDeleteSpace, onOpenChange])

  return (
    <>
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

            {isOwner && onDeleteSpace && (
              <div className="gba:pt-4 gba:border-t gba:border-border gba:space-y-3">
                <div>
                  <p className="gba:text-sm gba:font-medium gba:text-destructive">Danger zone</p>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    Delete this space permanently. Documents, notes, boards, and slides stay in your library but are no
                    longer linked to this space. Only the space owner can delete.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="gba:w-full"
                  type="button"
                  onClick={() => setDeleteAlertOpen(true)}
                  disabled={isLoading}
                  data-testid={`${testId}-delete-open-button`}
                >
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                  Delete space
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent data-testid={`${testId}-delete-alert`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this space?</AlertDialogTitle>
            <AlertDialogDescription>
              {space?.name ? (
                <>
                  &quot;{space.name}&quot; will be removed for everyone. Content you added stays in Every Office; it is
                  only unlinked from this space.
                </>
              ) : (
                'This space will be removed for everyone. Your content stays in Every Office; it is only unlinked from this space.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => void handleConfirmDelete()}
              className="gba:bg-destructive gba:text-destructive-foreground hover:gba:bg-destructive/90"
              data-testid={`${testId}-delete-confirm`}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="gba:w-4 gba:h-4 gba:mr-2 gba:animate-spin gba:inline" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="gba:w-4 gba:h-4 gba:mr-2 gba:inline" /> Delete space
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default SpaceSettingsDialog
