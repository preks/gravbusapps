import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  options: {
    includeDetails?: boolean
  } = {}
) => {
  const { includeDetails = false } = options

  const actions: any[] = []

  // Update action - CREATED, REJECTED, or PENDING (same logic as ExpenseRequestRowActions)
  if (request.status === 'CREATED' || request.status === 'REJECTED' || request.status === 'PENDING') {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
      key: 'update-expense-request',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.modal_list_or_flow_button.update_request_btn',
        'Update Request'
      ),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        context.onClose?.() // Close the sidebar first
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

  // Details action - only include if requested (for table rows)
  if (includeDetails) {
    actions.push({
      category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
      key: 'view-expense-request-details',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_request_card.view_request_details',
        'View Request Details'
      ),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        // This will be handled by the parent component
      }
    })
  }

  return actions
}
