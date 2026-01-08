import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ExtractedTaskInfo {
  requesterId?: string
  requesterName?: string
  taskType: string
  taskData: Record<string, any>
  taskId?: string
}

/**
 * Automatically extracts task information from additionalData
 * Works with any Every Box form following standard patterns
 */
export const extractTaskInfo = (
  additionalData?: BusinessAppContextProps['additionalData']
): ExtractedTaskInfo | null => {
  if (!additionalData) return null

  const taskPayload = additionalData.psi_taskPayload || {}
  const processMetadata = additionalData.psi_processMetadata || {}
  const taskStatus = additionalData.psi_taskStatus

  // Extract requester information (multiple possible sources)
  const requesterId =
    processMetadata.flowInitiatedBy ||
    taskPayload.requesterId ||
    taskPayload.creatorUserId ||
    taskPayload.employeeDetails?.userId

  const requesterName =
    taskPayload.creatorName ||
    processMetadata.flowInitiatedByName ||
    taskPayload.requesterName ||
    taskPayload.employeeName ||
    (taskPayload.employeeDetails?.firstName && taskPayload.employeeDetails?.lastName
      ? `${taskPayload.employeeDetails.firstName} ${taskPayload.employeeDetails.lastName}`
      : undefined)

  // Determine task type from various sources
  const taskType =
    taskPayload.taskName ||
    processMetadata.processName ||
    additionalData.psi_taskName ||
    inferTaskTypeFromPayload(taskPayload) ||
    'Task'

  // Extract all relevant task data (filter out system fields)
  const taskData = extractRelevantTaskData(taskPayload)

  // Add task status if available
  if (taskStatus) {
    taskData.status = taskStatus
  }

  // Add any high-level metadata
  if (processMetadata.status) {
    taskData.processStatus = processMetadata.status
  }

  return {
    requesterId,
    requesterName,
    taskType: formatTaskTypeName(taskType),
    taskData,
    taskId: taskPayload.id || additionalData.psi_taskId
  }
}

/**
 * Extract relevant data from task payload, filtering out system fields
 */
const extractRelevantTaskData = (payload: any): Record<string, any> => {
  const systemFields = new Set([
    'id',
    'version',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'taskName',
    'processName',
    'requesterId',
    'creatorUserId',
    'creatorName',
    'requesterName',
    'endpoint'
  ])

  const extracted: Record<string, any> = {}

  Object.entries(payload).forEach(([key, value]) => {
    // Skip system fields and null/undefined values
    if (systemFields.has(key) || value === null || value === undefined) {
      return
    }

    // Handle nested objects (like employeeAbsence, expenseRequest, etc.)
    if (typeof value === 'object' && !Array.isArray(value)) {
      // If it looks like a main entity, flatten it
      if (isMainEntity(key)) {
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (!systemFields.has(nestedKey) && nestedValue !== null && nestedValue !== undefined) {
            extracted[nestedKey] = nestedValue
          }
        })
      } else {
        extracted[key] = value
      }
    } else if (Array.isArray(value) && value.length > 0) {
      // Include arrays but summarize if too long
      extracted[key] = value.length > 5 ? `${value.length} items` : value
    } else {
      extracted[key] = value
    }
  })

  return extracted
}

/**
 * Detect if a field represents the main entity (to flatten it)
 */
const isMainEntity = (fieldName: string): boolean => {
  const entityPatterns = [
    'absence',
    'vacation',
    'expense',
    'request',
    'approval',
    'document',
    'order',
    'invoice',
    'contract',
    'lead',
    'opportunity',
    'contact',
    'account',
    'task'
  ]

  const lowerField = fieldName.toLowerCase()
  return entityPatterns.some(pattern => lowerField.includes(pattern))
}

/**
 * Infer task type from payload structure
 */
const inferTaskTypeFromPayload = (payload: any): string | null => {
  if (payload.employeeAbsence) return 'Vacation Approval'
  if (payload.expenseRequest) return 'Expense Approval'
  if (payload.documentRequest) return 'Document Review'
  if (payload.leaveRequest) return 'Leave Request'
  if (payload.purchaseOrder) return 'Purchase Order Approval'
  if (payload.contractReview) return 'Contract Review'

  // Check for common field patterns
  if (payload.absenceType || (payload.startDate && payload.endDate)) {
    return 'Time Off Request'
  }
  if (payload.amount && payload.category) {
    return 'Expense Request'
  }

  return null
}

/**
 * Format task type name to be user-friendly
 */
const formatTaskTypeName = (taskName: string): string => {
  return taskName
    .replace(/([A-Z])/g, ' $1') // Add spaces before capitals
    .replace(/_/g, ' ') // Replace underscores
    .replace(/-/g, ' ') // Replace hyphens
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
