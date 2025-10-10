import { ApprovalRequest } from '../types'

/**
 * Creates approval payload based on tab type and selected tasks
 */
export const createApprovalPayload = (
  tasks: ApprovalRequest[],
  tabConfig: any,
  message: string,
  userInfo: any,
  rawTasks: any[]
) => {
  const today = new Date().toISOString()
  const employeeId = userInfo?.employeeDetails?.employeeId

  // Check if tasks array is not empty
  if (tasks.length === 0) {
    throw new Error('Tasks array is empty - no tasks provided for approval')
  }

  const firstSelectedTaskId = tasks[0].id
  const firstSelectedTask = tasks.find(task => task.id === firstSelectedTaskId)

  if (!firstSelectedTask) {
    throw new Error('Could not find original task data')
  }

  const getEntityId = (task: any, tabKey: string) => {
    let entityId = null
    if (task.variables) {
      switch (tabKey) {
        case 'advance-payment':
          entityId = task.variables.advancePaymentId || task.variables.paymentId || task.variables.advancePayment?.id
          break
        case 'expense-request':
          entityId = task.variables.expenseRequestId || task.variables.requestId || task.variables.expenseRequest?.id
          break
        case 'expense-plan':
          entityId = task.variables.expensePlanId || task.variables.planId || task.variables.expensePlan?.id
          break
        case 'handout-payment':
          entityId = task.variables.handoutPaymentId || task.variables.paymentId || task.variables.handoutPayment?.id
          break
        case 'transfer-payment':
          entityId = task.variables.transferPaymentId || task.variables.paymentId || task.variables.transferPayment?.id
          break
      }
      if (entityId) {
        return entityId
      }
    }

    // If not found in variables, extract process instance ID from endpoint
    if (task.endpoint) {
      const endpointParts = task.endpoint.split('/')
      const processNameIndex = endpointParts.findIndex(
        (part: string) =>
          part === 'approveExpensePlan' ||
          part === 'approveExpenseRequest' ||
          part === 'approveAdvancePayment' ||
          part === 'handOutAdvancePayment' ||
          part === 'transferAdvancePayment'
      )

      if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
        entityId = endpointParts[processNameIndex + 1]
      }
    }

    // Fallback to processInstanceId if available
    if (!entityId && task.processInstanceId) {
      entityId = task.processInstanceId
    }

    // Final fallback to task ID
    if (!entityId) {
      entityId = task.id
    }

    return entityId
  }

  const entityId = getEntityId(
    rawTasks.find(t => t.id === firstSelectedTask.id),
    tabConfig.key
  )

  // Create payload based on tab type
  switch (tabConfig.key) {
    case 'expense-plan':
      return {
        event: 'pse_approve',
        expensePlanComment: {
          commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          expensePlan: entityId
        }
      }

    case 'expense-request':
      return {
        event: 'pse_approve',
        expenseRequestComment: {
          commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          expenseRequest: entityId
        }
      }

    case 'advance-payment':
      return {
        event: 'pse_approve',
        advancePaymentComment: {
          commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          advancePayment: entityId
        }
      }

    case 'handout-payment':
      return {
        event: 'pse_approve',
        handoutPaymentComment: {
          commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          handoutPayment: entityId
        }
      }

    case 'transfer-payment':
      return {
        event: 'pse_approve',
        transferPaymentComment: {
          commentDate: today.slice(0, 19), // Format: YYYY-MM-DDTHH:mm:ss (without timezone)
          comment: message || '',
          commentType: 'APPROVE_COMMENT',
          authorEmployee: employeeId,
          transferPayment: entityId
        }
      }

    default:
      throw new Error(`Unknown tab type: ${tabConfig.key}`)
  }
}
