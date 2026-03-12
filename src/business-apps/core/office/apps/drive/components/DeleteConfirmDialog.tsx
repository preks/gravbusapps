import React from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  Button
} from '@newwork/nw-design-system'
import { Trash2, AlertTriangle } from 'lucide-react'

export interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemNames: string[]
  onConfirm: () => void
  isDeleting?: boolean
  t: (key: string, args?: Record<string, string | number>) => string
  'data-testid'?: string
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  onOpenChange,
  itemNames,
  onConfirm,
  isDeleting = false,
  t,
  'data-testid': testId = 'drive-delete-confirm'
}) => {
  const count = itemNames.length
  if (count === 0) return null

  const description =
    count === 1 ? t('delete-confirm-single', { name: itemNames[0] }) : t('delete-confirm-multi', { count })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid={testId}>
        <AlertDialogHeader>
          <div className="gba:flex gba:items-center gba:gap-3 gba:mb-1">
            <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-destructive-secondary gba:flex gba:items-center gba:justify-center gba:shrink-0">
              <AlertTriangle className="gba:w-5 gba:h-5 gba:text-destructive" />
            </div>
            <AlertDialogTitle>{t('delete-confirm-title')}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="gba:ml-[52px]">{description}</AlertDialogDescription>
          {count > 1 && count <= 8 && (
            <div className="gba:ml-[52px] gba:mt-2 gba:space-y-1">
              {itemNames.map((name, i) => (
                <div
                  key={i}
                  className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1.5 gba:truncate"
                >
                  <Trash2 className="gba:w-3 gba:h-3 gba:shrink-0" />
                  <span className="gba:truncate">{name}</span>
                </div>
              ))}
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} data-testid={`${testId}-cancel`}>
            {t('delete-confirm-cancel')}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            disabled={isDeleting}
            data-testid={`${testId}-confirm`}
          >
            <Trash2 className="gba:w-4 gba:h-4" />
            {t('delete-confirm-action')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
