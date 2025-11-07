import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { TaskTiming } from '../constants/commonTaskConstants'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface CommonTask extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  assignedEmployee?: Employee // IRM | CRM
  assignedEmployeeId?: string // IRM | CRM
  assignedUserId?: string // IRM | CRM
  code?: string // IRM | CRM
  comments?: any[] // IRM | TODO
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  creatorEmployee?: Employee // IRM | CRM
  creatorEmployeeId?: string // IRM | CRM
  creatorUserId?: string // IRM | CRM | TODO: deprecated --> createdBy
  description?: string // IRM | CRM
  documents?: any[] // IRM | CRM
  dueDate?: string // IRM | CRM
  endDate?: string // IRM | CRM
  id: string // IRM | CRM
  lead?: any // IRM | CRM
  leadId?: string // IRM | CRM
  name?: string // IRM | CRM
  opportunityStageCondition?: any // TODO | TODO
  opportunity?: any // IRM | CRM
  opportunityId?: string // IRM | CRM
  source?: string // IRM | CRM
  startDate?: string // IRM | CRM
  taskPriority?: CatalogEntry // IRM | TODO
  taskPriorityRef?: string // IRM | TODO
  taskStatus?: CatalogEntry // IRM | TODO
  taskStatusRef?: string // IRM | TODO
  taskTemplate?: any // IRM | TODO
  taskTemplateId?: string // IRM | TODO
  taskTiming?: TaskTiming // IRM | TODO
  taskType?: CatalogEntry // IRM | TODO
  taskTypeRef?: string // IRM | TODO
  templateStartDate?: string // IRM | CRM

  reference?: TaskReference // Custom
}

