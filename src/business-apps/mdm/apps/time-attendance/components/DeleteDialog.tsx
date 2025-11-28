import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button
} from '@newwork/nw-design-system'
import { WarningIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface DeleteDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
  titleKey?: string
  description?: string
}

export const DeleteDialog: React.FC<DeleteDialogProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isDeleting,
  titleKey,
  description
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="gba:flex gba:items-center gba:gap-2">
            <WarningIcon className="gba:text-destructive" />
            {titleKey ?? 'Delete Item'}
          </DialogTitle>
          <DialogDescription>{description ?? 'Are you sure you want to delete this item?'}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">
              {getTranslationFromI18nKeyAndLabel('master-data:forms.common.buttons.cancel', 'Cancel')}
            </Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting
              ? getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.time_types.actions.deleting',
                  'Deleting...'
                )
              : getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.delete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
