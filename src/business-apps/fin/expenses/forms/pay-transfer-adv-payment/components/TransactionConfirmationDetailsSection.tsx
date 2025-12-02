import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator } from '@newwork/nw-design-system'
import { CheckCircle2 } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'

interface TransactionConfirmationDetailsSectionProps {
  transactionDate?: string | null
  transactionNumber?: string | null
  transactionConfirmedBy?: string | null
  prefixDataTestId?: string
}

const TransactionConfirmationDetailsSection: React.FC<TransactionConfirmationDetailsSectionProps> = ({
  transactionDate,
  transactionNumber,
  transactionConfirmedBy,
  prefixDataTestId = 'transaction-confirmation-details'
}) => {
  if (!transactionDate) return null

  return (
    <Card data-testid={`${prefixDataTestId}-card`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-title`} className="gba:flex gba:items-center gba:gap-2">
          <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:pay_advance_payment_cash.transaction_confirmation_details',
            'Transaction Confirmation Details'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
          {/* Transaction Date */}
          <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-date-row`}>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:pay_advance_payment_cash.transaction_date',
                'Transaction Date'
              )}
              :
            </span>
            <span className="gba:text-sm gba:flex-1 gba:font-medium" data-testid={`${prefixDataTestId}-date-value`}>
              {dayjs(transactionDate).format('MMM D, YYYY')}
            </span>
          </div>

          {/* Transaction Number (if available) */}
          {transactionNumber && (
            <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-number-row`}>
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:pay_advance_payment_cash.transaction_number',
                  'Transaction Number'
                )}
                :
              </span>
              <span className="gba:text-sm gba:flex-1 gba:font-medium" data-testid={`${prefixDataTestId}-number-value`}>
                {transactionNumber}
              </span>
            </div>
          )}

          {/* Confirmed By (if available) */}
          {transactionConfirmedBy && (
            <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-confirmed-by-row`}>
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:pay_advance_payment_cash.confirmed_by', 'Confirmed By')}:
              </span>
              <span className="gba:text-sm gba:flex-1" data-testid={`${prefixDataTestId}-confirmed-by-value`}>
                {transactionConfirmedBy}
              </span>
            </div>
          )}

          <Separator />

          {/* Success Indicator */}
          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${prefixDataTestId}-success-indicator`}>
            <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
            <span className="gba:text-sm gba:font-medium gba:text-green-600">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:pay_advance_payment_cash.payment_confirmed',
                'Payment confirmed and handed out'
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionConfirmationDetailsSection
