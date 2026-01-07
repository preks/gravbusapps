import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  } = {}
) => {
  const { includeDetails = false, includeAssignToRequest = true } = options

  const actions: any[] = []

  // Update action - available for CREATED status
  if (item.status === 'CREATED' || item.status === 'ASSIGNED' || item.status === 'REJECTED') {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
      key: 'update-expense-item',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.change_expense_item_container.update_title_module',
        'Update Expense Item'
      ),
      onClick: () => {
        context.onClose?.() // Close the sidebar first
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

  // Delete action - available for CREATED or ASSIGNED status
  if (item.status === 'CREATED' || item.status === 'ASSIGNED') {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
      key: 'delete-expense-item',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:discard_expense_items.discard_expense_items',
        'Delete Expense Item'
      ),
      onClick: () => {
        context.onClose?.() // Close the sidebar first
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

  // Assign to request action - available for CREATED status
  if (includeAssignToRequest && item.status === 'CREATED') {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
      key: 'assign-to-request',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:flows_button.create_expense_request',
        'Create Expense Request'
      ),
      onClick: () => {
        context.onClose?.() // Close the sidebar first
        handleAssignToRequest(item, context)
      }
    })
  }

  // Details action - only include if requested (for table rows)
  if (includeDetails) {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
      key: 'view-expense-item-details',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_item_request_card.view_item_details',
        'View Item Details'
      ),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        // This will be handled by the parent component
      }
    })
  }

  return actions
}

/**
 * Handles the assign to request action with proper error handling
 */
const handleAssignToRequest = (item: ExpenseItem, context: ExpenseItemActionContext) => {
  if (!item.currency?.code) {
    notification.error({
      message: getTranslationFromI18nKeyAndLabel('gba.expenseItems.assignToRequestError', 'Cannot Assign to Request'),
      description: getTranslationFromI18nKeyAndLabel(
        'gba.expenseItems.missingCurrency',
        'Item currency information is missing.'
      ),
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
