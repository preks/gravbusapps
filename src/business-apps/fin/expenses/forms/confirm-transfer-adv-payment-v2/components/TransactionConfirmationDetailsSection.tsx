import React from 'react'
import { Separator } from '@newwork/nw-design-system'
import { CheckCircle2 } from 'lucide-react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TransactionConfirmationDetailsSectionProps {
  transactionDate?: string
  transactionId?: string
  transactionConfirmedBy?: string | null
}

const TransactionConfirmationDetailsSection: React.FC<TransactionConfirmationDetailsSectionProps> = ({
  transactionDate,
  transactionId,
  transactionConfirmedBy
}) => {
  if (!transactionDate) return null

  return (
    <div
      className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3"
      data-testid="confirm-transfer-adv-payment-v2-transaction-confirmation-details"
    >
      {/* Transaction Date */}
      <div className="gba:flex gba:items-start gba:gap-3" data-testid="confirm-transfer-adv-payment-v2-date-row">
        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:confirm_transfer_advance_payment.transaction_date_label',
            'Transaction Date'
          )}
          :
        </span>
        <span
          className="gba:text-sm gba:flex-1 gba:font-medium"
          data-testid="confirm-transfer-adv-payment-v2-date-value"
        >
          {dayjs(transactionDate).format('MMM D, YYYY')}
        </span>
      </div>

      {/* Transaction ID (if available) */}
      {transactionId && (
        <div className="gba:flex gba:items-start gba:gap-3" data-testid="confirm-transfer-adv-payment-v2-id-row">
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.transaction_id_label',
              'Transaction ID'
            )}
            :
          </span>
          <span
            className="gba:text-sm gba:flex-1 gba:font-medium"
            data-testid="confirm-transfer-adv-payment-v2-id-value"
          >
            {transactionId}
          </span>
        </div>
      )}

      {/* Confirmed By (if available) */}
      {transactionConfirmedBy && (
        <div
          className="gba:flex gba:items-start gba:gap-3"
          data-testid="confirm-transfer-adv-payment-v2-confirmed-by-row"
        >
          <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.confirmed_by',
              'Confirmed By'
            )}
            :
          </span>
          <span className="gba:text-sm gba:flex-1" data-testid="confirm-transfer-adv-payment-v2-confirmed-by-value">
            {transactionConfirmedBy}
          </span>
        </div>
      )}

      <Separator />

      {/* Success Indicator */}
      <div
        className="gba:flex gba:items-center gba:gap-2"
        data-testid="confirm-transfer-adv-payment-v2-success-indicator"
      >
        <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
        <span className="gba:text-sm gba:font-medium gba:text-green-600">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:confirm_transfer_advance_payment.payment_confirmed',
            'Payment transfer confirmed'
          )}
        </span>
      </div>
    </div>
  )
}

export default TransactionConfirmationDetailsSection
