import React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner
} from '@newwork/nw-design-system'
import { TrashIcon, WarningCircleIcon } from '@phosphor-icons/react'
import type { DeleteAvailability } from '../types/catalogTypes'

interface DeleteConfirmationDialogProps {
  open: boolean
  itemName: string
  itemType: string
  availability?: DeleteAvailability
  isChecking?: boolean
  isDeleting?: boolean
  confirmDescription?: string
  blockedDescription?: string
  confirmDetails?: React.ReactNode
  onCancel: () => void
  onConfirm: () => Promise<void> | void
  dataTestId: string
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  itemName,
  itemType,
  availability = { status: 'allowed' },
  isChecking = false,
  isDeleting = false,
  confirmDescription,
  blockedDescription,
  confirmDetails,
  onCancel,
  onConfirm,
  dataTestId
}) => {
  const isBlocked = availability.status === 'blocked'
  const title = isBlocked ? `Cannot Delete ${itemType}` : `Delete ${itemType}`
  const description =
    blockedDescription && isBlocked
      ? blockedDescription
      : confirmDescription || `Are you sure you want to delete "${itemName}"?`

  const renderCheckingContent = () => (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-muted gba:p-3"
      data-testid={`${dataTestId}-checking`}
    >
      <Spinner size="sm" />
      <span className="gba:text-sm gba:text-muted-foreground">Checking whether this item can be deleted...</span>
    </div>
  )

  const renderBlockedContent = () => {
    if (availability.status !== 'blocked') {
      return null
    }

    return (
      <div
        className="gba:flex gba:gap-3 gba:rounded-lg gba:border gba:border-destructive gba:p-4"
        data-testid={`${dataTestId}-blocked`}
      >
        <WarningCircleIcon className="gba:mt-0.5 gba:h-5 gba:w-5 gba:flex-shrink-0 gba:text-destructive" />
        <div>
          <span className="gba:block gba:font-semibold gba:text-destructive">Deletion blocked</span>
          <span className="gba:mt-1 gba:block gba:text-sm gba:font-medium gba:text-destructive">
            {availability.reason}
          </span>
          {availability.usages && availability.usages.length > 0 && (
            <ul className="gba:mt-2 gba:list-disc gba:list-inside gba:space-y-1 gba:text-sm gba:text-destructive">
              {availability.usages.map(usage => (
                <li key={usage.label}>
                  {usage.count} {usage.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  const renderAllowedContent = () => (
    <div
      className="gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:border-destructive gba:p-4"
      data-testid={`${dataTestId}-confirmation`}
    >
      <WarningCircleIcon className="gba:h-5 gba:w-5 gba:flex-shrink-0 gba:text-destructive" />
      <div className="gba:text-sm gba:text-destructive-secondary-foreground">
        {confirmDetails}
        <span className="gba:block gba:font-semibold gba:text-destructive">This action cannot be undone.</span>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onCancel()}>
      <DialogContent data-testid={dataTestId}>
        <DialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:h-10 gba:w-10 gba:items-center gba:justify-center gba:rounded-full gba:bg-destructive-secondary">
              <WarningCircleIcon
                weight="fill"
                className="gba:h-5 gba:w-5 gba:text-destructive"
                data-testid={`${dataTestId}-warning-icon`}
              />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="gba:space-y-4">
          {isChecking ? renderCheckingContent() : isBlocked ? renderBlockedContent() : renderAllowedContent()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid={`${dataTestId}-cancel-button`}
          >
            {isBlocked ? 'Close' : 'Cancel'}
          </Button>
          {!isChecking && !isBlocked && (
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
              data-testid={`${dataTestId}-confirm-button`}
            >
              {isDeleting ? (
                <>
                  <Spinner size="sm" className="gba:mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <TrashIcon className="gba:mr-2 gba:h-4 gba:w-4" />
                  Delete {itemType}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
