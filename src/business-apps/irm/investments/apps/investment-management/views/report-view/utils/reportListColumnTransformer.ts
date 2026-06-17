/**
 * Report-view column / sort / filter transformer.
 *
 * Mirrors `investmentListColumnTransformer.tsx` — a single cascade function
 * produces `columnConfig + sortableColumns + filterConfiguration` from one
 * iteration of catalog `FormFieldDefinition` records.
 *
 * CASCADE ORDER (most-specific → least-specific, deduplicated by column ID):
 *   liquidFundType section: liquidFundType → parent investmentType → investmentGroup
 *   investmentType section: investmentType → investmentGroup
 *   group section:          investmentGroup
 */

import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { ColumnConfig } from '../hooks/useReportFilters'
import type { UseFilterGroupsResult } from '@/common/data/common/hooks/useFilterGroups'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout/utils/filterHelpers'
import { belongsToParent, shouldUseLiquidFundTypeSections, type ReportSectionKind } from './subSectionHelpers'

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

export interface FormFieldLike {
  property: string
  label: string
  type: string
  report?: boolean
  displayOrder?: string
}

type FilterGroup = NonNullable<FilterConfiguration['groups']>[number]
type Filter = FilterGroup['filters'][number]

// ---------------------------------------------------------------------------
// Descriptor index: catalog property path → InvestmentReport descriptor
// ---------------------------------------------------------------------------

/**
 * Report entity prefixes → catalog entity prefixes.
 *
 * Descriptor paths use report subtype relation prefixes, but catalog form-field
 * `property` values use investment subtype prefixes. This table drives the reverse
 * mapping so we can look up a descriptor by catalog property.
 */
const REPORT_TO_CATALOG_PREFIX: Array<[string, string]> = [
  ['equityInvestmentReport.', 'equityInvestment.'],
  ['realEstateInvestmentReport.', 'realEstateInvestment.'],
  ['liquidFundInvestmentReport.', 'liquidFundInvestment.']
]

const buildDescriptorIndex = (): Map<string, Descriptor> => {
  const index = new Map<string, Descriptor>()

  for (const d of INVESTMENT_REPORT_DESCRIPTORS) {
    if (d.path) {
      let catalogPath = d.path
      for (const [reportPrefix, catalogPrefix] of REPORT_TO_CATALOG_PREFIX) {
        if (d.path.startsWith(reportPrefix)) {
          catalogPath = catalogPrefix + d.path.slice(reportPrefix.length)
          break
        }
      }

      // Only set if not already present (first descriptor wins for duplicate paths)
      if (!index.has(catalogPath)) {
        index.set(catalogPath, d)
      }
      continue
    }

    // Searchable descriptors without an explicit `path` (catalog references like
    // "Stake Type", entity refs, and certain date fields) are catalog-referenced as
    // `investment.<key>`. Index them by `key` so the `investment.`-stripping fallback
    // in `resolveReportDescriptor` can resolve them instead of dropping the column
    // out of free-text search.
    if (d.searchPaths && d.searchPaths.length > 0 && !index.has(d.key)) {
      index.set(d.key, d)
    }
  }

  return index
}

/**
 * Module-level index — built once, never mutated.
 *
 * Keys are catalog `property` values.
 * Values are the matching `InvestmentReport` descriptor.
 */
const REPORT_DESCRIPTOR_BY_CATALOG_PATH = buildDescriptorIndex()

/**
 * Resolve the searchable/sortable descriptor for a catalog `property`.
 *
 * Most properties match a descriptor directly. Report-snapshot amount fields
 * (e.g. "Closing Balance", "Opening Balance", "Time-Weighted Performance") are
 * catalog-referenced with an `investment.` prefix (`investment.totalInvestmentAmount`)
 * but are stored on the report root, so their descriptor path is the bare field
 * name (`totalInvestmentAmount`). When the prefixed lookup misses, retry with the
 * `investment.` prefix stripped so these columns become searchable instead of
 * silently dropping out of the generated `_or`.
 */
