import { DiscardExpenseEntityDialog } from '../../../apps/personal-expenses/common/discard/DiscardExpenseEntityDialog'
import type { DiscardExpenseEntityDialogLabels, TranslateFn } from '../../discard/types'

export interface ExpenseEntityOwnerDiscardDialogProps {
  open: boolean
  entityTitle?: string
  isSubmitting: boolean
  labels: DiscardExpenseEntityDialogLabels
  testIdPrefix: string
  t: TranslateFn
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function ExpenseEntityOwnerDiscardDialog({
  open,
  entityTitle,
  isSubmitting,
  labels,
  testIdPrefix,
  t,
  onOpenChange,
  onConfirm
}: Readonly<ExpenseEntityOwnerDiscardDialogProps>) {
  return (
    <DiscardExpenseEntityDialog
      open={open}
      entityTitle={entityTitle}
      isSubmitting={isSubmitting}
      labels={labels}
      testIdPrefix={testIdPrefix}
      t={t}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  )
}
