import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { buildAdvancePaymentFields } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '@/business-apps/fin/expenses/common/components/advance-payment/AdvancePaymentDetailsFooter'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const { t } = useTranslation(advancePaymentDetailsTranslations)
  if (!payment) return null

  const fields = buildAdvancePaymentFields(payment, {
    showDuration: true,
    showDecisionDate: true,
    showTransactionDate: true,
    showRequester: true,
    showManager: true,
    showPlanTotalAmount: true,
    formatCurrency: formatCurrencyDisplay,
    t,
    getStatusDisplay: getAdvancePaymentStatusDisplay
  })

  return (
    <DetailsPanelContent
      dataTestIdPrefix="advance-payment-details"
      title={t('advance-payment-details-title')}
      subtitle={payment.code || undefined}
      fields={fields}
      showHeader={false}
      footer={<AdvancePaymentDetailsFooter expensePlanId={payment.expensePlan?.id} t={t} />}
    />
  )
}

export default AdvancePaymentDetails
