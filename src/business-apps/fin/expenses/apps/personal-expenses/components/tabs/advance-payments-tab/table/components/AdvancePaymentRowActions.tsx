import React from 'react'
import { AppAction } from '@/components/app-action'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { RowActionsIcon, RowActionsWrapper } from '../../../../shared/TableSharedComponents'
import { ADVANCE_PAYMENTS_TABLE_DATA_TEST_ID } from '../columns/advancePaymentColumns'
import type { AdvancePayment } from '../../../../../hooks/useGetAdvancePayments'

export interface AdvancePaymentRowActionsProps {
  record: AdvancePayment
  accessToken: string | undefined
  onViewDetails: (record: AdvancePayment) => void
  onViewExpensePlanDetails: (record: AdvancePayment) => void
  onViewExpenseRequestDetails: (record: AdvancePayment) => void
  onGenerateDocument: (record: AdvancePayment) => void
}

export function AdvancePaymentRowActions({
  record,
  accessToken,
  onViewDetails,
  onViewExpensePlanDetails,
  onViewExpenseRequestDetails,
  onGenerateDocument
}: Readonly<AdvancePaymentRowActionsProps>) {
  const navigationsCategory = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.flows_button.navigations',
    'Navigations'
  )

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
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.view_advance_payment_details',
              'View Advance Payment Details'
            ),
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
                  label: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                    'View Plan Details'
                  ),
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
                  label: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                    'View Request Details'
                  ),
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
            label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_insights.generate_document', 'Generate document'),
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
