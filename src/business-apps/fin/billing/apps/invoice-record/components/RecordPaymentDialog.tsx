import React, { useState } from 'react'
import {
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  DateInput,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ComboboxOption,
  useTranslation
} from '@newwork/nw-design-system'
import billingTranslations from '../../../common/_i18n'
import { PAYMENT_METHODS, type PaymentMethod, type RecordPaymentInput } from '../../../common/invoices/types'
import type { LedgerTransaction } from '../../../common/ledger/network/ledgerAdminClient'
import { displayTransactionStatus, transactionFamily } from '../../../common/ledger/utils/ledgerTransactionStatus'
import { getPaymentMethodLabel } from '../../../common/utils/billingLabels'

interface RecordPaymentDialogProps {
  open: boolean
  currency: string
  defaultAmount: number
  transactions: LedgerTransaction[]
  transactionsLoading?: boolean
  onClose: () => void
  onSubmit: (input: RecordPaymentInput) => Promise<void>
}

function transactionOptionLabel(transaction: LedgerTransaction, t: (key: string) => string): string {
  const title = transaction.reference || transaction.transactionId
  const amount = `${transaction.amount} ${transaction.currency}`
  const status = displayTransactionStatus(transaction, t)
  return [title, amount, status].filter(Boolean).join(' · ')
}

function transactionOptions(transactions: LedgerTransaction[], t: (key: string) => string): ComboboxOption[] {
  const seen = new Set<string>()

  return transactions.flatMap(transaction =>
    transactionFamily(transaction).flatMap(item => {
      if (!item.transactionId || seen.has(item.transactionId)) return []
      seen.add(item.transactionId)
      const label = transactionOptionLabel(item, t)
      return [{ value: item.transactionId, label, optionLabel: label }]
    })
  )
}

function dateInputToIso(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export const RecordPaymentDialog: React.FC<RecordPaymentDialogProps> = ({
  open,
  currency,
  defaultAmount,
  transactions,
  transactionsLoading = false,
  onClose,
  onSubmit
}) => {
  const { t } = useTranslation(billingTranslations)
  const [amount, setAmount] = useState(String(defaultAmount))
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [ledgerTransactionRef, setLedgerTransactionRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const options = transactionOptions(transactions, t)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit({
        amount: Number(amount),
        currency,
        method,
        paymentDate: dateInputToIso(paymentDate),
        externalReference: reference || null,
        ledgerTransactionRef: ledgerTransactionRef || null
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
                    {getPaymentMethodLabel(option, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-date">
              {t('billing-payment-date')}
            </label>
            <DateInput
              id="payment-date"
              type="date"
              mode="single"
              value={paymentDate}
              onChange={value => setPaymentDate(typeof value === 'string' ? value : '')}
              placeholder={t('billing-payment-date')}
              data-testid="payment-date-input"
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
          <div className="gba:space-y-1">
            <label className="gba:text-sm gba:font-medium" htmlFor="payment-ledger-transaction-ref">
              {t('billing-payment-ledger-transaction-ref')}
            </label>
            <Combobox
              id="payment-ledger-transaction-ref"
              options={options}
              value={ledgerTransactionRef}
              onValueChange={setLedgerTransactionRef}
              placeholder={t('billing-payment-ledger-transaction-ref')}
              searchPlaceholder={t('ledger-admin-search')}
              loading={transactionsLoading}
              emptyText={t('ledger-admin-empty-transactions')}
              allowClear
              showClearButton
              data-testid="payment-ledger-transaction-ref-input"
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
