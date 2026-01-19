import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  } = {}
) => {
  const { includeDetails = false } = options

  const actions: any[] = []

  // Update action - available for CREATED or REJECTED status (same logic as table)
  if (plan.status === 'CREATED' || plan.status === 'REJECTED') {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
      key: 'update-expense-plan',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_plan_list.expense_plan_flows.update_plan',
        'Update Plan'
      ),
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
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
      key: 'view-expense-plan-details',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_plan_request_card.view_plan_details',
        'View Plan Details'
      ),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        // This will be handled by the parent component
      }
    })
  }

  return actions
}
