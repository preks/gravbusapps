import React from 'react'
import { AppAction } from '@/components/app-action'
import { RowActionsIcon, RowActionsWrapper } from '../../../../shared/TableSharedComponents'
import { EXPENSE_REQUESTS_TABLE_DATA_TEST_ID, type ExpenseRequestRow } from '../columns/expenseRequestColumns'

export interface ExpenseRequestRowActionsProps {
  record: ExpenseRequestRow
  accessToken: string | undefined
  t: (key: string) => string
  updateRequestActionLabel: string
  onEdit: (record: ExpenseRequestRow) => void
  onPrint: (record: ExpenseRequestRow) => void
  onView: (record: ExpenseRequestRow) => void
}

export function ExpenseRequestRowActions({
  record,
  accessToken,
  t,
  updateRequestActionLabel,
  onEdit,
  onPrint,
  onView
}: Readonly<ExpenseRequestRowActionsProps>) {
  const actionsCategory = t('expense-items-row-category-actions')
  const navigationsCategory = t('expense-items-row-category-navigations')

  const editAction =
    record.status === 'CREATED' || record.status === 'REJECTED' || record.status === 'PENDING'
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
        customActions={[...editAction, ...printAction, viewAction]}
        prefixDataTestId={`${EXPENSE_REQUESTS_TABLE_DATA_TEST_ID}-update`}
        accessToken={accessToken}
        data-testid={`expense-request-update-button-${record.id}`}
      >
        <RowActionsIcon />
      </AppAction>
    </RowActionsWrapper>
  )
}
