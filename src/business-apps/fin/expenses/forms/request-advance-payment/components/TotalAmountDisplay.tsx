import React from 'react'
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils'
import { BaseFormFieldProps } from '../types/FormTypes'

interface TotalAmountDisplayProps extends BaseFormFieldProps {
  totalRemainingAmount?: number
  requestTypeValue?: string
  selectedPlan?: any
}

const TotalAmountDisplay: React.FC<TotalAmountDisplayProps> = ({
  totalRemainingAmount = 0,
  requestTypeValue,
  'data-testid': dataTestId = 'request-advance-payment-total-section',
  selectedPlan = null
}) => {
  return (
    <div className="gba:mb-6" data-testid={dataTestId}>
      <div className="gba:flex gba:justify-between gba:items-center">
        <div className="gba:flex-1 gba:flex gba:justify-center">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-2xl gba:font-bold gba:text-black">
              {formatNumberFunction((totalRemainingAmount || 0).toString(), '0.00[,]00')}{' '}
              {selectedPlan ? selectedPlan.currency?.code : ''}
            </span>
            <span className="gba:text-sm gba:text-gray-500 gba:font-bold gba:mt-3">
              {getTranslationFromI18nKeyAndLabel('lowcoder:initiate_advance_payment.total', 'Total')}
            </span>
          </div>
        </div>
        <div
          className="gba:rounded-full gba:px-8 gba:py-1 gba:bg-primary gba:text-primary-foreground gba:border gba:border-primary gba:text-sm gba:font-medium"
          data-testid="request-advance-payment-trip-badge"
        >
          {requestTypeValue || 'Trip'}
        </div>
      </div>
    </div>
  )
}

export default TotalAmountDisplay
