import { useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { discardExpenseRequest } from '../discard/discardExpenseRequestService'
import { EXPENSE_REQUEST_DISCARD_DIALOG_LABELS } from '../discard/discardDialogLabels'
import {
  generateExpenseRequestOwnerActions,
  type ExpenseRequestActionContext,
  type ExpenseRequestActionSource
} from '../utils/expenseRequestOwnerActions'
import { useExpenseEntityOwnerActions } from './useExpenseEntityOwnerActions'

export interface UseExpenseRequestOwnerActionsParams extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  request: ExpenseRequestActionSource | null
  onClose?: () => void
  onDiscardSuccess?: () => void
}

export function useExpenseRequestOwnerActions({
  request,
  accessToken,
  userInfo,
  onClose,
  onDiscardSuccess
}: Readonly<UseExpenseRequestOwnerActionsParams>) {
  const buildActions = useCallback(
    (
      entity: ExpenseRequestActionSource,
      context: ExpenseRequestActionContext & {
        onDiscard: (entity: ExpenseRequestActionSource) => void
      },
      t: (key: string) => string
    ) =>
      generateExpenseRequestOwnerActions(
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
    entity: request,
    accessToken,
    currentEmployeeId: userInfo?.employeeDetails?.employeeId ?? '',
    onClose,
    onDiscardSuccess,
    buildActions,
    discardEntity: discardExpenseRequest,
    discardDialogLabels: EXPENSE_REQUEST_DISCARD_DIALOG_LABELS,
    discardSuccessMessageKey: 'expense-requests-discard-success',
    discardErrorMessageKey: 'expense-requests-discard-error',
    discardErrorLogContext: 'discard expense request'
  })
}
