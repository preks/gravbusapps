// Core task types - now using common types
export {
  Task,
  TaskEmployee,
  TaskReference,
  TaskStatistics,
  TaskStatisticItem
} from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
export * from './SalesTaskTypes'

// Dynamic hook types
export type { TaskEmployee, UseTaskEmployeesProps, UseTaskEmployeesReturn } from '../hooks/useTaskEmployees'

export type { CatalogOption, UseTaskCatalogsProps, UseTaskCatalogsReturn } from '../hooks/useTaskCatalogs'

export type {
  ReferenceTypeCounts,
  UseTaskReferenceCountsProps,
  UseTaskReferenceCountsReturn
} from '../hooks/useTaskReferenceCounts'

// Filter types
export type { DataFilter, DataFilterGroup, TaskFilters } from '../hooks/useTaskFilters'
