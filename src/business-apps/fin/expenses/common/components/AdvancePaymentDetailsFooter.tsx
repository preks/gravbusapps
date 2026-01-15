import React from 'react'
import { Separator, Button } from '@newwork/nw-design-system'
import { PiArrowRight } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface AdvancePaymentDetailsFooterProps {
  expensePlanId?: string
}

export const AdvancePaymentDetailsFooter: React.FC<AdvancePaymentDetailsFooterProps> = ({ expensePlanId }) => {
  if (!expensePlanId) return null

  return (
    <>
      <Separator />
      <div className="gba:flex gba:justify-end gba:mt-4">
        <Button
          variant="default"
          onClick={() => navigateTo(buildPlatformUrl('/platform/fin/expenses/expense-plan-record', { expensePlanId }))}
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
  )
}
