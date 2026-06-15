import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequestOwnerActions } from '@/business-apps/fin/expenses/common/hooks/useExpenseRequestOwnerActions'
import type { ExpenseRequestRecord } from '../types/expenseRequestRecord.types'

export interface UseExpenseRequestRecordActionsParams
  extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  expenseRequest: ExpenseRequestRecord | null
  expenseRequestId: string
  onDiscardSuccess?: () => void
}

export function useExpenseRequestRecordActions({
  expenseRequest,
  expenseRequestId,
  accessToken,
  userInfo,
  onDiscardSuccess
}: Readonly<UseExpenseRequestRecordActionsParams>) {
  return useExpenseRequestOwnerActions({
    request:
      expenseRequest && expenseRequestId
        ? {
            id: expenseRequestId,
            status: expenseRequest.status,
            title: expenseRequest.title,
            employeeId: expenseRequest.employee?.id
          }
        : null,
    accessToken,
    userInfo,
    onDiscardSuccess
  })
}
