import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import type { InvestmentQueryVariables } from '@/common/data/investment/queries/investmentQueries.new'
import { INVESTMENT_QUERY_CONFIGS } from '@/common/data/investment/queries/investmentQueries.new'
import type { Descriptor, SortInput } from '@/common/network/graphql/queryHelpers'
import type { InvestmentDynamicFilterCondition } from './investmentListColumnTransformer'

type SortOrder = 'ASC' | 'DESC'
type InvestmentSectionQueryVariables = InvestmentQueryVariables & {
  customConditions?: Record<string, any>[]
}

interface InvestmentSectionGroupMetadata {
  id?: string
  code: string
  tabId?: string
  label?: string
}

interface InvestmentSectionColumnConfig {
  queryFields?: string[]
  sortDescriptors?: Descriptor[]
  filterConditionByFilterId?: Record<string, InvestmentDynamicFilterCondition>
}

export interface BuildInvestmentSectionQueryModelOptions {
  selectedFilters: Record<string, any>
  search: string
  sortField: string
  sortOrder: SortOrder
  currentPage?: number
  pageSize?: number
  limit?: number
  offset?: number
  group?: InvestmentSectionGroupMetadata | null
  columnConfig?: InvestmentSectionColumnConfig
}

export interface InvestmentSectionQueryModel {
  queryVariables: InvestmentSectionQueryVariables
  queryFields: string[]
  sortDescriptors: Descriptor[]
  exportMetadata: {
    filenamePrefix: string
    groupLabel?: string
    isOverview: boolean
  }
}

const getBooleanFilterValue = (value: unknown): boolean | null => {
  const normalizedValue = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value

  if (typeof normalizedValue === 'boolean') return normalizedValue
  if (normalizedValue === 'true') return true
  if (normalizedValue === 'false') return false
  return null
}

const isEmptyFilterValue = (value: unknown): boolean => {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).every(isEmptyFilterValue)
  return false
}

const getRangeValues = (value: unknown): { min?: unknown; max?: unknown } => {
  if (Array.isArray(value)) {
    return { min: value[0], max: value[1] }
  }

  if (typeof value === 'string') {
    const [min, max] = value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)
    return { min, max }
  }

  if (typeof value === 'object' && value !== null) {
    const rangeValue = value as Record<string, unknown>
    return {
      min: rangeValue.min ?? rangeValue.from ?? rangeValue.start ?? rangeValue.startDate,
      max: rangeValue.max ?? rangeValue.to ?? rangeValue.end ?? rangeValue.endDate
    }
  }

  return { min: value }
}

const buildNestedCondition = (path: string, leaf: Record<string, unknown>): Record<string, any> => {
  return path
    .split('.')
    .filter(Boolean)
    .reverse()
    .reduce<Record<string, any>>((condition, segment) => ({ [segment]: condition }), leaf)
}

const normalizePlanedExitFilter = (filters: Record<string, any>): Record<string, any> => {
  if (!('planedExit' in filters)) {
    return filters
  }

  const planedExit = getBooleanFilterValue(filters.planedExit)
  const normalizedFilters = { ...filters }

  if (planedExit === null) {
    delete normalizedFilters.planedExit
    return normalizedFilters
  }

  normalizedFilters.planedExit = planedExit
  return normalizedFilters
}

const applyDateRangeFilter = (filters: Record<string, any>, rangeKey: string, fromKey: string, toKey: string): void => {
  if (!(rangeKey in filters)) {
    return
  }

  const { min, max } = getRangeValues(filters[rangeKey])
  delete filters[rangeKey]

  if (min) {
    filters[fromKey] = min
  }

  if (max) {
    filters[toKey] = max
  }
}

const normalizeFixedFilters = (filters: Record<string, any>): Record<string, any> => {
  const normalizedFilters = normalizePlanedExitFilter(filters)
  const listFilters = { ...normalizedFilters }

  applyDateRangeFilter(listFilters, 'createdAtRange', 'createdAtFrom', 'createdAtTo')
  applyDateRangeFilter(listFilters, 'plannedExitDateRange', 'plannedExitDateFrom', 'plannedExitDateTo')

  return listFilters
}

