import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, useTranslation } from '@newwork/nw-design-system'
import { CheckCircle2 } from 'lucide-react'
import dayjs from 'dayjs'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)

  if (!transactionDate) {
    return null
  }

  return (
    <Card data-testid={`${prefixDataTestId}-card`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-title`} className="gba:flex gba:items-center gba:gap-2">
          <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
          {t('section-transaction-confirmation-details')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        <div className="gba:bg-muted gba:rounded-lg gba:p-4 gba:space-y-3">
          <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-date-row`}>
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
              {t('label-transaction-date')}:
            </span>
            <span className="gba:text-sm gba:flex-1 gba:font-medium" data-testid={`${prefixDataTestId}-date-value`}>
              {dayjs(transactionDate).format('MMM D, YYYY')}
            </span>
          </div>

          {transactionNumber && (
            <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-number-row`}>
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                {t('label-transaction-number')}:
              </span>
              <span className="gba:text-sm gba:flex-1 gba:font-medium" data-testid={`${prefixDataTestId}-number-value`}>
                {transactionNumber}
              </span>
            </div>
          )}

          {transactionConfirmedBy && (
            <div className="gba:flex gba:items-start gba:gap-3" data-testid={`${prefixDataTestId}-confirmed-by-row`}>
              <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                {t('label-confirmed-by')}:
              </span>
              <span className="gba:text-sm gba:flex-1" data-testid={`${prefixDataTestId}-confirmed-by-value`}>
                {transactionConfirmedBy}
              </span>
            </div>
          )}

          <Separator />

          <div className="gba:flex gba:items-center gba:gap-2" data-testid={`${prefixDataTestId}-success-indicator`}>
            <CheckCircle2 className="gba:h-5 gba:w-5 gba:text-green-600" />
            <span className="gba:text-sm gba:font-medium gba:text-green-600">{t('label-payment-confirmed')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionConfirmationDetailsSection
