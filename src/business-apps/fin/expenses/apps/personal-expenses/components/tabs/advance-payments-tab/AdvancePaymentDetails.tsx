import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DetailsPanelContent } from '../../../../../common/components/details-panel/DetailsPanelContent'
import { buildAdvancePaymentFields } from '../../../../../common/utils/advancePaymentUtils'
import { AdvancePaymentDetailsFooter } from '../../../../../common/components/AdvancePaymentDetailsFooter'
import translations from '../../../_i18n'

interface AdvancePaymentDetailsProps extends BusinessAppContextProps {
  payment: AdvancePayment
}

const AdvancePaymentDetails: React.FC<AdvancePaymentDetailsProps> = ({ payment }) => {
  const { t } = useTranslation(translations)

  const fields = buildAdvancePaymentFields(payment as any, {
    showDescription: true,
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