const resolveReportDescriptor = (property: string): Descriptor | undefined => {
  const direct = REPORT_DESCRIPTOR_BY_CATALOG_PATH.get(property)
  if (direct) return direct

  if (property.startsWith('investment.')) {
    return REPORT_DESCRIPTOR_BY_CATALOG_PATH.get(property.slice('investment.'.length))
  }

  return undefined
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_COLUMN_CONFIG: ColumnConfig[] = [
  { id: 'investment', label: 'Investment', visible: true, disabled: true },
  { id: 'date', label: 'Date', visible: true }
]

const BASE_SORTABLE_COLUMNS: Array<{ id: string; label: string }> = [
  { id: 'investment', label: 'Investment' },
  { id: 'date', label: 'Date' }
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseObjectValue = (objectValue: unknown): any => {
  if (!objectValue) return null
  if (typeof objectValue === 'string') {
    try {
      return JSON.parse(objectValue)
    } catch {
      return null
    }
  }
  return objectValue
}

/** Extract `FormFieldLike[]` from a catalog entry's objectValue. */
const getDisplayFields = (objectValue: unknown): FormFieldLike[] => {
  const parsed = parseObjectValue(objectValue)
  if (!parsed?.formFields) return []

  return (parsed.formFields as Array<{ fields?: FormFieldLike[] }>)
    .flatMap(group => group.fields ?? [])
    .filter(field => field.report !== false)
    .sort((a, b) => Number.parseFloat(a.displayOrder ?? '999') - Number.parseFloat(b.displayOrder ?? '999'))
}

/** Merge field groups, deduplicating by `property.replace('.','_')`. */
const dedupeByColumnId = (fieldGroups: FormFieldLike[][]): FormFieldLike[] => {
  const seen = new Set<string>()
  const result: FormFieldLike[] = []

  for (const fields of fieldGroups) {
    for (const field of fields) {
      const colId = field.property.replace(/\./g, '_')
      if (!seen.has(colId)) {
        seen.add(colId)
        result.push(field)
      }
    }
  }

  return result
}

const isAdditionalPropertiesPath = (propertyPath: string): boolean => {
  const normalizedPath = propertyPath.replace(
    /^(investment|equityInvestment|realEstateInvestment|liquidFundInvestment)\./,
    ''
  )
  return normalizedPath === 'additionalProperties' || normalizedPath.startsWith('additionalProperties.')
}

/**
 * Catalog subtype prefixes → report subtype relation used in the GraphQL where clause.
 * `investment.` and bare paths resolve to the report root (no relation).
 */
const CATALOG_PREFIX_TO_REPORT_RELATION: Array<[string, string]> = [
  ['equityInvestment.', 'equityInvestmentReport'],
  ['liquidFundInvestment.', 'liquidFundInvestmentReport'],
  ['realEstateInvestment.', 'realEstateInvestmentReport']
]

/**
 * Resolve a catalog `additionalProperties` property to its jsonb search target
 * (report relation + key path inside `additionalProperties`). Returns null when
 * the property is not an `additionalProperties` value.
 */
const resolveJsonbSearchTarget = (property: string): JsonbSearchTarget | null => {
  let relation: string | undefined
  let rest = property

  const relationMatch = CATALOG_PREFIX_TO_REPORT_RELATION.find(([prefix]) => property.startsWith(prefix))
  if (relationMatch) {
    relation = relationMatch[1]
    rest = property.slice(relationMatch[0].length)
  } else if (property.startsWith('investment.')) {
    rest = property.slice('investment.'.length)
  }

  const marker = 'additionalProperties.'
  const markerIndex = rest.indexOf(marker)
  if (markerIndex === -1) return null

  const jsonKey = rest.slice(markerIndex + marker.length)
  if (!jsonKey) return null

  return relation ? { relation, jsonKey } : { jsonKey }
}

// ---------------------------------------------------------------------------
// Cascade: field resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the ordered, deduplicated `FormFieldLike[]` for a (group, section)
 * by walking the catalog hierarchy from most-specific to least-specific.
 *
 * Liquid Fund:  liquidFundType → parent investmentType → investmentGroup
 * Other groups: investmentType → investmentGroup
 */
export const getAggregatedReportFields = (
  groupCode: string,
  sectionCode: string,
  catalogData: any,
  sectionKind: ReportSectionKind = 'investmentType'
): FormFieldLike[] => {
  const groupEntry = catalogData?.investmentGroups?.find((e: any) => e.code === groupCode)
  const groupFields = getDisplayFields(groupEntry?.objectValue)

  if (sectionCode === 'all') {
    const investmentTypeEntries = (catalogData?.investmentTypes ?? []).filter((entry: any) =>
      belongsToParent(entry, groupEntry)
    )
    const investmentTypeFields = investmentTypeEntries.flatMap((entry: any) => getDisplayFields(entry.objectValue))
    const liquidFundTypeFields = shouldUseLiquidFundTypeSections(groupEntry, catalogData)
      ? (catalogData?.investmentLiquidFundTypes ?? []).flatMap((entry: any) => getDisplayFields(entry.objectValue))
      : []

    return dedupeByColumnId([groupFields, investmentTypeFields, liquidFundTypeFields])
  }

  if (sectionKind === 'liquidFundType' && sectionCode) {
    // LEVEL 1: most specific — liquid fund type
    const lfTypeEntry = catalogData?.investmentLiquidFundTypes?.find((e: any) => e.code === sectionCode)
    const lfTypeFields = getDisplayFields(lfTypeEntry?.objectValue)

    // LEVEL 2: parent investment type
    const parentTypeEntry = catalogData?.investmentTypes?.find((e: any) => e.id === lfTypeEntry?.parentEntryId)
    const parentTypeFields = getDisplayFields(parentTypeEntry?.objectValue)

    return dedupeByColumnId([lfTypeFields, parentTypeFields, groupFields])
  }

  if (sectionKind === 'investmentType' && sectionCode && sectionCode !== 'all' && sectionCode !== groupCode) {
    // LEVEL 1: most specific — investment type for this section
    const typeEntry = catalogData?.investmentTypes?.find((e: any) => e.code === sectionCode)
    const typeFields = getDisplayFields(typeEntry?.objectValue)

    return dedupeByColumnId([typeFields, groupFields])
  }

  // LEVEL fallback: group only
  return groupFields
}

// ---------------------------------------------------------------------------
// Filter builder
// ---------------------------------------------------------------------------

const buildInvestmentFilterGroup = (): FilterGroup => ({
  id: 'investmentIds-group',
  label: 'Investment',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'investmentIds',
      field: 'investmentIds',
      label: 'Investment',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search investments…',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const buildInvestmentTypeFilterGroup = (): FilterGroup => ({
  id: 'investmentTypeIds-group',
  label: 'Investment Type',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'investmentTypeIds',
      field: 'investmentTypeIds',
      label: 'Investment Type',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search investment types...',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const buildLiquidFundTypeFilterGroup = (): FilterGroup => ({
  id: 'investmentLiquidFundTypeIds-group',
  label: 'Liquid Fund Type',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'investmentLiquidFundTypeIds',
      field: 'investmentLiquidFundTypeIds',
      label: 'Liquid Fund Type',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search liquid fund types...',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const buildLinkedInvestmentOwnerFilterGroup = (): FilterGroup => ({
  id: 'ownerEmployeeIds-group',
  label: 'Owner',
  collapsible: true,
  defaultExpanded: true,
  filters: [
    {
      id: 'ownerEmployeeIds',
      field: 'ownerEmployeeIds',
      label: 'Owner',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search owners...',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const buildLinkedInvestmentAccountFilterGroup = (): FilterGroup => ({
  id: 'investmentAccountIds-group',
  label: 'Account',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'investmentAccountIds',
      field: 'investmentAccountIds',
      label: 'Account',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search accounts...',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const buildLinkedInvestmentStatusFilterGroup = (): FilterGroup => ({
  id: 'linkedInvestmentStatusIds-group',
  label: 'Status',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'linkedInvestmentStatusIds',
      field: 'linkedInvestmentStatusIds',
      label: 'Status',
      type: 'multi-select',
      config: {
        options: [],
        searchPlaceholder: 'Search statuses...',
        totalCount: 0,
        hasMore: false
      }
    }
  ]
})

const getFilterTypeFromFieldType = (fieldType: string): 'number' | 'date' | 'text' | 'boolean' | null => {
  if (fieldType === 'AMOUNT' || fieldType === 'NUMBER' || fieldType === 'PERCENTAGE') return 'number'
  if (fieldType === 'DATE' || fieldType === 'DATETIME') return 'date'
  if (fieldType === 'TEXT' || fieldType === 'TEXTAREA') return 'text'
  if (fieldType === 'BOOLEAN') return 'boolean'
  // CATALOG_*, REF_* — handled by static descriptors already in the filter config
  return null
}

const buildFilterFromDescriptorAndField = (field: FormFieldLike, descriptor: Descriptor): Filter | null => {
  const filterType = getFilterTypeFromFieldType(field.type)
  if (!filterType) return null

  const hasBackendOptions = filterType === 'text' && Boolean(descriptor.optionSelectPaths?.length)
  const isMultiSelect = hasBackendOptions || filterType === 'boolean'

  const filter: Filter = {
    id: descriptor.key,
    field: descriptor.key,
    label: field.label,
    type: isMultiSelect ? 'multi-select' : (filterType as 'text' | 'number' | 'date'),
    config: {}
  }

  if (filterType === 'number') {
    filter.config = {
      mode: 'range',
      placeholderMin: field.type === 'PERCENTAGE' ? 'Min %' : 'Min',
      placeholderMax: field.type === 'PERCENTAGE' ? 'Max %' : 'Max'
    }
  } else if (filterType === 'date') {
    filter.config = { mode: 'range' }
  } else if (filterType === 'text' && !hasBackendOptions) {
    filter.config = { placeholder: `Search ${field.label}...` }
  } else if (hasBackendOptions) {
    filter.config = {
      options: [],
      totalCount: 0,
      hasMore: false,
      searchPlaceholder: `Search ${field.label}...`
    }
  } else if (filterType === 'boolean') {
    filter.config = {
      options: [
        { id: 'true', label: 'Yes' },
        { id: 'false', label: 'No' }
      ],
      totalCount: 2,
      hasMore: false
    }
  }

  return filter
}

// ---------------------------------------------------------------------------
// Master builder
// ---------------------------------------------------------------------------

export interface ReportListConfiguration {
  /** Ordered column picker entries (investment + date always first). */
  columnConfig: ColumnConfig[]
  /** Sort-dropdown entries derived from descriptor sortPaths. */
  sortableColumns: Array<{ id: string; label: string }>
  /** Filter sheet configuration populated with live options. */
  filterConfiguration: FilterConfiguration
  /**
   * Map of column id → searchable `InvestmentReport` descriptor key.
   * Used to scope free-text search to the currently visible columns
   * (mirrors the Investments-tab behavior), keeping the generated `_or`
   * small instead of scanning every descriptor/relation.
   */
  searchKeyByColumnId: Record<string, string>
  /**
   * Map of column id → jsonb `additionalProperties` search target for dynamic
   * (catalog-defined) columns that are not backed by a real DB descriptor.
   * Lets free-text search match these values via jsonb `_contains`
   * (e.g. "Unrealized Gains/Losses Share Price" stored under
   * `liquidFundInvestmentReport.additionalProperties.unrealizedGainsLossesSharePrice`).
   */
  jsonbSearchByColumnId: Record<string, JsonbSearchTarget>
}

/**
 * Describes how to reach a jsonb `additionalProperties` value in an
 * `InvestmentReport` where-clause:
 * - `relation`: the report subtype relation (e.g. `liquidFundInvestmentReport`),
 *   or `undefined` for values stored on the report root `additionalProperties`.
 * - `jsonKey`: the dot-path of the property inside `additionalProperties`.
 */
export interface JsonbSearchTarget {
  relation?: string
  jsonKey: string
}

interface BuildReportConfigurationOptions {
  includeInvestmentTypeFilter?: boolean
  includeLiquidFundTypeFilter?: boolean
  includeInvestmentTypeColumn?: boolean
  includeLiquidFundTypeColumn?: boolean
}

const getBaseFilterGroups = (options: BuildReportConfigurationOptions): FilterGroup[] => {
  const groups: FilterGroup[] = []

  if (options.includeInvestmentTypeFilter) {
    groups.push(buildInvestmentTypeFilterGroup())
  }

  if (options.includeLiquidFundTypeFilter) {
    groups.push(buildLiquidFundTypeFilterGroup())
  }

  groups.push(
    buildInvestmentFilterGroup(),
    buildLinkedInvestmentOwnerFilterGroup(),
    buildLinkedInvestmentAccountFilterGroup(),
    buildLinkedInvestmentStatusFilterGroup()
  )

  return groups
}

/**
 * Build column picker, sortable columns, and filter config from a resolved
 * list of catalog form fields.
 *
 * @param fields        Result of `getAggregatedReportFields`.
 * @param entityPrefix  Prefix used for the filter-config ID.
 * @param filterGroups  Live filter-group data from `useFilterGroups`.
 */
export const buildReportConfigurationFromFields = (
  fields: FormFieldLike[],
  entityPrefix: string,
  filterGroups: UseFilterGroupsResult,
  options: BuildReportConfigurationOptions = {}
): ReportListConfiguration => {
  const columnConfig: ColumnConfig[] = [...BASE_COLUMN_CONFIG]
  const sortableColumns: Array<{ id: string; label: string }> = [...BASE_SORTABLE_COLUMNS]
  // Base columns map 1:1 to searchable descriptors of the same key.
  const searchKeyByColumnId: Record<string, string> = { investment: 'investment', date: 'date' }
  const jsonbSearchByColumnId: Record<string, JsonbSearchTarget> = {}
  const filterGroupsList: FilterGroup[] = getBaseFilterGroups(options)
  const seenFilterIds = new Set<string>([
    ...(options.includeInvestmentTypeFilter ? ['investmentTypeIds'] : []),
    ...(options.includeLiquidFundTypeFilter ? ['investmentLiquidFundTypeIds'] : []),
    'investmentIds',
    'ownerEmployeeIds',
    'investmentAccountIds',
    'linkedInvestmentStatusIds'
  ])
  const seenSortIds = new Set<string>(['investment', 'date'])

  if (options.includeInvestmentTypeColumn) {
    columnConfig.push({ id: 'investmentType', label: 'Investment Type', visible: true })
  }

  if (options.includeLiquidFundTypeColumn) {
    columnConfig.push({ id: 'investmentLiquidFundType', label: 'Liquid Fund Type', visible: true })
  }

  for (const field of fields) {
    // Column picker — always include (no descriptor required)
    const columnId = field.property.replace(/\./g, '_')
    columnConfig.push({ id: columnId, label: field.label, visible: true })

    if (isAdditionalPropertiesPath(field.property)) {
      // jsonb columns have no DB descriptor; enable search via `additionalProperties._contains`.
      const jsonbTarget = resolveJsonbSearchTarget(field.property)
      if (jsonbTarget) {
        jsonbSearchByColumnId[columnId] = jsonbTarget
      }
      continue
    }

    // Descriptor lookup — drives search + sort + filter
    const descriptor = resolveReportDescriptor(field.property)
    if (!descriptor) continue

    // Searchable column — only descriptors that actually declare search paths
    // contribute to free-text search. Map this column id to its descriptor key
    // so visible-column scoping can resolve it.
    if (descriptor.searchPaths && descriptor.searchPaths.length > 0) {
      searchKeyByColumnId[columnId] = descriptor.key
    }

    // Sortable column — only if the descriptor declares a sort path
    const isSortable = Boolean(descriptor.sortPath ?? descriptor.sortPaths?.length)
    if (isSortable && !seenSortIds.has(descriptor.key)) {
      seenSortIds.add(descriptor.key)
      sortableColumns.push({ id: descriptor.key, label: field.label })
    }

    // Filter — one group per descriptor key (deduped)
    if (seenFilterIds.has(descriptor.key)) continue
    seenFilterIds.add(descriptor.key)

    const filter = buildFilterFromDescriptorAndField(field, descriptor)
    if (filter) {
      filterGroupsList.push({
        id: `${descriptor.key}-group`,
        label: field.label,
        collapsible: true,
        defaultExpanded: false,
        filters: [filter]
      })
    }
  }

  const baseFilterConfig: FilterConfiguration = {
    id: `${entityPrefix}-report-filters`,
    name: 'Report Filters',
    groups: filterGroupsList
  }

  return {
    columnConfig,
    sortableColumns,
    filterConfiguration: buildDynamicFilterConfig(baseFilterConfig, INVESTMENT_REPORT_DESCRIPTORS, filterGroups),
    searchKeyByColumnId,
    jsonbSearchByColumnId
  }
}

/**
 * Top-level entry point.
 *
 * Runs the catalog cascade for `(groupCode, sectionCode)`, then builds and
 * returns the full `ReportListConfiguration`.
 */
export const buildReportConfiguration = (
  groupCode: string,
  sectionCode: string,
  entityPrefix: string,
  catalogData: any,
  filterGroups: UseFilterGroupsResult,
  sectionKind?: ReportSectionKind
): ReportListConfiguration => {
  const fields = getAggregatedReportFields(groupCode, sectionCode, catalogData, sectionKind)
  const groupEntry = catalogData?.investmentGroups?.find((entry: any) => entry.code === groupCode)
  const isAllSection = sectionCode === 'all'
  const includeLiquidFundType = isAllSection && shouldUseLiquidFundTypeSections(groupEntry, catalogData)
  const options: BuildReportConfigurationOptions = {
    includeInvestmentTypeFilter: isAllSection,
    includeLiquidFundTypeFilter: includeLiquidFundType,
    includeInvestmentTypeColumn: isAllSection,
    includeLiquidFundTypeColumn: includeLiquidFundType
  }

  return buildReportConfigurationFromFields(fields, entityPrefix, filterGroups, options)
}
