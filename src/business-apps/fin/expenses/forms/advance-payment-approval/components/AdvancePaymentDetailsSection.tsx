import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Label, Spinner } from '@newwork/nw-design-system'
import { PiHandCoins } from 'react-icons/pi'
import { AdvancePaymentData } from '../types'
import { formatCurrency } from '../utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'

interface AdvancePaymentDetailsSectionProps {
  advancePayment: AdvancePaymentData
  requestCreatedAt?: string | null
  isLoadingRequestDate?: boolean
  prefixDataTestId?: string
  t: (key: string, vars?: Record<string, unknown>) => string
}

const AdvancePaymentDetailsSection: React.FC<AdvancePaymentDetailsSectionProps> = ({
  advancePayment,
  requestCreatedAt,
  isLoadingRequestDate = false,
  prefixDataTestId = 'advance-payment-approval-v2',
  t
}) => {
  // Format payment method
  const formatPaymentMethod = (method?: string) => {
    if (!method) return '-'
    const methodString = String(method).trim()

    if (methodString === 'DIRECT_DEPOSIT') {
      return t('payment-method-direct-deposit')
    }
    if (methodString === 'CASH_PAYMENT') {
      return t('payment-method-cash')
    }

    const lowered = methodString.toLowerCase()
    if (lowered.includes('direct')) {
      return t('payment-method-direct-deposit')
    }
    if (lowered.includes('cash')) {
      return t('payment-method-cash')
    }

    return methodString
  }

  return (
    <Card data-testid={`${prefixDataTestId}-advance-payment-details-section`}>
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiHandCoins className="gba:h-5 gba:w-5" />
          {t('section-advance-payment')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Amount */}
        <div>
          <Label className="gba:text-sm gba:text-muted-foreground">{t('label-amount')}</Label>
          <p className="gba:text-sm gba:font-semibold gba:mt-1">
            {formatCurrency(advancePayment.amount, advancePayment.currency.code)}
          </p>
        </div>

        {(advancePayment.paymentMethod || advancePayment.costCenter?.name) && <Separator />}

        {/* Payment Method and Cost Center */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* Payment Method */}
          {advancePayment.paymentMethod && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-payment-method')}</Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">
                {formatPaymentMethod(advancePayment.paymentMethod)}
              </p>
            </div>
          )}

          {/* Cost Center */}
          {advancePayment.costCenter?.name && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-cost-center')}</Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">{advancePayment.costCenter.name}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {advancePayment.description && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-notes')}</Label>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1 gba:whitespace-pre-wrap">
                {advancePayment.description}
              </p>
            </div>
          </>
        )}

        {requestCreatedAt && <Separator />}

        {/* Request Created - Show when available */}
        {requestCreatedAt && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-request-created')}</Label>
            <div className="gba:text-sm gba:font-medium gba:mt-1">
              {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdvancePaymentDetailsSection
