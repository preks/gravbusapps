import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import type { DiscardExpenseEntityDialogLabels, TranslateFn } from './types'

export interface DiscardExpenseEntityDialogProps {
  open: boolean
  entityTitle?: string
  isSubmitting: boolean
  labels: DiscardExpenseEntityDialogLabels
  testIdPrefix: string
  t: TranslateFn
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function DiscardExpenseEntityDialog({
  open,
  entityTitle,
  isSubmitting,
  labels,
  testIdPrefix,
  t,
  onOpenChange,
  onConfirm
}: Readonly<DiscardExpenseEntityDialogProps>) {
  const description = entityTitle
    ? t(labels.descriptionWithTitle, { requestTitle: entityTitle, planTitle: entityTitle, entityTitle })
    : t(labels.description)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={`${testIdPrefix}-dialog`}>
        <DialogHeader>
          <DialogTitle data-testid={`${testIdPrefix}-dialog-title`}>{t(labels.title)}</DialogTitle>
        </DialogHeader>

        <p className="gba:text-sm gba:text-muted-foreground" data-testid={`${testIdPrefix}-dialog-content`}>
          {description}
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            data-testid={`${testIdPrefix}-cancel-button`}
          >
            {t(labels.cancelButton)}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isSubmitting}
            data-testid={`${testIdPrefix}-confirm-button`}
          >
            {isSubmitting ? t(labels.submitting) : t(labels.confirmButton)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
