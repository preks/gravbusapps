import type { MouseEvent } from 'react'
import { AppAction } from '@/components/app-action'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { RowActionsIcon, RowActionsWrapper } from '../../../../common/components/RowActionComponents'
import type { AdvancePaymentItem } from '../../../../types'
import type { TranslateFn } from '../../../../utils/utils'

type AdvancePaymentRecord = AdvancePaymentItem & {
  expensePlan?: AdvancePaymentItem['expensePlan'] & {
    expenseRequest?: Array<{ id?: string }>
  }
}

const DATA_TEST_ID_PREFIX = 'advance-payments'

export interface AdvancePaymentsRowActionsProps {
  accessToken: string
  record: AdvancePaymentItem
  onSelectItem: (item: AdvancePaymentItem) => void
  t: TranslateFn
}

export function AdvancePaymentsRowActions({
  accessToken,
  record,
  onSelectItem,
  t
}: Readonly<AdvancePaymentsRowActionsProps>) {
  const typedRecord = record as AdvancePaymentRecord

  const handleViewExpensePlanDetails = () => {
    if (!typedRecord.expensePlan?.id) {
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: typedRecord.expensePlan.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }

  const handleViewExpenseRequestDetails = () => {
    const expenseRequests = typedRecord.expensePlan?.expenseRequest
    const first = Array.isArray(expenseRequests) && expenseRequests.length > 0 ? expenseRequests[0] : null
    if (!first?.id) {
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: first.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }

  const navigationsCategory = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.flows_button.navigations',
    'Navigations'
  )

  return (
    <RowActionsWrapper>
      <AppAction
        variant="table-row"
        customActions={[
          {
            category: navigationsCategory,
            key: 'view-advance-payment-details',
            label: t('advance-payment-view-details'),
            onClick: (e?: MouseEvent) => {
              e?.stopPropagation()
              onSelectItem(record)
            }
          },
          ...(typedRecord.expensePlan?.id
            ? [
                {
                  category: navigationsCategory,
                  key: 'view-plan-details',
                  label: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                    'View Plan Details'
                  ),
                  onClick: (e?: MouseEvent) => {
                    e?.stopPropagation()
                    handleViewExpensePlanDetails()
                  }
                }
              ]
            : []),
          ...(typedRecord.expensePlan?.expenseRequest &&
          Array.isArray(typedRecord.expensePlan.expenseRequest) &&
          typedRecord.expensePlan.expenseRequest.length > 0 &&
          typedRecord.expensePlan.expenseRequest[0].id
            ? [
                {
                  category: navigationsCategory,
                  key: 'view-request-details',
                  label: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                    'View Request Details'
                  ),
                  onClick: (e?: MouseEvent) => {
                    e?.stopPropagation()
                    handleViewExpenseRequestDetails()
                  }
                }
              ]
            : [])
        ]}
        prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update`}
        accessToken={accessToken}
        data-testid={`${DATA_TEST_ID_PREFIX}-update-button-${record.id}`}
      >
        <RowActionsIcon />
      </AppAction>
    </RowActionsWrapper>
  )
}
