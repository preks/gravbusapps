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
import type { ReportSectionKind } from './subSectionHelpers'

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
    if (!d.path) continue

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
  filterGroups: UseFilterGroupsResult
): ReportListConfiguration => {
  const columnConfig: ColumnConfig[] = [...BASE_COLUMN_CONFIG]
  const sortableColumns: Array<{ id: string; label: string }> = [...BASE_SORTABLE_COLUMNS]
  const filterGroupsList: FilterGroup[] = [buildInvestmentFilterGroup()]
  const seenFilterIds = new Set<string>(['investmentIds'])
  const seenSortIds = new Set<string>(['investment', 'date'])

  for (const field of fields) {
    // Column picker — always include (no descriptor required)
    const columnId = field.property.replace(/\./g, '_')
    columnConfig.push({ id: columnId, label: field.label, visible: true })

    if (isAdditionalPropertiesPath(field.property)) {
      continue
    }

    // Descriptor lookup — drives sort + filter
    const descriptor = REPORT_DESCRIPTOR_BY_CATALOG_PATH.get(field.property)
    if (!descriptor) continue

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
    filterConfiguration: buildDynamicFilterConfig(baseFilterConfig, INVESTMENT_REPORT_DESCRIPTORS, filterGroups)
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
  return buildReportConfigurationFromFields(fields, entityPrefix, filterGroups)
}
