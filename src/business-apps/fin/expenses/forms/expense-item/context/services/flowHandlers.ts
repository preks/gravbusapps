import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { flowClient } from '@/common/network/flows/FlowClient'

type ExpenseItemT = (key: string) => string

/**
 * Initiates a workflow process for expense item changes
 */
export const initiateFlow = async (
  accessToken: string,
  employeeId: string,
  flowDomain: string,
  flowProcessName: string,
  t: ExpenseItemT
): Promise<any> => {
  if (!employeeId) {
    showToast(t('expense-item-employee-id-not-found'), 'error')
    return null
  }

  try {
    flowClient.setAccessToken(accessToken)
    return await flowClient.initiateFlow(flowDomain, flowProcessName, { employeeId })
  } catch {
    showToast(t('expense-item-error-flows'), 'error')
    return null
  }
}

/**
 * Gets the opened task flow for a specific process instance
 */
export const getOpenedTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  flowDomain: string,
  flowProcessName: string,
  t: ExpenseItemT
): Promise<any> => {
  if (!processInstanceId) {
    showToast(t('expense-item-error-flows'), 'error')
    return null
  }

  try {
    flowClient.setAccessToken(accessToken)
    return await flowClient.getOpenedTaskFlow(flowDomain, flowProcessName, processInstanceId, userId)
  } catch {
    showToast(t('expense-item-error-flows'), 'error')
    return null
  }
}

/**
 * Completes a task in the workflow process
 */
export const completeTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  taskName: string,
  taskId: string,
  submitData: any,
  flowDomain: string,
  flowProcessName: string,
  t: ExpenseItemT
): Promise<any> => {
  if (!processInstanceId || !taskId || !taskName) {
    showToast(t('expense-item-error-flows'), 'error')
    return null
  }

  try {
    flowClient.setAccessToken(accessToken)
    return await flowClient.completeTaskFlow(
      flowDomain,
      flowProcessName,
      processInstanceId,
      taskName,
      taskId,
      userId,
      submitData
    )
  } catch {
    showToast(t('expense-item-error-flows'), 'error')
    return null
  }
}
