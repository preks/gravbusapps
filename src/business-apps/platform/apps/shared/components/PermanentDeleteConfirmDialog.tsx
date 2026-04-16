import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
} from '@newwork/nw-design-system'
import { TrashIcon, WarningCircleIcon } from '@phosphor-icons/react'

interface PermanentDeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName?: string | null
  onConfirm: () => void
  isDeleting?: boolean
  'data-testid'?: string
}

function getDescription(itemName?: string | null): string {
  if (itemName) {
    return `"${itemName}" will be permanently deleted and cannot be restored. This action cannot be undone.`
  }

  return 'This item will be permanently deleted and cannot be restored. This action cannot be undone.'
}

export function PermanentDeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isDeleting = false,
  'data-testid': testId = 'permanent-delete-confirm'
}: PermanentDeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
            <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive-secondary gba:flex gba:items-center gba:justify-center gba:shrink-0">
              <WarningCircleIcon className="gba:w-5 gba:h-5 gba:text-destructive" />
            </div>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="gba:ml-[52px]">{getDescription(itemName)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} data-testid={`${testId}-cancel`}>
            Cancel
          </AlertDialogCancel>
          <Button variant="destructive" disabled={isDeleting} onClick={onConfirm} data-testid={`${testId}-confirm`}>
            <TrashIcon className="gba:w-4 gba:h-4" />
            {isDeleting ? 'Deleting...' : 'Delete permanently'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
