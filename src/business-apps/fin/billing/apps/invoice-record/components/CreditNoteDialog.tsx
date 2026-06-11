import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  useTranslation
} from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'

interface CreditNoteDialogProps {
  open: boolean
  currency: string
  defaultAmount: number
  onClose: () => void
  onSubmit: (input: { amount: number; reason: string }) => Promise<void>
}

export const CreditNoteDialog: React.FC<CreditNoteDialogProps> = ({
  open,
  currency,
  defaultAmount,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(billingTranslations)
  const [amount, setAmount] = useState(String(defaultAmount))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({ amount: Number(amount), reason })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="credit-note-dialog">
        <DialogHeader>
          <DialogTitle>{t('billing-credit-note-title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-3" data-testid="credit-note-form">
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="credit-note-amount">
              {t('billing-credit-note-amount')} ({currency})
            </label>
            <Input
              id="credit-note-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              data-testid="credit-note-amount-input"
              required
            />
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="credit-note-reason">
              {t('billing-credit-note-reason')}
            </label>
            <Textarea
              id="credit-note-reason"
              value={reason}
              onChange={event => setReason(event.target.value)}
              data-testid="credit-note-reason-input"
            />
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} data-testid="credit-note-cancel-button">
              {t('billing-action-cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={submitting} data-testid="credit-note-submit-button">
              {t('billing-credit-note-submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreditNoteDialog
