import { startProcess } from '@/common/utils/start-process'
import { isDiscardableExpenseEntityStatus } from '../discard/discardConstants'
import { isEditableExpensePlanStatus } from './expensePlanActionEligibility'
import { isExpenseRecordOwnedByCurrentUser } from './expenseRequestActionEligibility'
import type { ExpenseOwnerActionItem } from './expenseRequestOwnerActions'

export interface ExpensePlanActionContext {
  employeeId: string
  accessToken: string
  onClose?: () => void
}

export interface ExpensePlanActionSource {
  id: string
  status?: string
  title?: string
  employeeId?: string
}

export interface GenerateExpensePlanActionsOptions {
  includeDetails?: boolean
  onDiscard?: (plan: ExpensePlanActionSource) => void
}

/**
 * Builds update/discard actions for expense plans (tables, details sidebar, record page).
 */
export function generateExpensePlanOwnerActions(
  plan: ExpensePlanActionSource,
  context: ExpensePlanActionContext,
  t: (key: string) => string,
  options?: GenerateExpensePlanActionsOptions
): ExpenseOwnerActionItem[] {
  const { includeDetails = false, onDiscard } = options ?? {}

  if (!isExpenseRecordOwnedByCurrentUser(plan.employeeId, context.employeeId)) {
    return []
  }

  const actions: ExpenseOwnerActionItem[] = []
  const actionsCategory = t('expense-items-row-category-actions')
  const navigationsCategory = t('expense-items-row-category-navigations')

  if (isEditableExpensePlanStatus(plan.status)) {
    actions.push({
      category: actionsCategory,
      key: 'update-expense-plan',
      label: t('expense-plans-row-update-plan'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        context.onClose?.()
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

  if (isDiscardableExpenseEntityStatus(plan.status) && onDiscard) {
    actions.push({
      category: actionsCategory,
      key: 'discard-expense-plan',
      label: t('expense-plans-row-discard-plan'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        onDiscard(plan)
      }
    })
  }

  if (includeDetails) {
    actions.push({
      category: navigationsCategory,
      key: 'view-expense-plan-details',
      label: t('expense-plans-row-view-plan-details'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
      }
    })
  }

  return actions
}
