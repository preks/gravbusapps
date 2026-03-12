import React from 'react'
import { Separator, Button } from '@newwork/nw-design-system'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

interface AdvancePaymentDetailsFooterProps {
  expensePlanId?: string
  t?: (key: string) => string
}

export const AdvancePaymentDetailsFooter: React.FC<AdvancePaymentDetailsFooterProps> = ({
  expensePlanId,
  t: tProp
}) => {
  const t = tProp ?? ((key: string) => (key === 'detail-view-full-details' ? 'View Full Details' : key))
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
          <ArrowRightIcon className="gba:mr-2" />
          {t('detail-view-full-details')}
        </Button>
      </div>
    </>
  )
}
