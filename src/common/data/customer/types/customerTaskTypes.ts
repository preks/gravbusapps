import type { Task, TaskComment, TaskTemplate } from '@/common/data/relations/types/taskTypes'
import { TaskFields, createTaskDescriptors } from '@/common/data/relations/types/taskTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { TaskTiming } from '@/common/data/relations/constants/commonTaskConstants'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { SourceTable } from './customerEnums'
import type {
  CustomerAccount,
  CustomerContact,
  CustomerDocument,
  CustomerLead,
  CustomerOpportunityStageCondition,
  CustomerOpportunity
} from './'

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

export type CustomerTaskFieldName = (typeof CustomerTaskFields)[keyof typeof CustomerTaskFields]

/**
 * Customer Task Descriptors
 * Uses createTaskDescriptors with CustomerTaskFields mapping
 */
export const CUSTOMER_TASK_DESCRIPTORS: Descriptor[] = [
  ...createTaskDescriptors(CustomerTaskFields as Record<keyof typeof TaskFields, string>).filter(
    d => !['comments'].includes(d.key)
  ),
  {
    key: 'comments',
    searchPaths: ['comment'],
    sortPaths: ['comment'],
    type: 'text'
  }
]
