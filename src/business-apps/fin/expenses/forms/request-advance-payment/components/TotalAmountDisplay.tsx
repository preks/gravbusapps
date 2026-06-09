import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { BaseFormFieldProps } from '../types/FormTypes'
import translations from '../_i18n'

interface TotalAmountDisplayProps extends BaseFormFieldProps {
  totalRemainingAmount?: number
  requestTypeValue?: string
  selectedPlan?: { currency?: { code?: string } } | null
}

const TotalAmountDisplay: React.FC<TotalAmountDisplayProps> = ({
  totalRemainingAmount,
  requestTypeValue,
  'data-testid': dataTestId = 'request-advance-payment-total-section',
  selectedPlan = null
}) => {
  const { t } = useTranslation(translations)

  const amountLabel =
    `${formatNumberFunction(String(totalRemainingAmount ?? 0), '0.00[,]00')} ${selectedPlan?.currency?.code ?? ''}`.trim()

  return (
    <div className="gba:mb-6 gba:min-h-12" data-testid={dataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center">
        <div className="gba:flex-1 gba:flex gba:justify-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-2xl gba:font-bold gba:text-black">{amountLabel}</span>
            <span className="gba:text-sm gba:text-gray-500 gba:font-bold gba:mt-3">{t('total-label')}</span>
          </div>
        </div>
        <div
          className="gba:rounded-full gba:px-8 gba:py-1 gba:bg-primary gba:text-primary-foreground gba:border gba:border-primary gba:text-sm gba:font-medium"
          data-testid="request-advance-payment-trip-badge"
        >
          {requestTypeValue || t('trip-badge-default')}
        </div>
      </div>
    </div>
  )
}

export default TotalAmountDisplay
