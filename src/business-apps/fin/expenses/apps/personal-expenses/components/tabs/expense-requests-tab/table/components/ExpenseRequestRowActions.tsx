import React from 'react'
import { AppAction } from '@/components/app-action'
import { RowActionsIcon, RowActionsWrapper } from '../../../../shared/TableSharedComponents'
import { isDiscardableExpenseEntityStatus } from '@/business-apps/fin/expenses/common/discard/discardConstants'
import { isEditableExpenseRequestStatus } from '@/business-apps/fin/expenses/common/utils/expenseRequestActionEligibility'
import { EXPENSE_REQUESTS_TABLE_DATA_TEST_ID, type ExpenseRequestRow } from '../columns/expenseRequestColumns'

export interface ExpenseRequestRowActionsProps {
  record: ExpenseRequestRow
  accessToken: string | undefined
  t: (key: string) => string
  updateRequestActionLabel: string
  onEdit: (record: ExpenseRequestRow) => void
  onDiscard: (record: ExpenseRequestRow) => void
  onPrint: (record: ExpenseRequestRow) => void
  onView: (record: ExpenseRequestRow) => void
}

export function ExpenseRequestRowActions({
  record,
  accessToken,
  t,
  updateRequestActionLabel,
  onEdit,
  onDiscard,
  onPrint,
  onView
}: Readonly<ExpenseRequestRowActionsProps>) {
  const actionsCategory = t('expense-items-row-category-actions')
  const navigationsCategory = t('expense-items-row-category-navigations')

  const editAction = isEditableExpenseRequestStatus(record.status)
    ? [
        {
          category: actionsCategory,
          key: 'edit-expense-request',
          label: updateRequestActionLabel,
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            onEdit(record)
          }
        }
      ]
    : []

  const discardAction = isDiscardableExpenseEntityStatus(record.status)
    ? [
        {
          category: actionsCategory,
          key: 'discard-expense-request',
          label: t('expense-requests-row-discard-request'),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            onDiscard(record)
          }
        }
      ]
    : []

  const printAction =
    (record.status === 'APPROVED' ||
      record.status === 'VERIFIED' ||
      record.status === 'BOOKED' ||
      record.status === 'TRANSFERRED' ||
      record.status === 'PAID') &&
    record.employeeDocument?.file?.trim()
      ? [
          {
            category: actionsCategory,
            key: 'print',
            label: t('expense-plans-row-print'),
            onClick: (e?: React.MouseEvent) => {
              e?.stopPropagation()
              onPrint(record)
            }
          }
        ]
      : []

  const viewAction = {
    category: navigationsCategory,
    key: 'view-expense-request',
    label: t('expense-plans-row-view-request-details'),
    onClick: (e?: React.MouseEvent) => {
      e?.stopPropagation()
      onView(record)
    }
  }

  return (
    <RowActionsWrapper>
      <AppAction
        variant="table-row"
        customActions={[...editAction, ...discardAction, ...printAction, viewAction]}
        prefixDataTestId={`${EXPENSE_REQUESTS_TABLE_DATA_TEST_ID}-update`}
        accessToken={accessToken}
        data-testid={`expense-request-update-button-${record.id}`}
      >
        <RowActionsIcon />
      </AppAction>
    </RowActionsWrapper>
  )
}
