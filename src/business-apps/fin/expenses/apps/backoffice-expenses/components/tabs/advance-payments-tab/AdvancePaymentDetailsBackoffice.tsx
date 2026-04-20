import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay } from '../../../utils/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { formatCurrency } from '@/business-apps/fin/expenses/apps/backoffice-expenses/utils/currencyUtils'
import { buildAdvancePaymentFields } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '@/business-apps/fin/expenses/common/components/advance-payment/AdvancePaymentDetailsFooter'
import translations from '../../../_i18n'

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
    getStatusDisplay: (status: string) => getAdvancePaymentStatusDisplay(status, t)
  })

  return (
    <DetailsPanelContent
      dataTestIdPrefix="backoffice-advance-payment-details"
      title={t('advance-payment-details-title')}
      subtitle={payment.code || undefined}
      fields={fields}
      showHeader={false}
      footer={<AdvancePaymentDetailsFooter expensePlanId={payment.expensePlan?.id} t={t} />}
    />
  )
}

export default AdvancePaymentDetailsBackoffice
