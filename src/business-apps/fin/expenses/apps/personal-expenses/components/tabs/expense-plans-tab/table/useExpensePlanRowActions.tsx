import React, { useCallback } from 'react'
import { AppAction } from '@/components/app-action'
import { startProcess } from '@/common/utils/start-process'
import { isDiscardableExpenseEntityStatus } from '@/business-apps/fin/expenses/common/discard/discardConstants'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import { RowActionsIcon, RowActionsWrapper } from '../../../shared/TableSharedComponents'
import { EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX } from './expensePlanColumns'

export interface UseExpensePlanRowActionsParams {
  employeeId: string | undefined
  accessToken: string
  onPrintPlan: (record: ExpensePlan) => void
  onViewExpensePlanDetails: (record: ExpensePlan) => void
  onViewExpenseRequestDetails: (record: ExpensePlan) => void
  onDiscard: (record: ExpensePlan) => void
  t: (key: string) => string
}

function hasExpenseRequest(record: ExpensePlan): boolean {
  const requests = record.expenseRequest as unknown
  if (!Array.isArray(requests) || requests.length === 0) {
    return false
  }
  return requests[0]?.id != null
}

export function useExpensePlanRowActions({
  employeeId,
  accessToken,
  onPrintPlan,
  onViewExpensePlanDetails,
  onViewExpenseRequestDetails,
  onDiscard,
  t
}: Readonly<UseExpensePlanRowActionsParams>) {
  return useCallback(
    (row: { original: ExpensePlan }) => {
      const record = row.original
      const actionsCategory = t('expense-items-row-category-actions')
      const navigationsCategory = t('expense-items-row-category-navigations')

      const updatePlanAction =
        record.status === 'CREATED' || record.status === 'REJECTED'
          ? [
              {
                category: actionsCategory,
                key: 'update-plan',
                label: t('expense-plans-row-update-plan'),
                onClick: () => {
                  startProcess({
                    domain: 'employee-expense',
                    processName: 'changeExpensePlan',
                    payload: {
                      employeeId,
                      expensePlanId: record.id
                    },
                    builderType: 'NATIVE_SCREEN'
                  })
                }
              }
            ]
          : []

      const discardAction = isDiscardableExpenseEntityStatus(record.status)
        ? [
            {
              category: actionsCategory,
              key: 'discard-expense-plan',
              label: t('expense-plans-row-discard-plan'),
              onClick: (e?: React.MouseEvent) => {
                e?.stopPropagation()
                onDiscard(record)
              }
            }
          ]
        : []

      const printAction =
        (record.status === 'APPROVED' || record.status === 'CLOSED') && record.employeeDocument?.file?.trim()
          ? [
              {
                category: actionsCategory,
                key: 'print',
                label: t('expense-plans-row-print'),
                onClick: () => onPrintPlan(record)
              }
            ]
          : []

      const requestAdvanceAction =
        record.status === 'APPROVED'
          ? [
              {
                category: actionsCategory,
                key: 'request-advance',
                label: t('expense-plans-row-request-advance-payment'),
                onClick: () => {
                  startProcess({
                    domain: 'employee-expense',
                    processName: 'changeAdvancePayment',
                    payload: {
                      employeeId,
                      expensePlan: record.id
                    },
                    builderType: 'NATIVE_SCREEN'
                  })
                }
              }
            ]
          : []

      const createExpenseRequestAction =
        record.status === 'APPROVED'
          ? [
              {
                category: actionsCategory,
                key: 'create-expense-request',
                label: t('expense-items-create-expense-request'),
                onClick: () => {
                  startProcess({
                    domain: 'employee-expense',
                    processName: 'changeExpenseRequest',
                    payload: {
                      employeeId,
                      expensePlanId: record.id
                    },
                    builderType: 'NATIVE_SCREEN'
                  })
                }
              }
            ]
          : []

      const viewPlanDetailsAction = {
        category: navigationsCategory,
        key: 'view-plan-details',
        label: t('expense-plans-row-view-plan-details'),
        onClick: (e?: React.MouseEvent) => {
          e?.stopPropagation()
          onViewExpensePlanDetails(record)
        }
      }

      const viewRequestDetailsAction = hasExpenseRequest(record)
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
        : []

      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
              ...updatePlanAction,
              ...discardAction,
              ...printAction,
              ...requestAdvanceAction,
              ...createExpenseRequestAction,
              viewPlanDetailsAction,
              ...viewRequestDetailsAction
            ]}
            prefixDataTestId={`${EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-plan`}
            accessToken={accessToken}
            data-testid={`${EXPENSE_PLANS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [employeeId, accessToken, onPrintPlan, onViewExpensePlanDetails, onViewExpenseRequestDetails, onDiscard, t]
  )
}
