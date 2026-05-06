import { startProcess } from '@/common/utils/start-process'

export interface ExpensePlanActionContext {
  employeeId: string
  accessToken: string
  onClose?: () => void
}

/**
 * Generates action data for expense plans based on status and context
 * Follows DRY principle by centralizing action logic
 */
export const generateExpensePlanActions = (
  plan: any,
  context: ExpensePlanActionContext,
  options: {
    includeDetails?: boolean
    t: (key: string) => string
  }
) => {
  const { includeDetails = false, t } = options

  const actions: any[] = []

  // Update action - available for CREATED or REJECTED status (same logic as table)
  if (plan.status === 'CREATED' || plan.status === 'REJECTED') {
    actions.push({
      category: t('expense-items-row-category-actions'),
      key: 'update-expense-plan',
      label: t('expense-plans-row-update-plan'),
      onClick: () => {
        context.onClose?.() // Close the sidebar first
        startProcess({
          domain: 'employee-expense',
          processName: 'changeExpensePlan',
          payload: {
            employeeId: context.employeeId,
            expensePlanId: plan.id
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    })
  }

  // Details action - only include if requested (for table rows)
  if (includeDetails) {
    actions.push({
      category: t('expense-items-row-category-navigations'),
      key: 'view-expense-plan-details',
      label: t('expense-plans-row-view-plan-details'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        // This will be handled by the parent component
      }
    })
  }

  return actions
}
