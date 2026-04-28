import {
  Alert,
  AlertDescription,
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
  onConfirm: () => void | Promise<void>
  t: TranslateFn
  /** Shown inside the dialog (e.g. API failure) so the message is not hidden behind the modal. */
  errorMessage?: string | null
}

export function SupervisorReviewSendBackDialog({
  open,
  onOpenChange,
  sendBackNotes,
  onSendBackNotesChange,
  busy,
  onConfirm,
  t,
  errorMessage
}: Readonly<SupervisorReviewSendBackDialogProps>) {
  const hasNotes = sendBackNotes.trim().length > 0
  const canSend = hasNotes && !busy

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid="supervisor-review-send-back-dialog">
        <DialogHeader>
          <DialogTitle>{t('supervisor-review-send-back-title')}</DialogTitle>
        </DialogHeader>
        {errorMessage != null && errorMessage !== '' ? (
          <Alert variant="destructive" data-testid="supervisor-review-send-back-dialog-error">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}
        <Textarea
          value={sendBackNotes}
          onChange={e => onSendBackNotesChange(e.target.value)}
          rows={4}
          placeholder={t('supervisor-review-send-back-placeholder')}
          data-testid="supervisor-review-send-back-notes"
        />
        <DialogFooter className="gba:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {t('supervisor-review-send-back-cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => {
              Promise.resolve(onConfirm()).catch(() => {})
            }}
            disabled={!canSend}
            title={hasNotes ? undefined : t('supervisor-review-send-back-notes-required')}
            data-testid="supervisor-review-send-back-confirm"
          >
            {t('supervisor-review-send-back-confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
