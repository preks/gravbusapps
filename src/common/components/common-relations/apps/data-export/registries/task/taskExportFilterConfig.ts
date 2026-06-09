import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

const taskStatusGroup = createEntityMultiSelectGroup(
  'task-status-group',
  'filter-status',
  'taskStatusIds',
  'filter-status',
  'filter-search-status',
  true
)

const taskPriorityGroup = createEntityMultiSelectGroup(
  'task-priority-group',
  'filter-priority',
  'taskPriorityIds',
  'filter-priority',
  'filter-search-priorities'
)

const taskTypeGroup = createEntityMultiSelectGroup(
  'task-type-group',
  'filter-task-type',
  'taskTypeIds',
  'filter-task-type',
  'filter-search-task-types'
)

const assignedToGroup = createEntityMultiSelectGroup(
  'assigned-to-group',
  'filter-assigned-to',
  'assignedEmployeeIds',
  'filter-assigned-to',
  'filter-search-assignees'
)

const dueDateGroup = createDateRangeGroup('due-date-group', 'filter-due-date', 'dueDateRange', 'filter-due-date')

const createdDateGroup = createDateRangeGroup(
  'created-date-group',
  'filter-created-date',
  'createdAtRange',
  'filter-created-date'
)

function createReferenceTypeGroup(referenceOptions: Array<{ id: string; label: string; value: string }>) {
  return {
    id: 'reference-type-group',
    label: 'filter-reference-type',
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: 'referenceType',
        field: 'referenceType',
        label: 'filter-reference-type',
        type: 'multi-select' as const,
        config: {
          options: referenceOptions,
          searchPlaceholder: 'filter-select',
          totalCount: referenceOptions.length,
          hasMore: false
        }
      }
    ]
  }
}

const crmReferenceOptions = [
  { id: 'account', label: 'filter-reference-account', value: 'account' },
  { id: 'contact', label: 'filter-reference-contact', value: 'contact' },
  { id: 'lead', label: 'filter-reference-lead', value: 'lead' },
  { id: 'opportunity', label: 'filter-reference-opportunity', value: 'opportunity' }
]

const irmReferenceOptions = [
  ...crmReferenceOptions,
  { id: 'investment', label: 'filter-reference-investment', value: 'investment' }
]

export const crmTaskExportFilterConfig: FilterConfiguration = buildExportFilterConfig(
  'crm-task-export-filters',
  'CRM Task Export Filters',
  [
    taskStatusGroup,
    taskPriorityGroup,
    taskTypeGroup,
    assignedToGroup,
    createReferenceTypeGroup(crmReferenceOptions),
    dueDateGroup,
    createdDateGroup
  ]
)

export const irmTaskExportFilterConfig: FilterConfiguration = buildExportFilterConfig(
  'irm-task-export-filters',
  'IRM Task Export Filters',
  [
    taskStatusGroup,
    taskPriorityGroup,
    taskTypeGroup,
    assignedToGroup,
    createReferenceTypeGroup(irmReferenceOptions),
    dueDateGroup,
    createdDateGroup
  ]
)
