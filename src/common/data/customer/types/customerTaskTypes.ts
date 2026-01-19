import {
  type Task,
  type TaskComment,
  type TaskTemplate,
  TaskFields,
  TaskFormFields,
  createTaskDescriptors
} from '@/common/data/relations/types/taskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { TaskTiming } from '@/common/data/relations/constants/taskConstants'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './customerEnums'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerContact } from './customerContactTypes'
import type { CustomerDocument } from './customerDocumentTypes'
import type { CustomerLead } from './customerLeadTypes'
import type { CustomerOpportunity, CustomerOpportunityStageCondition } from './customerOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface CustomerTask extends Task {
  account?: CustomerAccount
  comments?: CustomerTaskComment[] // Mapped from comment
  contact?: CustomerContact
  documents?: CustomerDocument[]
  lead?: CustomerLead
  opportunityStageCondition?: CustomerOpportunityStageCondition
  opportunity?: CustomerOpportunity
  source?: SourceTable
  taskTemplate?: CustomerTaskTemplate // Mapped from salesTaskTemplate

  // Base fields for mapping
  comment?: string // Mapped to comments
  priority?: CatalogEntry // Mapped to taskPriority
  priorityRef?: string // Mapped to taskPriorityRef
  status?: CatalogEntry // Mapped to taskStatus
  statusRef?: string // Mapped to taskStatusRef
  salesTaskTemplate?: CustomerTaskTemplate // Mapped to taskTemplate
  salesTaskTemplateId?: string // Mapped to taskTemplateId
  timingType?: TaskTiming // Mapped to taskTiming
  type?: CatalogEntry // Mapped to taskType
  typeRef?: string // Mapped to taskTypeRef
}

export interface CustomerTaskTemplate extends TaskTemplate {
  tasks?: CustomerTask[] // Mapped by salesTask

  // Base fields for mapping
  salesTask?: CustomerTask[] // Mapped to tasks
}

export interface CustomerTaskComment extends TaskComment {
  task?: CustomerTask // Mapped by customerTask
  taskId?: string // Mapped by customerTaskId

  // Base fields for mapping
  customerTask?: CustomerTask // Mapped to task
  customerTaskId?: string // Mapped to taskId
}

/**
 * Customer Task Query Field Mapping
 * Extends TaskFields with CRM-specific GraphQL field names
 */
export const CustomerTaskFields = {
  ...TaskFields,
  // Override CRM-specific field names
  comments: 'comment', // CRM uses singular "comment"
  taskPriority: 'priority',
  taskPriorityRef: 'priorityRef',
  taskStatus: 'status',
  taskStatusRef: 'statusRef',
  taskTiming: 'timingType',
  taskType: 'type',
  taskTypeRef: 'typeRef',
  taskTemplate: 'salesTaskTemplate',
  taskTemplateId: 'salesTaskTemplateId'
} as const

export const CustomerTaskFormFields = {
  ...TaskFormFields,
  taskPriorityRef: 'priorityRef',
  taskStatusRef: 'statusRef',
  taskTiming: 'timingType',
  taskTypeRef: 'typeRef',
  taskTemplateId: 'salesTaskTemplate'
}

/**
 * Customer Task Descriptors
 * Uses createTaskDescriptors with CustomerTaskFields mapping
 */
export const CUSTOMER_TASK_DESCRIPTORS: Descriptor[] = [
  ...createTaskDescriptors(CustomerTaskFields as Record<keyof typeof TaskFields, string>).filter(
    d => !['comments', 'opportunityStageCondition'].includes(d.key)
  ),
  {
    key: 'comments',
    searchPaths: ['comment'],
    sortPaths: ['comment'],
    type: 'text'
  }
]

/**
 * Build Customer Task Payload
 * Uses buildPayload utility with CustomerTaskFormFields mapping
 * Transforms assignee data to taskAssignees array
 */
export const buildCustomerTaskPayload = (task: Partial<CustomerTask> & Record<string, any>) => {
  // Build base payload using buildPayload utility (handles most fields)
  const payload = buildPayload(task, CustomerTaskFormFields)

  // Manually construct taskAssignees to preserve assignedUserId field name
  // (buildPayload's transformIdFields would transform assignedUserId → assignedUser, which is wrong)
  // taskAssignees array comes from form with id/version already set by TaskForm's useEffect
  if (task.taskAssignees && Array.isArray(task.taskAssignees)) {
    payload.taskAssignees = task.taskAssignees.map((ta: any) => ({
      ...(ta.id && { id: ta.id }),
      ...(ta.version !== undefined && { version: ta.version }),
      assignedEmployee: ta.assignedEmployeeId, // Transform assignedEmployeeId → assignedEmployee
      assignedUserId: ta.assignedUserId, // Preserve assignedUserId field name (don't transform!)
      ...(ta.taskStatus && { taskStatus: ta.taskStatus }), // Preserve existing status (backend sets default)
      ...(ta.completedAt && { completedAt: ta.completedAt })
    }))
  }

  // Get creator employee details (from task or context)
  // Priority: _creatorEmployee (set by formPreSubmitUtils) > creatorEmployee > creatorUserId
  const creatorEmployee = task._creatorEmployee || task.creatorEmployee
  const userId = creatorEmployee?.userId || task.creatorUserId

  if (!userId) {
    console.error('Task operation failed: Missing creator user ID', {
      task: { ...task, _creatorEmployee: undefined },
      creatorEmployee
    })
    throw new Error('Unable to determine current user. Please ensure you are logged in and try again.')
  }

  return {
    // TOP-LEVEL: Creator's employee details (required by Kogito process)
    // Only userId is needed - backend will look up full employee record
    employeeDetails: {
      userId: userId
    },
    salesTask: payload
  }
}
