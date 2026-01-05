import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { TaskTiming } from '../constants/taskConstants'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

/**
 * Task Assignee Junction Table
 * Supports multiple assignees per task (many-to-many relationship)
 */
export interface TaskAssignee extends BaseEntity {
  id?: string
  taskId?: string
  assignedEmployee?: Employee
  assignedEmployeeId?: string
  assignedUserId?: string
  isDeleted?: boolean
}

export interface Task extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM

  // Multiple assignees (many-to-many relationship via TaskAssignee)
  taskAssignees?: TaskAssignee[]
  taskAssigneesAggregate?: { aggregate: { count: number } }

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

export const TaskFields = {
  account: 'account',
  accountId: 'accountId',

  // Multiple assignees fields
  taskAssignees: 'taskAssignees',
  taskAssigneesAggregate: 'taskAssigneesAggregate',

  code: 'code',
  comments: 'comments',
  contact: 'contact',
  contactId: 'contactId',
  creatorEmployee: 'creatorEmployee',
  creatorEmployeeId: 'creatorEmployeeId',
  creatorUserId: 'creatorUserId',
  description: 'description',
  documents: 'documents',
  dueDate: 'dueDate',
  endDate: 'endDate',
  id: 'id',
  lead: 'lead',
  leadId: 'leadId',
  name: 'name',
  opportunityStageCondition: 'opportunityStageCondition',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  source: 'source',
  startDate: 'startDate',
  taskPriority: 'taskPriority',
  taskPriorityRef: 'taskPriorityRef',
  taskStatus: 'taskStatus',
  taskStatusRef: 'taskStatusRef',
  taskTemplate: 'taskTemplate',
  taskTemplateId: 'taskTemplateId',
  taskTiming: 'taskTiming',
  taskType: 'taskType',
  taskTypeRef: 'taskTypeRef',
  templateStartDate: 'templateStartDate'
} as const

export const TaskFormFields = {
  accountId: 'account',

  // Multiple assignees fields
  assignedEmployeeIds: 'taskAssignees',
  assignedEmployees: 'taskAssignees',

  code: 'code',
  contactId: 'contact',
  creatorEmployeeId: 'creatorEmployee',
  creatorUserId: 'creatorUserId',
  description: 'description',
  documents: 'documents',
  dueDate: 'dueDate',
  endDate: 'endDate',
  id: 'id',
  leadId: 'lead',
  name: 'name',
  opportunityId: 'opportunity',
  startDate: 'startDate',
  taskPriorityRef: 'taskPriorityRef',
  taskStatusRef: 'taskStatusRef',
  taskTemplateId: 'taskTemplate',
  taskTiming: 'taskTiming',
  taskTypeRef: 'taskTypeRef',
  templateStartDate: 'templateStartDate',
  version: 'version'
}

/**
 * Create Common Task Descriptors with fields mapping
 */