const buildDynamicFilterCondition = (
  filterMetadata: InvestmentDynamicFilterCondition,
  value: unknown
): Record<string, any> | null => {
  if (isEmptyFilterValue(value) || !filterMetadata.descriptor.path) {
    return null
  }

  let leaf: Record<string, unknown> | null = null

  if (filterMetadata.filterType === 'number') {
    const { min, max } = getRangeValues(value)
    const condition: Record<string, number> = {}
    const parsedMin = min === undefined || min === '' ? undefined : Number(min)
    const parsedMax = max === undefined || max === '' ? undefined : Number(max)

    if (parsedMin !== undefined && Number.isFinite(parsedMin)) condition._gte = parsedMin
    if (parsedMax !== undefined && Number.isFinite(parsedMax)) condition._lte = parsedMax
    leaf = Object.keys(condition).length > 0 ? condition : null
  }

  if (filterMetadata.filterType === 'date') {
    const { min, max } = getRangeValues(value)
    const condition: Record<string, unknown> = {}

    if (min) condition._gte = min
    if (max) condition._lte = max
    leaf = Object.keys(condition).length > 0 ? condition : null
  }

  if (filterMetadata.filterType === 'text') {
    if (Array.isArray(value) && value.length > 0) {
      leaf = { _in: value }
    } else if (typeof value === 'string' && value.trim()) {
      leaf = { _ilike: `%${value.trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%` }
    }
  }

  if (filterMetadata.filterType === 'boolean') {
    const booleanValue = getBooleanFilterValue(value)
    leaf = booleanValue === null ? null : { _eq: booleanValue }
  }

  if (!leaf) {
    return null
  }

  const condition = buildNestedCondition(filterMetadata.descriptor.path, leaf)
  return filterMetadata.relationField ? { [filterMetadata.relationField]: condition } : condition
}

const getCurrencyConditions = (selectedFilters: Record<string, any>): Record<string, any>[] => {
  const ids: string[] = selectedFilters.currencyIds ?? []
  const codes = ids.map(id => id.split(':').pop()).filter((code): code is string => Boolean(code))

  return codes.length > 0 ? [{ currency: { code: { _in: codes } } }] : []
}

const getGroupConditions = (group?: InvestmentSectionGroupMetadata | null): Record<string, any>[] => {
  return group?.id ? [{ investmentGroup: { id: { _eq: group.id } } }] : []
}

const getQueryFields = (columnConfig?: InvestmentSectionColumnConfig): string[] => {
  if (columnConfig?.queryFields?.length) {
    return columnConfig.queryFields
  }

  return INVESTMENT_QUERY_CONFIGS.list
}

export const buildInvestmentSectionQueryModel = ({
  selectedFilters,
  search,
  sortField,
  sortOrder,
  currentPage = 1,
  pageSize = 20,
  limit,
  offset,
  group,
  columnConfig
}: BuildInvestmentSectionQueryModelOptions): InvestmentSectionQueryModel => {
  const normalizedSelectedFilters = normalizeFixedFilters(selectedFilters)
  const existingConditions: Record<string, any>[] = normalizedSelectedFilters.customConditions ?? []
  const dynamicFilterMap = columnConfig?.filterConditionByFilterId ?? {}
  const dynamicFilterIds = new Set(Object.keys(dynamicFilterMap))
  const dynamicFilterConditions = Object.entries(dynamicFilterMap)
    .map(([filterId, filterMetadata]) =>
      buildDynamicFilterCondition(filterMetadata, normalizedSelectedFilters[filterId])
    )
    .filter((condition): condition is Record<string, any> => Boolean(condition))
  const listFilters = Object.fromEntries(
    Object.entries(normalizedSelectedFilters).filter(
      ([key]) => key !== 'currencyIds' && key !== 'customConditions' && !dynamicFilterIds.has(key)
    )
  )
  const mergedConditions = [
    ...getGroupConditions(group),
    ...existingConditions,
    ...getCurrencyConditions(selectedFilters),
    ...dynamicFilterConditions
  ]
  const sortDirection: SortInput['direction'] = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
  const queryVariables: InvestmentSectionQueryVariables = {
    limit: limit ?? pageSize,
    offset: offset ?? (currentPage - 1) * pageSize,
    search: search.trim() || undefined,
    orderBy: sortField
      ? [{ field: sortField, direction: sortDirection }]
      : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }],
    ...listFilters,
    customConditions: mergedConditions.length > 0 ? [{ _and: mergedConditions }] : []
  }
  const isOverview = !group

  return {
    queryVariables,
    queryFields: getQueryFields(columnConfig),
    sortDescriptors: columnConfig?.sortDescriptors ?? INVESTMENT_DESCRIPTORS,
    exportMetadata: {
      filenamePrefix: isOverview ? 'investments' : group?.label?.toLowerCase().replace(/\s+/g, '-') || 'investments',
      groupLabel: group?.label,
      isOverview
    }
  }
}
