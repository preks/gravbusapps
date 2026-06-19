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

interface CancelInvoiceDialogProps {
  open: boolean
  invoiceId: string
  actorId?: string
  hasPayments: boolean
  onClose: () => void
  onSubmit: (input: { reason: string; idempotencyKey: string }) => Promise<void>
}

function buildCancelIdempotencyKey(invoiceId: string, actorId: string | undefined): string {
  const actorSegment = actorId || 'system'
  return `cancel-${invoiceId}-${actorSegment}-${new Date().toISOString()}`
}

export const CancelInvoiceDialog: React.FC<CancelInvoiceDialogProps> = ({
  open,
  invoiceId,
  actorId,
  hasPayments,
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
      setIdempotencyKey(buildCancelIdempotencyKey(invoiceId, actorId))
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
      <DialogContent data-testid="cancel-invoice-dialog">
        <DialogHeader>
          <DialogTitle>{t('billing-cancel-invoice-title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-3" data-testid="cancel-invoice-form">
          {hasPayments && (
            <Alert data-testid="cancel-invoice-payments-warning">
              <AlertDescription>{t('billing-cancel-invoice-payments-warning')}</AlertDescription>
            </Alert>
          )}
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="cancel-invoice-reason">
              {t('billing-cancel-invoice-reason')}
            </label>
            <Textarea
              id="cancel-invoice-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              data-testid="cancel-invoice-reason-input"
              required
            />
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              data-testid="cancel-invoice-close-button"
            >
              {t('billing-action-close')}
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={submitting || !reason.trim()}
              data-testid="cancel-invoice-submit-button"
            >
              {t('billing-cancel-invoice-submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CancelInvoiceDialog
