import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea
} from '@newwork/nw-design-system'
import type { TranslateFn } from '../../compensation-planning/components/views/budgetSetupDisplayUtils'

export interface SupervisorReviewSendBackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sendBackNotes: string
  onSendBackNotesChange: (value: string) => void
  busy: boolean
  onConfirm: () => void
  t: TranslateFn
}

export function SupervisorReviewSendBackDialog({
  open,
  onOpenChange,
  sendBackNotes,
  onSendBackNotesChange,
  busy,
  onConfirm,
  t
}: Readonly<SupervisorReviewSendBackDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid="supervisor-review-send-back-dialog">
        <DialogHeader>
          <DialogTitle>{t('supervisor-review-send-back-title')}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={sendBackNotes}
          onChange={e => onSendBackNotesChange(e.target.value)}
          rows={4}
          placeholder={t('supervisor-review-send-back-placeholder')}
          data-testid="supervisor-review-send-back-notes"
        />
        <DialogFooter className="gba:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('supervisor-review-send-back-cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={busy}
            data-testid="supervisor-review-send-back-confirm"
          >
            {t('supervisor-review-send-back-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
