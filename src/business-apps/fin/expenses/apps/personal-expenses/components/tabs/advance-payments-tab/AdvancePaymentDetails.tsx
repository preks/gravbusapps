import React from 'react'
import { Separator, Button, useTranslation } from '@newwork/nw-design-system'
import { AdvancePayment } from '../../../hooks/useGetAdvancePayments'
import { getAdvancePaymentStatusDisplay, formatCurrencyDisplay } from '../../../utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DetailsPanelContent } from '../../../../../common/components/details-panel/DetailsPanelContent'
import { buildAdvancePaymentFields } from '../../../../../common/utils/advancePaymentUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { PiArrowRight } from 'react-icons/pi'
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
      footer={
        payment.expensePlan?.id ? (
          <>
            <Separator />
            <div className="gba:flex gba:justify-end gba:mt-4">
              <Button
                variant="default"
                onClick={() => {
                  const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
                    expensePlanId: payment.expensePlan!.id
                  })
                  navigateTo(url)
                }}
                data-testid="view-expense-plan-details-button"
              >
                <PiArrowRight className="gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:team_expenses_page.plan_details.view_full_details',
                  'View Full Details'
                )}
              </Button>
            </div>
          </>
        ) : undefined
      }
    />
  )
}

export default AdvancePaymentDetails
