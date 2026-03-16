import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { buildAdvancePaymentFields } from '@/business-apps/fin/expenses/common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '@/business-apps/fin/expenses/common/components/AdvancePaymentDetailsFooter'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'

interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: AdvancePayment
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const { t } = useTranslation(advancePaymentDetailsTranslations)

  const fields = buildAdvancePaymentFields(payment as any, {
    showDescription: true,
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
