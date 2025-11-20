import React from 'react'
import { Label } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'

interface TransactionConfirmationDetailsSectionProps {
  transactionDate?: string
  transactionId?: string
}

const TransactionConfirmationDetailsSection: React.FC<TransactionConfirmationDetailsSectionProps> = ({
  transactionDate,
  transactionId
}) => {
  return (
    <div className="gba:space-y-4" data-testid="confirm-transfer-adv-payment-v2-transaction-confirmation-details">
      {/* Transaction Date */}
      {transactionDate && (
        <div data-testid="confirm-transfer-adv-payment-v2-confirmed-transaction-date">
          <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.transaction_date_label',
              'Transaction Date'
            )}
          </Label>
          <div className="gba:text-sm gba:font-semibold gba:text-foreground">
            {(() => {
              try {
                // Parse the date using dayjs
                const parsed = dayjs(transactionDate)
                if (!parsed.isValid()) {
                  return transactionDate
                }

                // Format date in a user-friendly format (e.g., "Nov 16, 2025")
                // If there's time information, include it
                if (transactionDate.includes('T') && transactionDate.length > 10) {
                  // Check if time is not midnight (00:00:00)
                  const time = parsed.format('HH:mm:ss')
                  if (time !== '00:00:00') {
                    return parsed.format('MMM D, YYYY [at] HH:mm')
                  }
                }

                // Just format the date
                return parsed.format('MMM D, YYYY')
              } catch {
                // Fallback to formatDate utility
                return formatDate(transactionDate, 'date.short') || transactionDate
              }
            })()}
          </div>
        </div>
      )}

      {/* Transaction ID */}
      {transactionId && (
        <div data-testid="confirm-transfer-adv-payment-v2-confirmed-transaction-id">
          <Label className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-2 gba:block">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:confirm_transfer_advance_payment.transaction_id_label',
              'Transaction ID'
            )}
          </Label>
          <div className="gba:text-sm gba:font-semibold gba:text-foreground">{transactionId}</div>
        </div>
      )}

      {!transactionDate && !transactionId && (
        <div className="gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:confirm_transfer_advance_payment.no_transaction_details',
            'No transaction details available'
          )}
        </div>
      )}
    </div>
  )
}

export default TransactionConfirmationDetailsSection
