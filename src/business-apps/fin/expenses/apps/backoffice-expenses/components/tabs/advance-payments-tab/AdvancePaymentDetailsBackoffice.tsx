import React from 'react'
import { Separator, Button, useTranslation } from '@newwork/nw-design-system'
import { getAdvancePaymentStatusDisplay } from '../../../../personal-expenses/utils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PiArrowRight } from 'react-icons/pi'
import { DetailsPanelContent } from '../../../../../common/components/details-panel/DetailsPanelContent'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { buildAdvancePaymentFields } from '../../../../../common/utils/advancePaymentUtils'
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

  const expensePlanId = payment.expensePlan?.id

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
      footer={
        expensePlanId ? (
          <>
            <Separator />
            <div className="gba:flex gba:justify-end gba:mt-4">
              <Button
                variant="default"
                onClick={() =>
                  navigateTo(buildPlatformUrl('/platform/fin/expenses/expense-plan-record', { expensePlanId }))
                }
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

export default AdvancePaymentDetailsBackoffice
