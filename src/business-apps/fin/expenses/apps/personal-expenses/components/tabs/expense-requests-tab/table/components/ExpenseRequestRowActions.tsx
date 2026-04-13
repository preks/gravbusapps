import React from 'react'
import { AppAction } from '@/components/app-action'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { RowActionsIcon, RowActionsWrapper } from '../../../../shared/TableSharedComponents'
import { EXPENSE_REQUESTS_TABLE_DATA_TEST_ID, type ExpenseRequestRow } from '../columns/expenseRequestColumns'

export interface ExpenseRequestRowActionsProps {
  record: ExpenseRequestRow
  accessToken: string | undefined
  updateRequestActionLabel: string
  onEdit: (record: ExpenseRequestRow) => void
  onPrint: (record: ExpenseRequestRow) => void
  onView: (record: ExpenseRequestRow) => void
}

export function ExpenseRequestRowActions({
  record,
  accessToken,
  updateRequestActionLabel,
  onEdit,
  onPrint,
  onView
}: Readonly<ExpenseRequestRowActionsProps>) {
  const actionsCategory = getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions')
  const navigationsCategory = getTranslationFromI18nKeyAndLabel(
    'lowcoder:employee_list.flows_button.navigations',
    'Navigations'
  )

  const editAction =
    record.status === 'CREATED' || record.status === 'REJECTED'
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
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.print', 'Print'),
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
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
      'View Request Details'
    ),
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
