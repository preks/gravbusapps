import { startProcess } from '@/common/utils/start-process'
import { notification } from 'antd'
import { ExpenseItem } from '../hooks/useGetExpenseItems'

export interface ExpenseItemActionContext {
  employeeId: string
  accessToken: string
  onClose?: () => void
}

/**
 * Generates action data for expense items based on status and context
 * Follows DRY principle by centralizing action logic
 */
export const generateExpenseItemActions = (
  item: ExpenseItem,
  context: ExpenseItemActionContext,
  options: {
    includeDetails?: boolean
    includeAssignToRequest?: boolean
  } = {},
  t: (key: string) => string
) => {
  const { includeDetails = false, includeAssignToRequest = true } = options

  const actions: any[] = []

  if (item.status === 'CREATED' || item.status === 'ASSIGNED' || item.status === 'REJECTED') {
    actions.push({
      category: t('expense-items-row-category-actions'),
      key: 'update-expense-item',
      label: t('expense-items-row-update-item'),
      onClick: () => {
        context.onClose?.()
        startProcess({
          domain: 'employee-expense',
          processName: 'changeExpenseItem',
          payload: {
            employeeId: context.employeeId,
            expenseId: item.id
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    })
  }

  if (item.status === 'CREATED' || item.status === 'ASSIGNED') {
    actions.push({
      category: t('expense-items-row-category-actions'),
      key: 'delete-expense-item',
      label: t('expense-items-row-delete-item'),
      onClick: () => {
        context.onClose?.()
        startProcess({
          domain: 'employee-expense',
          processName: 'discardExpenseItems',
          payload: {
            employeeId: context.employeeId,
            expenseItemsIds: [item.id]
          }
        })
      }
    })
  }

  if (includeAssignToRequest && item.status === 'CREATED') {
    actions.push({
      category: t('expense-items-row-category-actions'),
      key: 'assign-to-request',
      label: t('expense-items-create-expense-request'),
      onClick: () => {
        context.onClose?.()
        handleAssignToRequest(item, context, t)
      }
    })
  }

  if (includeDetails) {
    actions.push({
      category: t('expense-items-row-category-navigations'),
      key: 'view-expense-item-details',
      label: t('expense-items-row-view-details'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
      }
    })
  }

  return actions
}

const handleAssignToRequest = (item: ExpenseItem, context: ExpenseItemActionContext, t: (key: string) => string) => {
  if (!item.currency?.code) {
    notification.error({
      message: t('expense-items-assign-to-request-error'),
      description: t('expense-items-assign-to-request-missing-currency'),
      placement: 'bottomRight',
      duration: 5,
      className: 'gba:error-toast'
    })
    return
  }

  const expenseItems = [
    {
      itemId: item.id,
      currencyId: item.currencyRef
    }
  ]

  const payload = {
    employeeId: context.employeeId,
    expenseItems
  }

  startProcess({
    domain: 'employee-expense',
    processName: 'changeExpenseRequest',
    payload,
    builderType: 'NATIVE_SCREEN'
  })
}
