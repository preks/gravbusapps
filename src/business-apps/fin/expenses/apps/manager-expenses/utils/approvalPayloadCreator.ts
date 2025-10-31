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
  console.log('tasks', tasks)
  const firstSelectedTask = tasks.find(task => task.id === firstSelectedTaskId)

  if (!firstSelectedTask) {
    throw new Error('Could not find original task data')
  }

  const getEntityId = (task: any, tabKey: string) => {
    console.log('variables', task.variables)
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
          console.log('88888', task.variables)
          entityId = task.variables.transferPaymentId || task.variables.paymentId || task.variables.transferPayment?.id
          break
      }
      if (entityId) {
        console.log('77777', entityId)
        return entityId
      }
      console.log('99999', entityId)
    }
    console.log('101010', entityId)
    // If not found in variables, extract process instance ID from endpoint
    if (task.endpoint) {
      console.log('intra if endpoint', task.endpoint)
      const endpointParts = task.endpoint.split('/')
      const processNames = [
        'approveExpensePlan',
        'approveExpenseRequest',
        'approveAdvancePayment',
        'handOutAdvancePayment',
        'transferAdvancePayment'
      ]

      let processNameIndex = -1

      // For transferAdvancePayment, check if there's a second occurrence
      if (tabKey === 'transfer-payment') {
        const firstIndex = endpointParts.findIndex((part: string) => part === 'transferAdvancePayment')
        if (firstIndex !== -1) {
          // Look for second occurrence starting after the first one
          const secondIndex = endpointParts.findIndex(
            (part: string, index: number) => part === 'transferAdvancePayment' && index > firstIndex
          )
          processNameIndex = secondIndex !== -1 ? secondIndex : firstIndex
        }
      } else {
        processNameIndex = endpointParts.findIndex((part: string) => processNames.includes(part))
      }

      if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
        entityId = endpointParts[processNameIndex + 1]
        console.log('intra if entityId nested', entityId)
      }
    }

    // Fallback to processInstanceId if available
    if (!entityId && task.processInstanceId) {
      console.log('intra if', task.processInstanceId)
      entityId = task.processInstanceId
    }

    // Final fallback to task ID
    if (!entityId) {
      entityId = task.id
      console.log('intra if entityId final', entityId)
    }

    return entityId
  }

  const entityId = getEntityId(
    rawTasks.find(t => t.id === firstSelectedTask.id),
    tabConfig.key
  )
  console.log('66666', tabConfig.key)
  console.log('2222', entityId)
  console.log('3333', rawTasks)
  console.log('4444', firstSelectedTask)
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
      console.log(
        '113334111',
        rawTasks.find(t => t.id === entityId)
      )
      return {
        advancePayment: {
          id: rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.id || '',
          version: rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.version || 0,
          amount: rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.amount || 0,
          transactionDate: rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.transactionDate || '',
          transactionNumber: rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.transactionNumber || '',
          transactionConfirmed:
            rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.transactionConfirmed || false,
          transactionConfirmedByEmployee:
            rawTasks.find(t => t.id === entityId)?.inputs?.advancePayment?.transactionConfirmedByEmployee || ''
        },
        event: 'pse_approve'
      }

    case 'transfer-payment':
      console.log(
        '111111',
        rawTasks.find(t => t.processInstanceId === entityId)
      )
      return {
        advancePayment: {
          id: rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.id || '',
          version: rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.version || 0,
          amount: rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.amount || 0,
          transactionDate:
            rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.transactionDate || '',
          transactionNumber:
            rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.transactionNumber || '',
          transactionConfirmed:
            rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment?.transactionConfirmed || false,
          transactionConfirmedByEmployee:
            rawTasks.find(t => t.processInstanceId === entityId)?.inputs?.advancePayment
              ?.transactionConfirmedByEmployee || ''
        },
        event: 'pse_approve'
      }

    default:
      throw new Error(`Unknown tab type: ${tabConfig.key}`)
  }
}
