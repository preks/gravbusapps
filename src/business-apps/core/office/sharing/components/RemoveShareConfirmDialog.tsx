import React from 'react'
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
import { Trash, WarningCircle } from '@phosphor-icons/react'

export interface RemoveShareConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onConfirm: () => void
  isSubmitting?: boolean
  t: (key: string, vars?: Record<string, unknown>) => string
  'data-testid'?: string
}

export const RemoveShareConfirmDialog: React.FC<RemoveShareConfirmDialogProps> = ({
  open,
  onOpenChange,
  userName,
  onConfirm,
  isSubmitting = false,
  t,
  'data-testid': testId = 'remove-share-confirm-dialog'
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <div className="gba:mb-1 gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:h-10 gba:w-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-destructive-secondary">
              <WarningCircle className="gba:h-5 gba:w-5 gba:text-destructive" />
            </div>
            <AlertDialogTitle>{t('remove-share-title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="gba:ml-[52px]">
            {t('manage-remove-confirm', { name: userName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid={`${testId}-cancel`}>
            {t('manage-remove-cancel')}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            disabled={isSubmitting}
            data-testid={`${testId}-confirm`}
          >
            <Trash className="gba:h-4 gba:w-4" />
            {t('manage-remove-confirm-button')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
