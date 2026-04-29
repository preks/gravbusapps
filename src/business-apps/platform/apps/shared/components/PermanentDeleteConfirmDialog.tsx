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
  itemNames: string[]
  title?: string
  description?: string
  cancelLabel?: string
  confirmLabel?: string
  deletingLabel?: string
  onConfirm: () => void
  isDeleting?: boolean
  'data-testid'?: string
}

function getDefaultTitle(count: number): string {
  if (count > 1) {
    return `Delete ${count} items permanently?`
  }
  return 'Delete permanently?'
}

function getDefaultDescription(itemNames: string[]): string {
  const count = itemNames.length
  if (count > 1) {
    return `${count} items will be permanently deleted and cannot be restored. This action cannot be undone.`
  }
  if (itemNames[0]) {
    return `"${itemNames[0]}" will be permanently deleted and cannot be restored. This action cannot be undone.`
  }
  return 'This item will be permanently deleted and cannot be restored. This action cannot be undone.'
}

export function PermanentDeleteConfirmDialog({
  open,
  onOpenChange,
  itemNames,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete permanently',
  deletingLabel = 'Deleting...',
  onConfirm,
  isDeleting = false,
  'data-testid': testId = 'permanent-delete-confirm'
}: PermanentDeleteConfirmDialogProps) {
  const count = itemNames.length
  if (count === 0) return null

  const resolvedTitle = title ?? getDefaultTitle(count)
  const resolvedDescription = description ?? getDefaultDescription(itemNames)

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
            <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive-secondary gba:flex gba:items-center gba:justify-center gba:shrink-0">
              <WarningCircleIcon className="gba:w-5 gba:h-5 gba:text-destructive" />
            </div>
            <AlertDialogTitle>{resolvedTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="gba:ml-[52px]">{resolvedDescription}</AlertDialogDescription>
          {count > 1 && count <= 8 && (
            <div className="gba:ml-[52px] gba:mt-2 gba:space-y-1">
              {itemNames.map(name => (
                <div
                  key={name}
                  className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5 gba:truncate"
                >
                  <TrashIcon className="gba:w-3 gba:h-3 gba:shrink-0" />
                  <span className="gba:truncate">{name}</span>
                </div>
              ))}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} data-testid={`${testId}-cancel`}>
            {cancelLabel}
          </AlertDialogCancel>
          <Button variant="destructive" disabled={isDeleting} onClick={onConfirm} data-testid={`${testId}-confirm`}>
            <TrashIcon className="gba:w-4 gba:h-4" />
            {isDeleting ? deletingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
