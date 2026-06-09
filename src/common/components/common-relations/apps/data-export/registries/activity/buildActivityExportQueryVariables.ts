import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'

interface ActivityOrderBy {
  field: string
  direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
}

interface ActivityExportQueryVariablesBase {
  limit?: number
  offset?: number
  search?: string
  orderBy?: ActivityOrderBy[]
  activityTypeIds?: string[]
  ownerEmployeeIds?: string[]
  referenceTypes?: string[]
  createdAtFrom?: string
  createdAtTo?: string
  occurredAtFrom?: string
  occurredAtTo?: string
}

export interface BuildActivityExportQueryVariablesParams {
  selectedFilters: Record<string, unknown>
  limit?: number
  offset?: number
}

export function buildActivityExportQueryVariables<T extends ActivityExportQueryVariablesBase>({
  selectedFilters,
  limit = 50,
  offset = 0
}: BuildActivityExportQueryVariablesParams): T {
  const pageSize = limit
  const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

  const variables = {
    limit: pageSize,
    offset: pageIndex * pageSize,
    orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
  } as T

  if (Array.isArray(selectedFilters.activityTypeIds) && selectedFilters.activityTypeIds.length > 0) {
    variables.activityTypeIds = selectedFilters.activityTypeIds as string[]
  }

  if (Array.isArray(selectedFilters.ownerEmployeeIds) && selectedFilters.ownerEmployeeIds.length > 0) {
    variables.ownerEmployeeIds = selectedFilters.ownerEmployeeIds as string[]
  }

  if (Array.isArray(selectedFilters.referenceType) && selectedFilters.referenceType.length > 0) {
    variables.referenceTypes = selectedFilters.referenceType as string[]
  }

  const createdAtRange = normalizeDateRange(selectedFilters.createdAtRange)
  if (createdAtRange?.from) {
    variables.createdAtFrom = createdAtRange.from
  }
  if (createdAtRange?.to) {
    variables.createdAtTo = createdAtRange.to
  }

  const occurredAtRange = normalizeDateRange(selectedFilters.occurredAtRange)
  if (occurredAtRange?.from) {
    variables.occurredAtFrom = occurredAtRange.from
  }
  if (occurredAtRange?.to) {
    variables.occurredAtTo = occurredAtRange.to
  }

  return variables
}
