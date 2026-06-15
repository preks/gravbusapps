import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpensePlanOwnerActions } from '@/business-apps/fin/expenses/common/hooks/useExpensePlanOwnerActions'
import type { ExpensePlanRecord } from '../types/expensePlanRecord.types'

export interface UseExpensePlanRecordActionsParams extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo'> {
  expensePlan: ExpensePlanRecord | null
  expensePlanId: string
  onDiscardSuccess?: () => void
}

export function useExpensePlanRecordActions({
  expensePlan,
  expensePlanId,
  accessToken,
  userInfo,
  onDiscardSuccess
}: Readonly<UseExpensePlanRecordActionsParams>) {
  return useExpensePlanOwnerActions({
    plan:
      expensePlan && expensePlanId
        ? {
            id: expensePlanId,
            status: expensePlan.status,
            title: expensePlan.title,
            employeeId: expensePlan.employee?.id
          }
        : null,
    accessToken,
    userInfo,
    onDiscardSuccess
  })
}
