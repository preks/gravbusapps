import { AppAction } from '@/components/app-action'
import React, { useCallback } from 'react'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import { generateExpenseItemActions } from '../../../../utils/expenseItemActions'
import { RowActionsWrapper, RowActionsIcon } from '../../../shared/TableSharedComponents'
import { EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX } from './expenseItemColumns'

interface UseExpenseItemRowActionsParams {
  employeeId: string
  accessToken: string
  onSelectItem: (item: ExpenseItem) => void
}

export function useExpenseItemRowActions({
  employeeId,
  accessToken,
  onSelectItem
}: Readonly<UseExpenseItemRowActionsParams>) {
  return useCallback(
    (row: { original: ExpenseItem }) => {
      const record = row.original
      return (
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={generateExpenseItemActions(
              record,
              { employeeId, accessToken },
              { includeDetails: true, includeAssignToRequest: true }
            ).map(action => {
              if (action.key === 'view-expense-item-details') {
                return {
                  ...action,
                  onClick: (e?: React.MouseEvent) => {
                    e?.stopPropagation()
                    onSelectItem(record)
                  }
                }
              }
              return action
            })}
            prefixDataTestId={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-item`}
            accessToken={accessToken}
            data-testid={`${EXPENSE_ITEMS_TABLE_DATA_TEST_ID_PREFIX}-update-expense-item-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [employeeId, accessToken, onSelectItem]
  )
}
