import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'
import { PAYMENT_METHODS, type PaymentAllocation, type PaymentMethod } from '../../../common/types'

interface RecordPaymentDialogProps {
  open: boolean
  currency: string
  defaultAmount: number
  onClose: () => void
  onSubmit: (input: Omit<PaymentAllocation, 'id' | 'invoiceId' | 'ledgerTransactionRef'>) => Promise<void>
}

export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  open,
  currency,
  defaultAmount,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(billingTranslations)
  const [amount, setAmount] = useState(String(defaultAmount))
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(amount),
        currency,
        method,
        paymentDate: new Date(paymentDate).toISOString(),
        externalReference: reference || null
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="record-payment-dialog">
        <DialogHeader>
          <DialogTitle>{t('billing-payment-title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="gba:space-y-3" data-testid="record-payment-form">
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-amount">
              {t('billing-payment-amount')} ({currency})
            </label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              data-testid="payment-amount-input"
              required
            />
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-method">
              {t('billing-payment-method')}
            </label>
            <Select value={method} onValueChange={value => setMethod(value as PaymentMethod)}>
              <SelectTrigger id="payment-method" data-testid="payment-method-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-date">
              {t('billing-payment-date')}
            </label>
            <Input
              id="payment-date"
              type="date"
              value={paymentDate}
              onChange={event => setPaymentDate(event.target.value)}
              data-testid="payment-date-input"
              required
            />
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-reference">
              {t('billing-payment-reference')}
            </label>
            <Input
              id="payment-reference"
              value={reference}
              onChange={event => setReference(event.target.value)}
              data-testid="payment-reference-input"
            />
          </div>
          <div className="gba:flex gba:justify-end gba:gap-2 gba:pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} data-testid="payment-cancel-button">
              {t('billing-action-cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={submitting} data-testid="payment-submit-button">
              {t('billing-payment-submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default RecordPaymentDialog
