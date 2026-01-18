import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, Button } from '@newwork/nw-design-system'

export interface DeleteConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Title for the dialog (e.g., "Delete Allowance Code") */
  title: string
  /** Description of what's being deleted (e.g., "allowance code \"ABC - Test\"") */
  itemDescription: string
  /** Whether deletion is in progress */
  isDeleting: boolean
  /** Callback when delete is confirmed */
  onConfirm: () => void
  /** Callback when dialog is cancelled */
  onCancel: () => void
  /** Optional data-testid prefix for testing */
  testIdPrefix?: string
}

/**
 * Shared delete confirmation dialog used across all calculation rule record tabs.
 * Provides consistent UX for delete operations.
 */
export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  itemDescription,
  isDeleting,
  onConfirm,
  onCancel,
  testIdPrefix = 'delete-confirmation'
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={`${testIdPrefix}-modal`}>
        <DialogHeader data-testid={`${testIdPrefix}-modal-header`}>
          <DialogTitle data-testid={`${testIdPrefix}-modal-title`}>{title}</DialogTitle>
        </DialogHeader>

        <div className="gba:py-4" data-testid={`${testIdPrefix}-content`}>
          <p className="gba:text-muted-foreground">Are you sure you want to delete {itemDescription}?</p>
          <p className="gba:text-sm gba:text-destructive gba:mt-2">This action cannot be undone.</p>
        </div>

        <DialogFooter data-testid={`${testIdPrefix}-modal-footer`}>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-testid={`${testIdPrefix}-cancel-button`}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid={`${testIdPrefix}-confirm-button`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteConfirmationDialog
