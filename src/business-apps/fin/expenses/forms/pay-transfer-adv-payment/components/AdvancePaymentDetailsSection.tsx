import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { HandCoinsIcon } from '@phosphor-icons/react'
import { AdvancePaymentData } from '../types'
import { formatCurrency } from '../utils/formatters'
import { formatDateTime } from '@/common/utils/dateFormatter'
import translations from '../_i18n'

interface AdvancePaymentDetailsSectionProps {
  advancePayment: AdvancePaymentData
  requestCreatedAt?: string | null
  isLoadingRequestDate?: boolean
  prefixDataTestId?: string
}

const AdvancePaymentDetailsSection: React.FC<AdvancePaymentDetailsSectionProps> = ({
  advancePayment,
  requestCreatedAt,
  isLoadingRequestDate = false,
  prefixDataTestId = 'pay-transfer-adv-payment-v2'
}) => {
  const { t } = useTranslation(translations)

  const formatPaymentMethod = (method?: string) => {
    if (!method) {
      return '-'
    }

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
          <HandCoinsIcon className="gba:h-5 gba:w-5" />
          {t('section-advance-payment')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        <div>
          <Label className="gba:text-sm gba:text-muted-foreground">{t('label-amount')}</Label>
          <p className="gba:text-sm gba:font-semibold gba:mt-1">
            {formatCurrency(advancePayment.amount, advancePayment.currency.code)}
          </p>
        </div>

        {(advancePayment.paymentMethod || advancePayment.costCenter?.name) && <Separator />}

        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {advancePayment.paymentMethod && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-payment-method')}</Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">
                {formatPaymentMethod(advancePayment.paymentMethod)}
              </p>
            </div>
          )}

          {advancePayment.costCenter?.name && (
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-cost-center')}</Label>
              <p className="gba:text-sm gba:font-medium gba:mt-1">{advancePayment.costCenter.name}</p>
            </div>
          )}
        </div>

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

        {requestCreatedAt && (
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-request-created')}</Label>
            <p className="gba:text-sm gba:font-medium gba:mt-1">
              {isLoadingRequestDate ? <Spinner size="sm" /> : formatDateTime(requestCreatedAt)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdvancePaymentDetailsSection
