import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { buildAdvancePaymentFields } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '@/business-apps/fin/expenses/common/components/AdvancePaymentDetailsFooter'
import translations from '../../../../personal-expenses/_i18n'

export interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: any
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const { t } = useTranslation(translations)
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
      title={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.advance_payment_details_title',
        'Advance Payment Details'
      )}
      subtitle={payment.code || undefined}
      fields={fields}
      showHeader={false}
      footer={<AdvancePaymentDetailsFooter expensePlanId={payment.expensePlan?.id} />}
    />
  )
}

export default AdvancePaymentDetails