export const COMMON_TASK_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  { key: 'accountId', sortPath: 'accountId', type: 'text' },
  {
    key: 'assignedEmployee',
    searchPaths: ['assignedEmployee.displayName', 'assignedEmployee.firstName', 'assignedEmployee.lastName'],
    sortPath: 'assignedEmployee.displayName',
    type: 'text'
  },
  { key: 'assignedEmployeeId', sortPath: 'assignedEmployeeId', type: 'text' },
  { key: 'assignedUserId', searchPaths: ['assignedUserId'], sortPath: 'assignedUserId', type: 'text' },
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'comments', searchPaths: ['comments.comment'], sortPath: 'comments.comment', type: 'text' },
  {
    key: 'contact',
    searchPaths: ['contact.firstName', 'contact.lastName'],
    sortPath: 'contact.lastName',
    type: 'text'
  },
  { key: 'contactId', sortPath: 'contactId', type: 'text' },
  {
    key: 'creatorEmployee',
    searchPaths: ['creatorEmployee.displayName', 'creatorEmployee.firstName', 'creatorEmployee.lastName'],
    sortPath: 'creatorEmployee.displayName',
    type: 'text'
  },
  { key: 'creatorEmployeeId', sortPath: 'creatorEmployeeId', type: 'text' },
  { key: 'creatorUserId', searchPaths: ['creatorUserId'], sortPath: 'creatorUserId', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'dueDate', searchPaths: ['dueDate'], sortPath: 'dueDate', type: 'date' },
  { key: 'endDate', searchPaths: ['endDate'], sortPath: 'endDate', type: 'date' },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'lead',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    sortPath: 'lead.lastName',
    type: 'text'
  },
  { key: 'leadId', sortPath: 'leadId', type: 'text' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  {
    key: 'opportunityStageCondition',
    searchPaths: ['opportunityStageCondition.name'],
    sortPath: 'opportunityStageCondition.name',
    type: 'text'
  },
  {
    key: 'opportunity',
    searchPaths: ['opportunity.name', 'opportunity.description'],
    sortPath: 'opportunity.name',
    type: 'text'
  },
  { key: 'opportunityId', sortPath: 'opportunityId', type: 'text' },
  { key: 'source', searchPaths: ['source'], sortPath: 'source', type: 'text' },
  { key: 'startDate', searchPaths: ['startDate'], sortPath: 'startDate', type: 'date' },
  {
    key: 'taskPriority',
    searchPaths: ['taskPriority.value', 'taskPriority.code'],
    sortPath: 'taskPriority.value',
    type: 'text'
  },
  { key: 'taskPriorityRef', sortPath: 'taskPriorityRef', type: 'text' },
  {
    key: 'taskStatus',
    searchPaths: ['taskStatus.value', 'taskStatus.code'],
    sortPath: 'taskStatus.value',
    type: 'text'
  },
  { key: 'taskStatusRef', sortPath: 'taskStatusRef', type: 'text' },
  { key: 'taskTemplate', searchPaths: ['taskTemplate.name'], sortPath: 'taskTemplate.name', type: 'text' },
  { key: 'taskTemplateId', sortPath: 'taskTemplateId', type: 'text' },
  { key: 'taskTiming', searchPaths: ['taskTiming'], sortPath: 'taskTiming', type: 'text' },
  {
    key: 'taskType',
    searchPaths: ['taskType.value', 'taskType.code'],
    sortPath: 'taskType.value',
    type: 'text'
  },
  { key: 'taskTypeRef', sortPath: 'taskTypeRef', type: 'text' },
  { key: 'templateStartDate', searchPaths: ['templateStartDate'], sortPath: 'templateStartDate', type: 'date' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'assignedEmployeeIds', path: 'assignedEmployeeId', kind: 'inIds' },
  { key: 'contactIds', path: 'contactId', kind: 'inIds' },
  { key: 'creatorEmployeeIds', path: 'creatorEmployeeId', kind: 'inIds' },
  { key: 'leadIds', path: 'leadId', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunityId', kind: 'inIds' },
  { key: 'taskPriorityIds', path: 'taskPriorityRef', kind: 'inIds' },
  { key: 'taskStatusIds', path: 'taskStatusRef', kind: 'inIds' },
  { key: 'taskTemplateIds', path: 'taskTemplateId', kind: 'inIds' },
  { key: 'taskTypeIds', path: 'taskTypeRef', kind: 'inIds' },

  // Date range filters
  { key: 'dueDateAfter', path: 'dueDate', kind: 'dateFrom' },
  { key: 'dueDateBefore', path: 'dueDate', kind: 'dateTo' },
  { key: 'endDateAfter', path: 'endDate', kind: 'dateFrom' },
  { key: 'endDateBefore', path: 'endDate', kind: 'dateTo' },
  { key: 'startDateAfter', path: 'startDate', kind: 'dateFrom' },
  { key: 'startDateBefore', path: 'startDate', kind: 'dateTo' },
  { key: 'templateStartDateAfter', path: 'templateStartDate', kind: 'dateFrom' },
  { key: 'templateStartDateBefore', path: 'templateStartDate', kind: 'dateTo' },

  // Composite display columns (for table sorting)
  // assignedTo: Displays assignedEmployee - sorts by assignedEmployee.displayName
  {
    key: 'assignedTo',
    searchPaths: ['assignedEmployee.displayName', 'assignedEmployee.firstName', 'assignedEmployee.lastName'],
    sortPath: 'assignedEmployee.displayName',
    type: 'text'
  },

  // type: Displays taskType catalog entry - sorts by taskType.value
  { key: 'type', searchPaths: ['taskType.value', 'taskType.code'], sortPath: 'taskType.value', type: 'text' },

  // priority: Displays taskPriority catalog entry - sorts by taskPriority.value
  {
    key: 'priority',
    searchPaths: ['taskPriority.value', 'taskPriority.code'],
    sortPath: 'taskPriority.value',
    type: 'text'
  },

  // status: Displays taskStatus catalog entry - sorts by taskStatus.value
  { key: 'status', searchPaths: ['taskStatus.value', 'taskStatus.code'], sortPath: 'taskStatus.value', type: 'text' },

  // reference: Displays referenceType and referenceId - sorts by reference name fields in priority order
  // Uses sortPaths to try multiple fields (account.name, contact.lastName, lead.lastName, opportunity.name)
  // GraphQL will use the first available field for sorting
  {
    key: 'reference',
    searchPaths: [
      'referenceType',
      'referenceId',
      'account.name',
      'contact.lastName',
      'lead.lastName',
      'opportunity.name'
    ],
    sortPaths: ['account.name', 'contact.lastName', 'lead.lastName', 'opportunity.name'],
    type: 'text'
  },

  // createdBy: Displays creatorEmployee - sorts by creatorEmployee.displayName
  {
    key: 'createdBy',
    searchPaths: ['creatorEmployee.displayName', 'creatorEmployee.firstName', 'creatorEmployee.lastName'],
    sortPath: 'creatorEmployee.displayName',
    type: 'text'
  }
]

export interface CommonTaskTemplate extends BaseEntity {
  assigneeType?: string // IRM |CRM
  code?: string // IRM |CRM
  daysOfMonth?: any // IRM | CRM
  daysOfWeek?: any // IRM | CRM
  description?: string // IRM | TODO
  displayOrder?: number // IRM | CRM
  durationDays?: number // IRM | CRM
  enabled?: boolean // IRM | CRM
  holidayPolicy?: string // IRM | CRM
  id: string // IRM | CRM
  intervalDays?: number // IRM | CRM
  monthsOfYear?: any // IRM | CRM
  name?: string // IRM | CRM
  nextStartDate?: string // IRM | CRM
  priority?: CatalogEntry // IRM | CRM | Unclear
  priorityRef?: string // IRM | CRM | Unclear
  type?: CatalogEntry // IRM | CRM | Unclear
  typeRef?: string // IRM | CRM | Unclear
  tasks?: any[] // TODO | TODO
}

// TODO: only used in IRM for now
export interface CommonTaskComment extends BaseEntity {
  authorEmployee?: Employee // IRM | CRM
  authorEmployeeId?: string // IRM | CRM
  comment?: string // IRM | CRM
  id: string // IRM | CRM
  task?: any // IRM | CRM
  taskId?: string // IRM | CRM
}

export interface TaskReference {
  code?: string
  id: string
  name: string
  pictureThumbnail?: string
  type: string // Entity type (e.g., 'opportunity', 'account', 'lead', 'contact', 'investment')
}
