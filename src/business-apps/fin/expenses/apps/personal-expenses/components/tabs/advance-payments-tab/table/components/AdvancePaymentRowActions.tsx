import React from 'react'
import { AppAction } from '@/components/app-action'
import { RowActionsIcon, RowActionsWrapper } from '../../../../shared/TableSharedComponents'
import { ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID } from '../columns/advancePaymentColumns'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'

export interface AdvancePaymentRowActionsProps {
  record: AdvancePayment
  accessToken: string | undefined
  t: (key: string) => string
  onViewDetails: (record: AdvancePayment) => void
  onViewExpensePlanDetails: (record: AdvancePayment) => void
  onViewExpenseRequestDetails: (record: AdvancePayment) => void
  onGenerateDocument: (record: AdvancePayment) => void
}

export function AdvancePaymentRowActions({
  record,
  accessToken,
  t,
  onViewDetails,
  onViewExpensePlanDetails,
  onViewExpenseRequestDetails,
  onGenerateDocument
}: Readonly<AdvancePaymentRowActionsProps>) {
  const navigationsCategory = t('expense-items-row-category-navigations')

  const expenseRequests = record.expensePlan?.expenseRequest
  const hasExpenseRequest =
    Array.isArray(expenseRequests) && expenseRequests.length > 0 && expenseRequests[0]?.id != null

  return (
    <RowActionsWrapper>
      <AppAction
        variant="table-row"
        customActions={[
          {
            category: navigationsCategory,
            key: 'view-advance-payment',
            label: t('personal-expenses-view-advance-payment-details'),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onViewDetails(record)
            }
          },
          ...(record.expensePlanId
            ? [
                {
                  category: navigationsCategory,
                  key: 'view-plan-details',
                  label: t('expense-plans-row-view-plan-details'),
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    onViewExpensePlanDetails(record)
                  }
                }
              ]
            : []),
          ...(hasExpenseRequest
            ? [
                {
                  category: navigationsCategory,
                  key: 'view-request-details',
                  label: t('expense-plans-row-view-request-details'),
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    onViewExpenseRequestDetails(record)
                  }
                }
              ]
            : []),
          {
            category: navigationsCategory,
            key: 'generate-document',
            label: t('personal-expenses-generate-document'),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onGenerateDocument(record)
            }
          }
        ]}
        prefixDataTestId={`${ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID}-action`}
        accessToken={accessToken}
        data-testid={`${ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID}-action-button-${record.id}`}
      >
        <RowActionsIcon />
      </AppAction>
    </RowActionsWrapper>
  )
}
