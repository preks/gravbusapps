import { FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { ApprovalRequest } from '../types'

// --- Small helpers to keep mapping logic simple and readable ---
const getTaskGroup = (taskName: string = ''): string => {
  if (taskName.includes('ExpensePlan')) return 'Expense Plan'
  if (taskName.includes('ExpenseRequest')) return 'Request'
  if (taskName.includes('AdvancePayment')) return 'Advance Payment Request'
  if (taskName.includes('Transfer')) return 'Transfer'
  if (taskName.includes('Handout')) return 'Handout'
  return 'Request'
}

const isAdvancePaymentTask = (taskName?: string): boolean => {
  if (!taskName) return false
  return taskName.includes('AdvancePayment') || taskName.includes('Transfer') || taskName.includes('Handout')
}

const pickAmountFromInputs = (task: FlowExecutionTask): number => {
  const i = task.inputs as any
  if (!i) return 0

  // For advance payment related tasks, prioritize advancePayment.amount
  if (isAdvancePaymentTask(task.name) && i.advancePayment?.amount) {
    return i.advancePayment.amount
  }

  if (i.expenseRequest?.totalAmount) return i.expenseRequest.totalAmount
  if (i.expensePlan?.totalAmount) return i.expensePlan.totalAmount
  if (i.advancePayment?.amount) return i.advancePayment.amount
  return 0
}

const pickAmountFromVars = (task: FlowExecutionTask): number => {
  const v = task.variables as any
  return v?.totalAmount || v?.amount || v?.expenseAmount || 0
}

const extractTotalAmount = (task: FlowExecutionTask): number => {
  const fromInputs = pickAmountFromInputs(task)
  return fromInputs === 0 ? pickAmountFromVars(task) : fromInputs
}

const readCurrencyPart = (value?: string): string => {
  if (!value) return 'EUR'
  const parts = String(value).split(':')
  return parts.pop() || 'EUR'
}

const pickCurrencyFromInputs = (task: FlowExecutionTask): string | null => {
  const i = task.inputs as any
  if (!i) return null
  if (i.expenseRequest?.currencyRef) return readCurrencyPart(i.expenseRequest.currencyRef)
  if (i.expensePlan?.currencyRef) return readCurrencyPart(i.expensePlan.currencyRef)
  if (i.advancePayment?.currencyRef) return readCurrencyPart(i.advancePayment.currencyRef)
  return null
}

const extractCurrency = (task: FlowExecutionTask): string => {
  const fromInputs = pickCurrencyFromInputs(task)
  if (fromInputs) return fromInputs
  const v = task.variables as any
  return readCurrencyPart(v?.currencyRef || v?.currency)
}

const formatTaskName = (name?: string): string => {
  if (!name) return 'Task'
  const spaced = name
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Za-z])(\d)/g, '$1 $2')
    .replaceAll(/(\d)([A-Za-z])/g, '$1 $2')
    .replaceAll(/Store\s?Director/g, 'Store Director')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const buildTitle = (task: FlowExecutionTask): string => {
  const linkedEntityTitle =
    (task.inputs as any)?.expensePlan?.title ||
    (task.inputs as any)?.expenseRequest?.title ||
    (task.variables as any)?.title ||
    (task.variables as any)?.requestTitle ||
    null

  if (task.referenceName && /for\s+"/.test(task.referenceName)) {
    return task.referenceName // already includes request title
  }
  if (linkedEntityTitle) {
    return `${formatTaskName(task.name)} - ${linkedEntityTitle}`
  }
  return task.referenceName || formatTaskName(task.name) || 'Untitled Request'
}

const extractEmployee = (task: FlowExecutionTask) => {
  const v = task.variables as any
  const id = task.creatorUserId || v?.employeeId || v?.requestorId || ''
  const firstName = task.creatorName?.split(' ')[0] || v?.employeeFirstName || v?.requestorFirstName || 'Unknown'
  const lastName =
    task.creatorName?.split(' ').slice(1).join(' ') || v?.employeeLastName || v?.requestorLastName || 'Employee'
  const fullName = task.creatorName || v?.employeeFullName || v?.requestorFullName || 'Unknown Employee'
  return { id, firstName, lastName, fullName }
}

const extractEntityFromInputs = (task: FlowExecutionTask) => {
  const i = task.inputs as any
  let entityId: string | undefined
  let rawEntityData: any = null

  if (i?.expensePlan) {
    entityId = i.expensePlan.id
    rawEntityData = i.expensePlan
  } else if (i?.expenseRequest) {
    entityId = i.expenseRequest.id
    rawEntityData = i.expenseRequest
  } else if (i?.advancePayment) {
    entityId = i.advancePayment.id
    rawEntityData = i.advancePayment
  }

  return { entityId, rawEntityData }
}

const extractProcessInstanceId = (task: FlowExecutionTask): string | undefined => {
  if (!task.endpoint) return undefined
  const endpointParts = task.endpoint.split('/')
  const processNameIndex = endpointParts.findIndex(
    (part: string) =>
      part.startsWith('approveExpensePlan') ||
      part.startsWith('approveExpenseRequest') ||
      part.startsWith('approveAdvancePayment') ||
      part.startsWith('payAdvancePayment') ||
      part.startsWith('handOutAdvancePayment') ||
      part.startsWith('transferAdvancePayment')
  )
  if (processNameIndex !== -1 && endpointParts[processNameIndex + 1]) {
    return endpointParts[processNameIndex + 1]
  }
  return undefined
}

/**
 * Maps FlowExecutionTask to ApprovalRequest for compatibility with existing UI
 */
export const mapFlowTaskToApprovalRequest = (task: FlowExecutionTask): ApprovalRequest => {
  const totalAmount = extractTotalAmount(task)
  const currency = extractCurrency(task)
  const status = task.state || (task.variables as any)?.status || (task.variables as any)?.requestStatus || 'PENDING'
  const title = buildTitle(task)
  const description =
    (task.variables as any)?.description || (task.variables as any)?.requestDescription || task.description || null
  const employee = extractEmployee(task)
  const createdAt = task.started || task.createdAt || task.lastUpdate || new Date().toISOString()

  const { entityId, rawEntityData } = extractEntityFromInputs(task)
  const processInstanceId = extractProcessInstanceId(task)

  return {
    id: task.id,
    title,
    description,
    totalAmount: typeof totalAmount === 'number' ? totalAmount : 0,
    currency,
    status,
    requestDate: createdAt,
    createdAt: createdAt,
    taskGroup: getTaskGroup(task.name),
    taskName: task.name,
    employee: {
      id: employee.id,
      fullName: employee.fullName || `${employee.firstName} ${employee.lastName}`,
      firstName: employee.firstName,
      lastName: employee.lastName
    },
    // Optimization fields: store entity data to avoid GET calls during approval
    entityId,
    processInstanceId,
    taskInstanceId: task.id,
    rawEntityData
  }
}

/**
 * Maps an array of FlowExecutionTask to ApprovalRequest array
 */
export const mapFlowTasksToApprovalRequests = (tasks: FlowExecutionTask[]): ApprovalRequest[] => {
  if (!tasks || tasks.length === 0) {
    return []
  }
  return tasks.map(mapFlowTaskToApprovalRequest)
}
