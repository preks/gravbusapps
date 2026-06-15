import { useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { discardExpensePlan } from '../discard/discardExpensePlanService'
import { EXPENSE_PLAN_DISCARD_DIALOG_LABELS } from '../discard/discardDialogLabels'
import {
  generateExpensePlanOwnerActions,
  type ExpensePlanActionContext,
  type ExpensePlanActionSource
} from '../utils/expensePlanOwnerActions'
import { useExpenseEntityOwnerActions } from './useExpenseEntityOwnerActions'

export interface UseExpensePlanOwnerActionsParams extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  plan: ExpensePlanActionSource | null
  onClose?: () => void
  onDiscardSuccess?: () => void
}

export function useExpensePlanOwnerActions({
  plan,
  accessToken,
  userInfo,
  onClose,
  onDiscardSuccess
}: Readonly<UseExpensePlanOwnerActionsParams>) {
  const buildActions = useCallback(
    (
      entity: ExpensePlanActionSource,
      context: ExpensePlanActionContext & {
        onDiscard: (entity: ExpensePlanActionSource) => void
      },
      t: (key: string) => string
    ) =>
      generateExpensePlanOwnerActions(
        entity,
        {
          employeeId: context.employeeId,
          accessToken: context.accessToken,
          onClose: context.onClose
        },
        t,
        {
          onDiscard: context.onDiscard
        }
      ),
    []
  )

  return useExpenseEntityOwnerActions({
    entity: plan,
    accessToken,
    currentEmployeeId: userInfo?.employeeDetails?.employeeId ?? '',
    onClose,
    onDiscardSuccess,
    buildActions,
    discardEntity: discardExpensePlan,
    discardDialogLabels: EXPENSE_PLAN_DISCARD_DIALOG_LABELS,
    discardSuccessMessageKey: 'expense-plans-discard-success',
    discardErrorMessageKey: 'expense-plans-discard-error',
    discardErrorLogContext: 'discard expense plan'
  })
}
