import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

interface TaskOrderBy {
  field: string
  direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
}

interface TaskExportQueryVariablesBase {
  limit?: number
  offset?: number
  search?: string
  orderBy?: TaskOrderBy[]
  taskStatusIds?: string[]
  taskPriorityIds?: string[]
  taskTypeIds?: string[]
  assignedEmployeeIds?: string[]
  referenceTypes?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  dueDateFrom?: string
  dueDateTo?: string
}

export interface BuildTaskExportQueryVariablesParams {
  selectedFilters: Record<string, unknown>
  limit?: number
  offset?: number
}

const MULTI_SELECT_FILTER_KEYS = ['taskStatusIds', 'taskPriorityIds', 'taskTypeIds', 'assignedEmployeeIds'] as const

const DATE_RANGE_FILTER_KEYS = ['createdAtRange', 'dueDateRange'] as const

export function buildTaskExportQueryVariables<T extends TaskExportQueryVariablesBase>({
  selectedFilters,
  limit = 50,
  offset = 0
}: BuildTaskExportQueryVariablesParams): T {
  const pageSize = limit
  const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

  const variables = {
    limit: pageSize,
    offset: pageIndex * pageSize,
    orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
  } as T

  for (const key of MULTI_SELECT_FILTER_KEYS) {
    if (Array.isArray(selectedFilters[key]) && selectedFilters[key].length > 0) {
      ;(variables as Record<string, unknown>)[key] = selectedFilters[key]
    }
  }

  if (Array.isArray(selectedFilters.referenceType) && selectedFilters.referenceType.length > 0) {
    variables.referenceTypes = selectedFilters.referenceType as string[]
  }

  for (const rangeKey of DATE_RANGE_FILTER_KEYS) {
    const normalized = normalizeDateRange(selectedFilters[rangeKey])
    if (!normalized) {
      continue
    }

    const baseKey = rangeKey.replace('Range', '')
    if (normalized.from) {
      ;(variables as Record<string, unknown>)[`${baseKey}From`] = normalized.from
    }
    if (normalized.to) {
      ;(variables as Record<string, unknown>)[`${baseKey}To`] = normalized.to
    }
  }

  return variables
}
