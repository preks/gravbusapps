import type { CommonTask, CommonTaskComment, CommonTaskTemplate } from '@/common/data/relations/types/commonTaskTypes'
import { COMMON_TASK_DESCRIPTORS } from '@/common/data/relations/types/commonTaskTypes'
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

export interface CustomerTask extends CommonTask {
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

export interface CustomerTaskTemplate extends CommonTaskTemplate {
  tasks?: CustomerTask[] // Mapped by salesTask

  // Base fields for mapping
  salesTask?: CustomerTask[] // Mapped to tasks
}

export interface CustomerTaskComment extends CommonTaskComment {
  task?: CustomerTask // Mapped by customerTask
  taskId?: string // Mapped by customerTaskId

  // Base fields for mapping
  customerTask?: CustomerTask // Mapped to task
  customerTaskId?: string // Mapped to taskId
}

/**
 * Customer Task Descriptors
 * Extends Common descriptors with CRM-specific path overrides for wrong field names
 */
export const CUSTOMER_TASK_DESCRIPTORS: Descriptor[] = [
  // Filter out descriptors we need to override for CRM wrong field names
  ...COMMON_TASK_DESCRIPTORS.filter(
    d =>
      ![
        'taskPriority',
        'taskPriorityRef',
        'taskStatus',
        'taskStatusRef',
        'taskType',
        'taskTypeRef',
        'taskTemplate',
        'taskTemplateId',
        'taskPriorityIds',
        'taskStatusIds',
        'taskTypeIds',
        'taskTemplateIds'
      ].includes(d.key)
  ),

  // CRM-specific path overrides (key remains IRM-correct name, but paths use CRM field names)
  {
    key: 'taskPriority',
    searchPaths: ['priority.value', 'priority.code'],
    sortPath: 'priority.value',
    type: 'text'
  },
  { key: 'taskPriorityRef', searchPaths: ['priorityRef'], sortPath: 'priorityRef', type: 'text' },
  {
    key: 'taskStatus',
    searchPaths: ['status.value', 'status.code'],
    sortPath: 'status.value',
    type: 'text'
  },
  { key: 'taskStatusRef', searchPaths: ['statusRef'], sortPath: 'statusRef', type: 'text' },
  {
    key: 'taskType',
    searchPaths: ['type.value', 'type.code'],
    sortPath: 'type.value',
    type: 'text'
  },
  { key: 'taskTypeRef', searchPaths: ['typeRef'], sortPath: 'typeRef', type: 'text' },
  {
    key: 'taskTemplate',
    searchPaths: ['salesTaskTemplate.name'],
    sortPath: 'salesTaskTemplate.name',
    type: 'text'
  },
  { key: 'taskTemplateId', searchPaths: ['salesTaskTemplateId'], sortPath: 'salesTaskTemplateId', type: 'text' },

  // CRM-specific filter path overrides
  { key: 'taskPriorityIds', path: 'priorityRef', kind: 'inIds' },
  { key: 'taskStatusIds', path: 'statusRef', kind: 'inIds' },
  { key: 'taskTypeIds', path: 'typeRef', kind: 'inIds' },
  { key: 'taskTemplateIds', path: 'salesTaskTemplateId', kind: 'inIds' }
]
