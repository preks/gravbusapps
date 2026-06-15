import { startProcess } from '@/common/utils/start-process'
import { isDiscardableExpenseEntityStatus } from '../discard/discardConstants'
import { isEditableExpenseRequestStatus, isExpenseRecordOwnedByCurrentUser } from './expenseRequestActionEligibility'

export interface ExpenseRequestActionContext {
  employeeId: string
  accessToken: string
  onClose?: () => void
}

export interface ExpenseRequestActionSource {
  id: string
  status?: string
  title?: string
  employeeId?: string
}

export interface GenerateExpenseRequestActionsOptions {
  includeDetails?: boolean
  onDiscard?: (request: ExpenseRequestActionSource) => void
}

export type ExpenseOwnerActionItem = {
  category: string
  key: string
  label: string
  onClick: (e?: React.MouseEvent) => void
}

/**
 * Builds update/discard actions for expense requests (tables, details sidebar, record page).
 */
export function generateExpenseRequestOwnerActions(
  request: ExpenseRequestActionSource,
  context: ExpenseRequestActionContext,
  t: (key: string) => string,
  options?: GenerateExpenseRequestActionsOptions
): ExpenseOwnerActionItem[] {
  const { includeDetails = false, onDiscard } = options ?? {}

  if (!isExpenseRecordOwnedByCurrentUser(request.employeeId, context.employeeId)) {
    return []
  }

  const actions: ExpenseOwnerActionItem[] = []
  const actionsCategory = t('expense-items-row-category-actions')
  const navigationsCategory = t('expense-items-row-category-navigations')

  if (isEditableExpenseRequestStatus(request.status)) {
    actions.push({
      category: actionsCategory,
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

  if (isDiscardableExpenseEntityStatus(request.status) && onDiscard) {
    actions.push({
      category: actionsCategory,
      key: 'discard-expense-request',
      label: t('expense-requests-row-discard-request'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
        onDiscard(request)
      }
    })
  }

  if (includeDetails) {
    actions.push({
      category: navigationsCategory,
      key: 'view-expense-request-details',
      label: t('expense-plans-row-view-request-details'),
      onClick: (e?: React.MouseEvent) => {
        e?.stopPropagation()
      }
    })
  }

  return actions
}
