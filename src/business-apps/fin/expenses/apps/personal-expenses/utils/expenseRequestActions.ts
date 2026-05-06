import { startProcess } from '@/common/utils/start-process'

export interface ExpenseRequestActionContext {
  employeeId: string
  accessToken: string
  onClose?: () => void
}

/**
 * Generates action data for expense requests based on status and context
 * Follows DRY principle by centralizing action logic
 */
export const generateExpenseRequestActions = (
  request: any,
  context: ExpenseRequestActionContext,
  t: (key: string) => string,
  options?: {
    includeDetails?: boolean
  }
) => {
  const { includeDetails = false } = options ?? {}

  const actions: any[] = []

  if (request.status === 'CREATED' || request.status === 'REJECTED' || request.status === 'PENDING') {
    actions.push({
      category: t('expense-items-row-category-actions'),
      key: 'update-expense-request',
      label: t('personal-expenses-update-request-action'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        context.onClose?.()
        startProcess({
          domain: 'employee-expense',
          processName: 'changeExpenseRequest',
          payload: {
            employeeId: context.employeeId,
            expenseRequestId: request.id
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    })
  }

  if (includeDetails) {
    actions.push({
      category: t('expense-items-row-category-navigations'),
      key: 'view-expense-request-details',
      label: t('expense-plans-row-view-request-details'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
      }
    })
  }

  return actions
}
