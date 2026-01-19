import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import {
  type Task,
  type TaskComment,
  type TaskTemplate,
  TaskFields,
  TaskFormFields,
  createTaskDescriptors
} from '@/common/data/relations/types/taskTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { SourceTable } from './investmentEnums'
import type { Investment } from './investmentTypes'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunity, InvestmentOpportunityStageCondition } from './investmentOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

/**
 * Investment Task Assignee (NEW - Multiple Assignees Support)
 * Represents individual assignees for tasks (many-to-many relationship)
 */
export interface InvestmentTaskAssignee extends BaseEntity {
  id: string
  taskId?: string
  task?: InvestmentTask

  // Assignee information (moved from InvestmentTask)
  assignedEmployee?: Employee
  assignedEmployeeId?: string
  assignedUserId?: string

  // Per-assignee status tracking
  taskStatus?: string
  completedAt?: string

  // Process tracking
  processInstanceId?: string
  businessKey?: string
  recordState?: string
}

export interface InvestmentTask extends Task {
  account?: InvestmentAccount
  comments?: InvestmentTaskComment[]
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  investmentId?: string
  lead?: InvestmentLead
  opportunityStageCondition?: InvestmentOpportunityStageCondition // Mapped from investmentOpportunityStageCondition
  opportunity?: InvestmentOpportunity
  source?: SourceTable
  taskTemplate?: InvestmentTaskTemplate

  // Multiple assignees (inherited from Task, extended with IRM-specific InvestmentTaskAssignee type)
  taskAssignees?: InvestmentTaskAssignee[]
  taskAssigneesAggregate?: {
    aggregate: { count: number }
  }

  // Base fields for mapping
  investmentOpportunityStageCondition?: InvestmentOpportunityStageCondition
}

export interface InvestmentTaskTemplate extends TaskTemplate {
  investmentGroup?: CatalogEntry
  investmentGroupRef?: string
  investmentType?: CatalogEntry
  investmentTypeRef?: string
  tasks?: InvestmentTask[] // Mapped by investmentTask

  // Base fields for mapping
  investmentTask?: InvestmentTask[] // Mapped to tasks
}

export interface InvestmentTaskComment extends TaskComment {
  task?: InvestmentTask // Mapped by investmentTask
  taskId?: string // Mapped by investmentTaskId

  // Base fields for mapping
  investmentTask?: InvestmentTask // Mapped to task
  investmentTaskId?: string // Mapped to taskId
}

/**
 * Investment Task Query Field Mapping
 * Extends TaskFields with IRM-specific GraphQL field names
 */
export const InvestmentTaskFields = {
  ...TaskFields,
  // Override IRM-specific field names
  opportunityStageCondition: 'investmentOpportunityStageCondition',
  // Add IRM-specific investment fields
  investment: 'investment',
  investmentId: 'investmentId',
  // Add multiple assignees support
  taskAssignees: 'taskAssignees',
  taskAssigneesAggregate: 'taskAssigneesAggregate'
} as const

/**
 * Investment Task Assignee Field Mapping
 */
export const InvestmentTaskAssigneeFields = {
  id: 'id',
  taskId: 'taskId',
  task: 'task',
  assignedEmployee: 'assignedEmployee',
  assignedEmployeeId: 'assignedEmployeeId',
  assignedUserId: 'assignedUserId',
  taskStatus: 'taskStatus',
  completedAt: 'completedAt',
  processInstanceId: 'processInstanceId',
  businessKey: 'businessKey',
  recordState: 'recordState'
} as const

export const InvestmentTaskFormFields = {
  ...TaskFormFields,
  investmentId: 'investment'
} as const

/**
 * Investment Task Descriptors
 * Uses createTaskDescriptors with InvestmentTaskFields mapping
 * Adds IRM-specific reference field and investment descriptor
 * NOTE: assignedEmployeeIds filtering handled separately via taskAssignees relationship
 */
export const INVESTMENT_TASK_DESCRIPTORS: Descriptor[] = [
  ...createTaskDescriptors(InvestmentTaskFields as Record<keyof typeof TaskFields, string>).filter(
    d => d.key !== 'reference' && d.key !== 'assignedEmployeeIds' // Remove assignedEmployeeIds - handled via taskAssignees
  ),
  {
    key: 'reference',
    searchPaths: [
      'account.name',
      'contact.firstName',
      'contact.lastName',
      'investment.name',
      'lead.firstName',
      'lead.lastName',
      'opportunity.name'
    ],
    sortPaths: [`${InvestmentTaskFields.source}`],
    type: 'text'
  },
  // Add investment descriptor (IRM-specific)
  {
    key: 'investment',
    searchPaths: [`${InvestmentTaskFields.investment}.name`, `${InvestmentTaskFields.investment}.code`],
    sortPath: `${InvestmentTaskFields.investment}.name`,
    type: 'text'
  },
  // Add investment ID filter
  {
    key: 'investmentIds',
    path: InvestmentTaskFields.investmentId,
    kind: 'inIds'
  }
]

/**
 * Build Investment Task Payload
 * Uses common buildTaskPayload with IRM-specific wrapper
 */
export const buildInvestmentTaskPayload = (task: Partial<InvestmentTask> & Record<string, any>) => {
  // Build base payload using buildPayload utility (handles most fields)
  const payload = buildPayload(task, InvestmentTaskFormFields)

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
    investmentTask: payload
  }
}
