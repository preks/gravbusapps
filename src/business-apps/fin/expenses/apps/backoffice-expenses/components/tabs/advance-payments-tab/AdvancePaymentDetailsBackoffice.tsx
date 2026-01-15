import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay } from '../../../../personal-expenses/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '@/business-apps/fin/expenses/apps/backoffice-expenses/utils/currencyUtils'
import { buildAdvancePaymentFields } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '@/business-apps/fin/expenses/common/components/AdvancePaymentDetailsFooter'
import translations from '../../../../personal-expenses/_i18n'

interface AdvancePaymentDetailsBackofficeProps extends BusinessAppContextProps {
  payment: any
}

const AdvancePaymentDetailsBackoffice: React.FC<AdvancePaymentDetailsBackofficeProps> = ({ payment }) => {
  const { t } = useTranslation(translations)
  if (!payment) return null

  const fields = buildAdvancePaymentFields(payment, {
    showDuration: true,
    showDecisionDate: true,
    showTransactionDate: true,
    showRequester: true,
    showManager: true,
    showPlanTotalAmount: true,
    formatCurrency,
    t,
    getStatusDisplay: getAdvancePaymentStatusDisplay
  })

  return (
    <DetailsPanelContent
      dataTestIdPrefix="backoffice-advance-payment-details"
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

export default AdvancePaymentDetailsBackoffice