export const createTaskDescriptors = (fields: Record<keyof typeof TaskFields, string> = TaskFields): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'account',
    searchPaths: [`${fields.account}.name`, `${fields.account}.code`],
    sortPath: `${fields.account}.name`,
    type: 'text'
  },
  {
    key: 'taskAssignees',
    searchPaths: [
      `${fields.taskAssignees}.assignedEmployee.displayName`,
      `${fields.taskAssignees}.assignedEmployee.firstName`,
      `${fields.taskAssignees}.assignedEmployee.lastName`
    ],
    sortPath: `${fields.taskAssignees}.assignedEmployee.displayName`,
    type: 'text'
  },
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  {
    key: 'comments',
    searchPaths: [`${fields.comments}.comment`],
    sortPath: `${fields.comments}.comment`,
    type: 'text'
  },
  {
    key: 'contact',
    searchPaths: [`${fields.contact}.firstName`, `${fields.contact}.lastName`],
    sortPath: `${fields.contact}.lastName`,
    type: 'text'
  },
  {
    key: 'creatorEmployee',
    searchPaths: [
      `${fields.creatorEmployee}.displayName`,
      `${fields.creatorEmployee}.firstName`,
      `${fields.creatorEmployee}.lastName`
    ],
    sortPath: `${fields.creatorEmployee}.displayName`,
    type: 'text'
  },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  { key: 'dueDate', searchPaths: [fields.dueDate], sortPath: fields.dueDate, type: 'date' },
  { key: 'endDate', searchPaths: [fields.endDate], sortPath: fields.endDate, type: 'date' },
  {
    key: 'lead',
    searchPaths: [`${fields.lead}.firstName`, `${fields.lead}.lastName`, `${fields.lead}.companyName`],
    sortPath: `${fields.lead}.lastName`,
    type: 'text'
  },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  {
    key: 'opportunityStageCondition',
    searchPaths: [`${fields.opportunityStageCondition}.opportunityPipelineStageCondition.value`],
    sortPath: `${fields.opportunityStageCondition}.opportunityPipelineStageCondition.value`,
    type: 'text'
  },
  {
    key: 'opportunity',
    searchPaths: [`${fields.opportunity}.name`],
    sortPath: `${fields.opportunity}.name`,
    type: 'text'
  },
  { key: 'source', searchPaths: [fields.source], sortPath: fields.source, type: 'text' },
  { key: 'startDate', searchPaths: [fields.startDate], sortPath: fields.startDate, type: 'date' },
  {
    key: 'taskPriority',
    searchPaths: [`${fields.taskPriority}.value`, `${fields.taskPriority}.code`],
    sortPath: `${fields.taskPriority}.value`,
    type: 'text'
  },
  {
    key: 'taskStatus',
    searchPaths: [`${fields.taskStatus}.value`, `${fields.taskStatus}.code`],
    sortPath: `${fields.taskStatus}.value`,
    type: 'text'
  },
  {
    key: 'taskTemplate',
    searchPaths: [`${fields.taskTemplate}.name`],
    sortPath: `${fields.taskTemplate}.name`,
    type: 'text'
  },
  { key: 'taskTiming', searchPaths: [fields.taskTiming], sortPath: fields.taskTiming, type: 'text' },
  {
    key: 'taskType',
    searchPaths: [`${fields.taskType}.value`, `${fields.taskType}.code`],
    sortPath: `${fields.taskType}.value`,
    type: 'text'
  },
  {
    key: 'templateStartDate',
    searchPaths: [fields.templateStartDate],
    sortPath: fields.templateStartDate,
    type: 'date'
  },

  // Filter IDs
  { key: 'id', path: fields.id, kind: 'inIds' },
  { key: 'accountIds', path: fields.accountId, kind: 'inIds' },
  {
    key: 'assignedEmployeeIds',
    path: `${fields.taskAssignees}.assignedEmployeeId`,
    filterLabel: 'Assigned To',
    optionSelectPaths: [
      `${fields.taskAssignees}.assignedEmployee.id`,
      `${fields.taskAssignees}.assignedEmployee.displayName`
    ],
    optionSearchPaths: [
      `${fields.taskAssignees}.assignedEmployee.displayName`,
      `${fields.taskAssignees}.assignedEmployee.firstName`,
      `${fields.taskAssignees}.assignedEmployee.lastName`
    ],
    optionDistinctOn: [`${fields.taskAssignees}.assignedEmployeeId`],
    kind: 'inIds'
  },
  { key: 'contactIds', path: fields.contactId, kind: 'inIds' },
  { key: 'creatorEmployeeIds', path: fields.creatorEmployeeId, kind: 'inIds' },
  { key: 'leadIds', path: fields.leadId, kind: 'inIds' },
  { key: 'opportunityIds', path: fields.opportunityId, kind: 'inIds' },
  {
    key: 'taskPriorityIds',
    path: fields.taskPriorityRef,
    filterLabel: 'Priority',
    optionSelectPaths: [`${fields.taskPriority}.id`, `${fields.taskPriority}.value`],
    optionSearchPaths: [`${fields.taskPriority}.value`, `${fields.taskPriority}.code`],
    optionDistinctOn: [fields.taskPriorityRef],
    kind: 'inIds'
  },
  {
    key: 'taskStatusIds',
    path: fields.taskStatusRef,
    filterLabel: 'Status',
    optionSelectPaths: [`${fields.taskStatus}.id`, `${fields.taskStatus}.value`],
    optionSearchPaths: [`${fields.taskStatus}.value`, `${fields.taskStatus}.code`],
    optionDistinctOn: [fields.taskStatusRef],
    kind: 'inIds'
  },
  { key: 'taskTemplateIds', path: fields.taskTemplateId, kind: 'inIds' },
  {
    key: 'taskTypeIds',
    path: fields.taskTypeRef,
    filterLabel: 'Task Type',
    optionSelectPaths: [`${fields.taskType}.id`, `${fields.taskType}.value`],
    optionSearchPaths: [`${fields.taskType}.value`, `${fields.taskType}.code`],
    optionDistinctOn: [fields.taskTypeRef],
    kind: 'inIds'
  },

  // Date range filters
  { key: 'dueDateFrom', path: fields.dueDate, kind: 'dateFrom' },
  { key: 'dueDateTo', path: fields.dueDate, kind: 'dateTo' },
  { key: 'endDateFrom', path: fields.endDate, kind: 'dateFrom' },
  { key: 'endDateTo', path: fields.endDate, kind: 'dateTo' },
  { key: 'startDateFrom', path: fields.startDate, kind: 'dateFrom' },
  { key: 'startDateTo', path: fields.startDate, kind: 'dateTo' },
  { key: 'templateStartDateFrom', path: fields.templateStartDate, kind: 'dateFrom' },
  { key: 'templateStartDateTo', path: fields.templateStartDate, kind: 'dateTo' },

  // Composite display columns
  {
    key: 'assignedTo',
    searchPaths: [
      `${fields.taskAssignees}.assignedEmployee.displayName`,
      `${fields.taskAssignees}.assignedEmployee.firstName`,
      `${fields.taskAssignees}.assignedEmployee.lastName`
    ],
    sortPath: `${fields.taskAssignees}.assignedEmployee.displayName`,
    type: 'text'
  },
  {
    key: 'reference',
    searchPaths: [
      `${fields.account}.name`,
      `${fields.contact}.lastName`,
      `${fields.lead}.lastName`,
      `${fields.opportunity}.name`
    ],
    sortPaths: [`${fields.source}`],
    type: 'text'
  },
  {
    key: 'createdBy',
    searchPaths: [
      `${fields.creatorEmployee}.displayName`,
      `${fields.creatorEmployee}.firstName`,
      `${fields.creatorEmployee}.lastName`
    ],
    sortPath: `${fields.creatorEmployee}.displayName`,
    type: 'text'
  }
]

export interface TaskTemplate extends BaseEntity {
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
export interface TaskComment extends BaseEntity {
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

/**
 * Build Task Payload (Unified for IRM & CRM)
 * Transforms form data to backend format with multiple assignees
 */
export const buildTaskPayload = (task: Partial<Task> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(task, TaskFormFields)

  // Transform assignee data to taskAssignees array
  // Backend expects taskAssignees array (can be empty, 1, or many)
  if (
    payload.assignedEmployeeIds &&
    Array.isArray(payload.assignedEmployeeIds) &&
    payload.assignedEmployeeIds.length > 0
  ) {
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
  }

  return payload
}
