import React, { useEffect, useState } from 'react'
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'

interface WriteOffInvoiceDialogProps {
  open: boolean
  invoiceId: string
  actorId?: string
  isPartiallyPaid: boolean
  onClose: () => void
  onSubmit: (input: { reason: string; idempotencyKey: string }) => Promise<void>
}

function buildWriteOffIdempotencyKey(invoiceId: string, actorId: string | undefined): string {
  const actorSegment = actorId || 'system'
  return `writeoff-${invoiceId}-${actorSegment}-${new Date().toISOString()}`
}

export const WriteOffInvoiceDialog: React.FC<WriteOffInvoiceDialogProps> = ({
  open,
  invoiceId,
  actorId,
  isPartiallyPaid,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(billingTranslations)
  const [reason, setReason] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setIdempotencyKey(buildWriteOffIdempotencyKey(invoiceId, actorId))
    }
  }, [actorId, invoiceId, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ reason, idempotencyKey })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="writeoff-invoice-dialog">
        <DialogHeader>
          <DialogTitle>{t('billing-writeoff-invoice-title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-3" data-testid="writeoff-invoice-form">
          {isPartiallyPaid && (
            <Alert data-testid="writeoff-invoice-partial-warning">
              <AlertDescription>{t('billing-writeoff-invoice-partial-warning')}</AlertDescription>
            </Alert>
          )}
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="writeoff-invoice-reason">
              {t('billing-writeoff-invoice-reason')}
            </label>
            <Textarea
              id="writeoff-invoice-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              data-testid="writeoff-invoice-reason-input"
              required
            />
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              data-testid="writeoff-invoice-close-button"
            >
              {t('billing-action-close')}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={submitting || !reason.trim()}
              data-testid="writeoff-invoice-submit-button"
            >
              {t('billing-writeoff-invoice-submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default WriteOffInvoiceDialog
