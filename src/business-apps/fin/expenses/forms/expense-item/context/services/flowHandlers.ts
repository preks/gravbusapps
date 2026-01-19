import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { flowClient } from '@/common/network/flows/FlowClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Initiates a workflow process for expense item changes
 * @param accessToken Access token for authentication
 * @param employeeId Employee ID for the process
 * @returns Promise with the process initiation result
 */
export const initiateFlow = async (
  accessToken: string,
  employeeId: string,
  flowDomain: string,
  flowProcessName: string
): Promise<any> => {
  if (!employeeId) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.employee_id_not_found',
        'Employee ID not found'
      ),
      'error'
    )
    return null
  }

  try {
    flowClient.setAccessToken(accessToken)
    return await flowClient.initiateFlow(flowDomain, flowProcessName, { employeeId })
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return null
  }
}

/**
 * Gets the opened task flow for a specific process instance
 * @param accessToken Access token for authentication
 * @param userId User ID for the tasks
 * @param processInstanceId Process instance ID from initiateFlow
 * @returns Promise with the opened task flow result
 */
export const getOpenedTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  flowDomain: string,
  flowProcessName: string
): Promise<any> => {
  if (!processInstanceId) {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return null
  }

  try {
    flowClient.setAccessToken(accessToken)
    return await flowClient.getOpenedTaskFlow(flowDomain, flowProcessName, processInstanceId, userId)
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return null
  }
}

/**
 * Completes a task in the workflow process
 * @param accessToken Access token for authentication
 * @param userId User ID for the task
 * @param processInstanceId Process instance ID from initiateFlow
 * @param taskName Task name from getOpenedTaskFlow
 * @param taskId Task ID from getOpenedTaskFlow
 * @param submitData Data to submit with the task completion
 * @returns Promise with the task completion result
 */
export const completeTaskFlow = async (
  accessToken: string,
  userId: string,
  processInstanceId: string,
  taskName: string,
  taskId: string,
  submitData: any,
  flowDomain: string,
  flowProcessName: string
): Promise<any> => {
  if (!processInstanceId || !taskId || !taskName) {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
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
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return null
  }
}
