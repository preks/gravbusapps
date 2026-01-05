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

  // NEW: Multiple assignees support (replaces single assignedEmployee in base Task)
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
 * Adds IRM-specific reference field
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
  }
]

/**
 * Build Investment Task Payload
 * Uses buildPayload utility with InvestmentTaskFormFields mapping
 * IRM-SPECIFIC: Transforms assignee data to multiple assignees array
 * Supports both multi-assignee mode (assignedEmployeeIds) and single-assignee mode (assignedEmployeeId)
 * NOTE: This is ONLY for IRM - CRM still uses single assignee structure
 */
export const buildInvestmentTaskPayload = (task: Partial<InvestmentTask> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(task, InvestmentTaskFormFields)

  // IRM-SPECIFIC: Transform assignee data to multiple assignees array
  // Backend expects taskAssignees array instead of assignedEmployee fields

  // Check if we have multi-assignee data (new form format)
  const hasMultiAssignees = payload.assignedEmployeeIds && Array.isArray(payload.assignedEmployeeIds)
  const hasSingleAssignee = payload.assignedEmployee || payload.assignedEmployeeId || payload.assignedUserId

  if (hasMultiAssignees && payload.assignedEmployeeIds.length > 0) {
    // Create taskAssignees from assignedEmployeeIds array
    payload.taskAssignees = payload.assignedEmployeeIds.map((employeeId: string, index: number) => {
      const employee = payload.assignedEmployees?.[index]
      return {
        assignedEmployeeId: employeeId,
        assignedEmployee: employee,
        assignedUserId: employee?.userId
      }
    })

    // Remove form-specific fields
    delete payload.assignedEmployeeIds
    delete payload.assignedEmployees
  } else if (hasSingleAssignee) {
    // Backward compatibility: Single assignee to array
    payload.taskAssignees = [
      {
        assignedEmployee: payload.assignedEmployee,
        assignedEmployeeId: payload.assignedEmployeeId,
        assignedUserId: payload.assignedUserId
      }
    ]
  }

  // Remove old single-assignee fields (backend doesn't accept these anymore for IRM)
  delete payload.assignedEmployee
  delete payload.assignedEmployeeId
  delete payload.assignedUserId

  return {
    investmentTask: payload
  }
}
