import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import type { FormFieldDefinition, FormFieldsDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { INVESTMENT_DESCRIPTORS, type Investment } from '@/common/data/investment/types/investmentTypes.new'
import { EQUITY_INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/equityInvestmentTypes'
import { REAL_ESTATE_INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/realEstateInvestmentTypes'
import { LIQUID_FUND_INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/liquidFundInvestmentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { formatDate } from '@/common/data/investment/utils/formatters'
import { getValueByPath } from '@/common/utils/objectUtils'
import type {
  InvestmentCatalogEntry,
  InvestmentGroup,
  InvestmentGroupObjectValue,
  InvestmentListCatalogData
} from '../hooks/useInvestmentGroups'
import {
  AccountCell,
  PlanedExitCell,
  PlannedExitDateCell,
  TotalInvestmentAmountCell,
  OwnerEmployeeCell,
  InvestmentStatusCell,
  CreatedAtCell,
  createInvestmentTypeCell
} from '../data/shared/cellRenderers'

export interface InvestmentColumnOption {
  id: string
  label: string
}

export interface InvestmentListColumnConfiguration {
  columns: ColumnDef<Investment>[]
  availableColumns: InvestmentColumnOption[]
  sortableColumns: InvestmentColumnOption[]
  defaultVisibleColumns: string[]
  queryFields: string[]
  sortDescriptors: Descriptor[]
  sortFieldByColumnId: Record<string, string>
  dynamicFilterConfig: FilterConfiguration
  filterConditionByFilterId: Record<string, InvestmentDynamicFilterCondition>
  relationFilterOptionSources: InvestmentRelationFilterOptionSource[]
}

type FilterGroup = NonNullable<FilterConfiguration['groups']>[number]
type Filter = FilterGroup['filters'][number]

export interface InvestmentDynamicFilterCondition {
  relationField?: 'equityInvestment' | 'realEstateInvestment' | 'liquidFundInvestment'
  descriptor: Descriptor
  filterType: 'number' | 'date' | 'text' | 'boolean'
}

export interface InvestmentRelationFilterOptionSource {
  filterId: string
  entityName: 'LiquidFundInvestment'
  descriptorKey: string
}

const UNIVERSAL_VISIBLE_COLUMNS = ['name']
const UNIVERSAL_QUERY_FIELDS = [
  'id',
  'name',
  'createdAt',
  'currency',
  'currencyRef',
  'investmentGroup',
  'investmentGroupRef',
  'investmentStatus',
  'investmentStatusRef',
  'investmentType',
  'investmentTypeRef',
  'investmentAccounts',
  'ownerEmployee',
  'ownerEmployeeId',
  'planedExit',
  'plannedExitDate',
  'totalInvestmentAmount'
]

interface UniversalColumnSpec {
  id: string
  label: string
  /** GraphQL field key used as accessor. */
  accessor: string
  /** Sort key — omit for relation fields that aren't directly sortable. */
  sortField?: string
  width: { size: number; min: number; max: number }
  isDate: boolean
  align?: 'right' | 'left' | 'center'
  cell: ColumnDef<Investment>['cell']
}

/**
 * Base-entity columns inserted immediately after the Name column and before the
 * catalog-specific columns so the most important fields are always visible first.
 */
const UNIVERSAL_LEADING_COLUMNS: UniversalColumnSpec[] = [
  {
    id: 'investmentType',
    label: 'Type',
    accessor: 'investmentType',
    width: { size: 180, min: 150, max: 250 },
    isDate: false,
    cell: createInvestmentTypeCell('Unknown')
  },
  {
    id: 'totalInvestmentAmount',
    label: 'Total Investment',
    accessor: 'totalInvestmentAmount',
    sortField: 'totalInvestmentAmount',
    width: { size: 160, min: 140, max: 200 },
    isDate: false,
    align: 'right',
    cell: TotalInvestmentAmountCell
  }
]

/**
 * Base-entity fields that should appear on every group tab regardless of catalog
 * configuration. Inserted after the catalog columns so they don't displace the
 * group's own type-specific fields.
 */
const UNIVERSAL_TRAILING_COLUMNS: UniversalColumnSpec[] = [
  {
    id: 'ownerEmployee',
    label: 'Owner',
    accessor: 'ownerEmployee',
    width: { size: 200, min: 180, max: 280 },
    isDate: false,
    cell: OwnerEmployeeCell
  },
  {
    id: 'account',
    label: 'Account',
    accessor: 'investmentAccounts',
    width: { size: 180, min: 150, max: 240 },
    isDate: false,
    cell: AccountCell
  },
  {
    id: 'investmentStatus',
    label: 'Status',
    accessor: 'investmentStatus',
    width: { size: 130, min: 110, max: 160 },
    isDate: false,
    cell: InvestmentStatusCell
  },
  {
    id: 'planedExit',
    label: 'Planned Exit',
    accessor: 'planedExit',
    sortField: 'planedExit',
    width: { size: 140, min: 120, max: 160 },
    isDate: false,
    cell: PlanedExitCell
  },
  {
    id: 'plannedExitDate',
    label: 'Planned Exit Date',
    accessor: 'plannedExitDate',
    sortField: 'plannedExitDate',
    width: { size: 170, min: 150, max: 200 },
    isDate: true,
    cell: PlannedExitDateCell
  },
  {
    id: 'createdAt',
    label: 'Created',
    accessor: 'createdAt',
    sortField: 'createdAt',
    width: { size: 150, min: 130, max: 180 },
    isDate: true,
    cell: CreatedAtCell
  }
]

const UNIVERSAL_ALL_COLUMN_IDS = new Set([
  ...UNIVERSAL_LEADING_COLUMNS.map(c => c.id),
  ...UNIVERSAL_TRAILING_COLUMNS.map(c => c.id)
])

const SKIPPED_CATALOG_PROPERTIES = new Set([
  'investment.id',
  'investment.name',
  'id',
  'name',
  // Fields covered by universal leading/trailing columns — skip if a catalog also defines them
  'investment.investmentType',
  'investmentType',
  'investment.totalInvestmentAmount',
  'totalInvestmentAmount',
  'investment.ownerEmployee',
  'ownerEmployee',
  'investment.investmentStatus',
  'investmentStatus',
  'investment.createdAt',
  'createdAt'
])
const UNSORTABLE_FIELD_TYPES = new Set(['TEXTAREA'])
const RELATION_SORTING_ENABLED = false
const LIQUID_FUND_REQUIRED_SUBTYPE_KEY = 'liquidFundInvestment'
const LIQUID_FUND_TYPE_PROPERTY = 'liquidFundInvestment.investmentLiquidFundType'
const LIQUID_FUND_TYPE_FILTER_DESCRIPTOR_KEY = 'investmentLiquidFundTypeIds'
const LIQUID_FUND_TYPE_FIELD: FormFieldDefinition = {
  type: 'TEXT',
  label: 'Liquid Fund Type',
  property: LIQUID_FUND_TYPE_PROPERTY,
  required: false,
  displayOrder: '0.1'
}

const DESCRIPTORS_BY_ENTITY = {
  investment: INVESTMENT_DESCRIPTORS,
  equityInvestment: EQUITY_INVESTMENT_DESCRIPTORS,
  realEstateInvestment: REAL_ESTATE_INVESTMENT_DESCRIPTORS,
  liquidFundInvestment: LIQUID_FUND_INVESTMENT_DESCRIPTORS
} as const

type CatalogEntity = keyof typeof DESCRIPTORS_BY_ENTITY

const RELATION_FIELD_BY_ENTITY: Partial<
  Record<CatalogEntity, 'equityInvestment' | 'realEstateInvestment' | 'liquidFundInvestment'>
> = {
  equityInvestment: 'equityInvestment',
  realEstateInvestment: 'realEstateInvestment',
  liquidFundInvestment: 'liquidFundInvestment'
}

const OPTION_ENTITY_NAME_BY_ENTITY: Partial<Record<CatalogEntity, InvestmentRelationFilterOptionSource['entityName']>> =
  {
    liquidFundInvestment: 'LiquidFundInvestment'
  }

const DESCRIPTOR_INDEX_BY_ENTITY = Object.fromEntries(
  Object.entries(DESCRIPTORS_BY_ENTITY).map(([entity, descriptors]) => [
    entity,
    new Map(descriptors.map(descriptor => [descriptor.key, descriptor]))
  ])
) as Record<CatalogEntity, Map<string, Descriptor>>

const getCurrencyCode = (investment: Investment): string => {
  return investment.currency?.code || investment.currencyRef?.split(':').pop() || 'EUR'
}

const getFieldClassName = (fieldType: string): string => {
  switch (fieldType) {
    case 'AMOUNT':
    case 'NUMBER':
    case 'PERCENTAGE':
      return 'gba:text-right'
    case 'DATE':
    case 'DATETIME':
      return 'gba:text-center'
    default:
      return 'gba:text-left'
  }
}

const formatFieldValue = (value: unknown, fieldType: string, currencyCode: string): string => {
  if (value == null) return '-'

  if (typeof value === 'object') {
    const objectValue = value as { value?: string; name?: string; displayName?: string; code?: string }
    return objectValue.value || objectValue.name || objectValue.displayName || objectValue.code || '-'
  }

  switch (fieldType) {
    case 'AMOUNT':
      return typeof value === 'number'
        ? new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(value)
        : '-'
    case 'NUMBER':
      return typeof value === 'number'
        ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value)
        : '-'
    case 'PERCENTAGE':
      return typeof value === 'number' ? `${value.toFixed(2)}%` : '-'
    case 'DATE':
    case 'DATETIME':
      return typeof value === 'string' && value ? formatDate(value) : '-'
    default:
      return String(value)
  }
}

const getPathRoot = (propertyPath: string): string => propertyPath.split('.')[0] || ''

const propertyToColumnId = (property: string): string => property.replace(/\./g, '_')

const isAdditionalPropertiesPath = (propertyPath: string): boolean => {
  return propertyPath === 'additionalProperties' || propertyPath.startsWith('additionalProperties.')
}

const getDescriptorPath = (descriptor: Descriptor): string | undefined => {
  return descriptor.path || descriptor.sortPath || descriptor.searchPaths?.[0]
}

const getRequiredSubtypeKey = (objectValue?: InvestmentGroupObjectValue | null): string => {
  return objectValue?.requiredSubtypeKey ?? ''
}

const isLiquidFundTypeProperty = (property: string): boolean => property === LIQUID_FUND_TYPE_PROPERTY

const normalizeCatalogProperty = (
  property: string
): { entity: CatalogEntity; fieldPath: string; descriptorKey: string } | null => {
  const [entityCandidate, ...fieldParts] = property.split('.')

  if (!fieldParts.length || !(entityCandidate in DESCRIPTORS_BY_ENTITY)) {
    return null
  }

  const fieldPath = fieldParts.join('.')
  const descriptorKey = getPathRoot(fieldPath)

  if (!descriptorKey) {
    return null
  }

  return {
    entity: entityCandidate as CatalogEntity,
    fieldPath,
    descriptorKey
  }
}

const getCatalogDescriptorMapping = (property: string) => {
  const normalized = normalizeCatalogProperty(property)
  if (!normalized) {
    return null
  }

  const descriptor = DESCRIPTOR_INDEX_BY_ENTITY[normalized.entity].get(normalized.descriptorKey)
  if (!descriptor) {
    return null
  }

  const relationField = RELATION_FIELD_BY_ENTITY[normalized.entity]
  const descriptorPath = getDescriptorPath(descriptor)
  const isAdditionalProperties = isAdditionalPropertiesPath(normalized.fieldPath)
  const allowRelationSort = isLiquidFundTypeProperty(property)

  return {
    ...normalized,
    descriptor,
    descriptorPath,
    relationField,
    queryField: relationField || normalized.descriptorKey,
    canSort:
      !isAdditionalProperties &&
      descriptor.enableSort !== false &&
      Boolean(descriptor.sortPath || descriptor.sortPaths?.length) &&
      (!relationField || RELATION_SORTING_ENABLED || allowRelationSort),
    canFilter: !isAdditionalProperties && Boolean(descriptorPath)
  }
}

const resolveFieldValue = (investment: Investment, property: string): unknown => {
  if (property.startsWith('investment.')) {
    return getValueByPath(investment, property.replace('investment.', ''))
  }

  if (property.startsWith('equityInvestment.')) {
    return getValueByPath(investment.equityInvestment, property.replace('equityInvestment.', ''))
  }

  if (property.startsWith('realEstateInvestment.')) {
    return getValueByPath(investment.realEstateInvestment, property.replace('realEstateInvestment.', ''))
  }

  if (property.startsWith('liquidFundInvestment.')) {
    return getValueByPath(investment.liquidFundInvestment, property.replace('liquidFundInvestment.', ''))
  }

  return getValueByPath(investment, property)
}

const getQueryFieldForProperty = (property: string): string | null => {
  return getCatalogDescriptorMapping(property)?.queryField || null
}

const getSortFieldForProperty = (property: string): string | null => {
  const mapping = getCatalogDescriptorMapping(property)
  return mapping?.canSort ? mapping.descriptor.key : null
}

const buildRelationSortDescriptor = (
  columnId: string,
  mapping: ReturnType<typeof getCatalogDescriptorMapping>
): Descriptor | null => {
  if (!mapping?.canSort || !mapping.relationField) {
    return null
  }

  const relationSortPath = mapping.descriptor.sortPath
    ? `${mapping.relationField}.${mapping.descriptor.sortPath}`
    : undefined
  const relationSortPaths = mapping.descriptor.sortPaths?.map(path => `${mapping.relationField}.${path}`)

  if (!relationSortPath && !relationSortPaths?.length) {
    return null
  }

  return {
    ...mapping.descriptor,
    key: columnId,
    sortPath: relationSortPath,
    sortPaths: relationSortPaths
  }
}

const isSupportedCatalogField = (field: FormFieldDefinition): boolean => {
  return Boolean(getCatalogDescriptorMapping(field.property))
}

const getDisplayFields = (formFieldsDefinition?: FormFieldsDefinition | null): FormFieldDefinition[] => {
  if (!formFieldsDefinition?.formFields) return []

  return formFieldsDefinition.formFields
    .flatMap(group => group.fields)
    .filter(
      field =>
        field.report !== false && !SKIPPED_CATALOG_PROPERTIES.has(field.property) && isSupportedCatalogField(field)
    )
    .sort((a, b) => Number.parseFloat(a.displayOrder || '999') - Number.parseFloat(b.displayOrder || '999'))
}

const belongsToParent = (entry: InvestmentCatalogEntry, parent: InvestmentCatalogEntry | InvestmentGroup): boolean => {
  return (
    entry.parentEntryId === parent.id || entry.parentEntry?.id === parent.id || entry.parentEntry?.code === parent.code
  )
}

const dedupeFieldsByColumnId = (fieldGroups: FormFieldDefinition[][]): FormFieldDefinition[] => {
  const seenColumnIds = new Set<string>()
  const dedupedFields: FormFieldDefinition[] = []

  fieldGroups.flat().forEach(field => {
    const columnId = propertyToColumnId(field.property)
    if (seenColumnIds.has(columnId)) {
      return
    }

    seenColumnIds.add(columnId)
    dedupedFields.push(field)
  })

  return dedupedFields
}

const getFilterTypeFromCatalogType = (catalogType: string): InvestmentDynamicFilterCondition['filterType'] | null => {
  if (catalogType === 'AMOUNT' || catalogType === 'NUMBER' || catalogType === 'PERCENTAGE') return 'number'
  if (catalogType === 'DATE' || catalogType === 'DATETIME') return 'date'
  if (catalogType === 'TEXT' || catalogType === 'TEXTAREA') return 'text'
  if (catalogType === 'BOOLEAN') return 'boolean'
  return null
}

const buildFilterConfigForField = (
  field: FormFieldDefinition,
  mapping: ReturnType<typeof getCatalogDescriptorMapping>
): {
  filter: Filter
  condition: InvestmentDynamicFilterCondition
  optionSource?: InvestmentRelationFilterOptionSource
} | null => {
  if (!mapping?.canFilter || !mapping.descriptorPath) {
    return null
  }

  const liquidFundTypeFilterDescriptor = isLiquidFundTypeProperty(field.property)
    ? DESCRIPTOR_INDEX_BY_ENTITY.liquidFundInvestment.get(LIQUID_FUND_TYPE_FILTER_DESCRIPTOR_KEY)
    : undefined
  const effectiveDescriptor = liquidFundTypeFilterDescriptor || mapping.descriptor
  const effectiveDescriptorPath = liquidFundTypeFilterDescriptor
    ? getDescriptorPath(liquidFundTypeFilterDescriptor)
    : mapping.descriptorPath

  if (!effectiveDescriptorPath) {
    return null
  }

  const filterType = getFilterTypeFromCatalogType(field.type)
  if (!filterType) {
    return null
  }

  const filterId = mapping.relationField ? propertyToColumnId(field.property) : mapping.descriptor.key
  const descriptor: Descriptor = {
    ...effectiveDescriptor,
    key: filterId,
    path: effectiveDescriptorPath
  }

  // Text fields whose descriptor exposes optionSelectPaths are rendered as a
  // multi-select with backend-loaded options rather than a plain text input.
  const hasBackendOptions = filterType === 'text' && Boolean(effectiveDescriptor.optionSelectPaths?.length)

  const filter: Filter = {
    id: filterId,
    field: filterId,
    label: field.label,
    type: hasBackendOptions || filterType === 'boolean' ? 'multi-select' : filterType,
    config: {}
  }

  if (filterType === 'number') {
    filter.config = {
      mode: 'range',
      placeholderMin: field.type === 'PERCENTAGE' ? 'Min %' : 'Min',
      placeholderMax: field.type === 'PERCENTAGE' ? 'Max %' : 'Max'
    }
  }

  if (filterType === 'date') {
    filter.config = { mode: 'range' }
  }

  if (filterType === 'text' && !hasBackendOptions) {
    filter.config = { placeholder: `Search ${field.label}...` }
  }

  if (hasBackendOptions) {
    filter.config = {
      options: [],
      totalCount: 0,
      hasMore: false,
      searchPlaceholder: `Search ${field.label}...`
    }
  }

  if (filterType === 'boolean') {
    filter.config = {
      options: [
        { id: 'true', label: 'Yes' },
        { id: 'false', label: 'No' }
      ],
      totalCount: 2,
      hasMore: false
    }
  }

  const optionEntityName = OPTION_ENTITY_NAME_BY_ENTITY[mapping.entity]
  const optionSource =
    hasBackendOptions && mapping.relationField && optionEntityName
      ? {
          filterId,
          entityName: optionEntityName,
          descriptorKey: effectiveDescriptor.key
        }
      : undefined

  return {
    filter,
    condition: {
      relationField: mapping.relationField,
      descriptor,
      filterType
    },
    ...(optionSource ? { optionSource } : {})
  }
}

const buildDynamicFilterConfiguration = (
  fields: FormFieldDefinition[]
): Pick<
  InvestmentListColumnConfiguration,
  'dynamicFilterConfig' | 'filterConditionByFilterId' | 'relationFilterOptionSources'
> => {
  const filterConditionByFilterId: Record<string, InvestmentDynamicFilterCondition> = {}
  const relationFilterOptionSources: InvestmentRelationFilterOptionSource[] = []
  const seenFilterIds = new Set<string>()
  const groups: FilterGroup[] = []

  fields.forEach(field => {
    const filterConfig = buildFilterConfigForField(field, getCatalogDescriptorMapping(field.property))
    if (!filterConfig || seenFilterIds.has(filterConfig.filter.id)) {
      return
    }

    seenFilterIds.add(filterConfig.filter.id)
    filterConditionByFilterId[filterConfig.filter.id] = filterConfig.condition
    if (filterConfig.optionSource) {
      relationFilterOptionSources.push(filterConfig.optionSource)
    }
    groups.push({
      id: `${filterConfig.filter.id}-catalog-group`,
      label: filterConfig.filter.label,
      collapsible: true,
      defaultExpanded: false,
      filters: [filterConfig.filter]
    })
  })

  return {
    dynamicFilterConfig: {
      id: 'investment-catalog-filters',
      name: 'Catalog Filters',
      groups
    },
    filterConditionByFilterId,
    relationFilterOptionSources
  }
}

export const getAggregatedInvestmentListFields = (
  group: InvestmentGroup,
  catalogData: InvestmentListCatalogData
): FormFieldDefinition[] => {
  const groupEntry = catalogData.investmentGroups.find(entry => entry.id === group.id || entry.code === group.code)
  const groupObjectValue = groupEntry?.objectValue || group.objectValue
  const groupFields = getDisplayFields(groupObjectValue)

  const investmentTypeEntries = catalogData.investmentTypes.filter(entry => belongsToParent(entry, group))
  const investmentTypeFields = investmentTypeEntries.flatMap(entry => getDisplayFields(entry.objectValue))

  const isLiquidFundSubtype = getRequiredSubtypeKey(groupObjectValue) === LIQUID_FUND_REQUIRED_SUBTYPE_KEY
  const liquidFundTypeEntries = isLiquidFundSubtype ? catalogData.investmentLiquidFundTypes : []
  const liquidFundTypeFields = liquidFundTypeEntries.flatMap(entry => getDisplayFields(entry.objectValue))
  const conditionalLiquidFundFields = isLiquidFundSubtype ? [LIQUID_FUND_TYPE_FIELD] : []

  return dedupeFieldsByColumnId([groupFields, investmentTypeFields, conditionalLiquidFundFields, liquidFundTypeFields])
}

const buildInvestmentListColumnConfigurationFromFields = (
  fields: FormFieldDefinition[]
): InvestmentListColumnConfiguration => {
  // Drop catalog fields whose ids collide with any universal leading/trailing column to
  // avoid duplicate column entries when a catalog also exposes investmentType, ownerEmployee, etc.
  const fieldsWithoutUniversalCollisions = fields.filter(
    field => !UNIVERSAL_ALL_COLUMN_IDS.has(propertyToColumnId(field.property))
  )
  const queryFields = new Set<string>(UNIVERSAL_QUERY_FIELDS)
  const sortDescriptors: Descriptor[] = [...INVESTMENT_DESCRIPTORS]
  const sortFieldByColumnId: Record<string, string> = {}
  const { dynamicFilterConfig, filterConditionByFilterId, relationFilterOptionSources } =
    buildDynamicFilterConfiguration(fieldsWithoutUniversalCollisions)

  const columns: ColumnDef<Investment>[] = fieldsWithoutUniversalCollisions.map(field => {
    const id = propertyToColumnId(field.property)
    const descriptorMapping = getCatalogDescriptorMapping(field.property)
    const relationSortDescriptor = buildRelationSortDescriptor(id, descriptorMapping)
    const queryField = descriptorMapping?.queryField || getQueryFieldForProperty(field.property)
    let sortField = getSortFieldForProperty(field.property)

    if (descriptorMapping?.canSort) {
      sortField = descriptorMapping.descriptor.key
    }

    if (relationSortDescriptor) {
      sortField = relationSortDescriptor.key
    }

    if (queryField) {
      queryFields.add(queryField)
    }

    if (relationSortDescriptor) {
      sortDescriptors.push(relationSortDescriptor)
    }

    if (sortField && !UNSORTABLE_FIELD_TYPES.has(field.type)) {
      sortFieldByColumnId[id] = sortField
    }

    return {
      id,
      header: field.label,
      enableSorting: Boolean(sortFieldByColumnId[id]),
      meta: {
        align: getFieldClassName(field.type) === 'gba:text-right' ? ('right' as const) : undefined,
        type: field.type === 'DATE' || field.type === 'DATETIME' ? ('date' as const) : undefined
      },
      cell: ({ row }) => {
        const value = resolveFieldValue(row.original, field.property)
        const effectiveType = field.property.toLowerCase().includes('interestrate') ? 'PERCENTAGE' : field.type
        const formattedValue = formatFieldValue(value, effectiveType, getCurrencyCode(row.original))

        return React.createElement(
          'div',
          {
            className: `gba:text-sm gba:truncate ${getFieldClassName(effectiveType)}`,
            title: formattedValue
          },
          formattedValue
        )
      }
    }
  })

  const catalogAvailableColumns = fieldsWithoutUniversalCollisions.map(field => ({
    id: propertyToColumnId(field.property),
    label: field.label
  }))

  const buildUniversalColumnDef = (spec: UniversalColumnSpec): ColumnDef<Investment> => {
    if (spec.sortField) {
      sortFieldByColumnId[spec.id] = spec.sortField
    }
    return {
      id: spec.id,
      header: spec.label,
      accessorKey: spec.accessor,
      size: spec.width.size,
      minSize: spec.width.min,
      maxSize: spec.width.max,
      enableResizing: false,
      enableSorting: Boolean(spec.sortField),
      meta: {
        ...(spec.isDate ? { type: 'date' as const } : {}),
        ...(spec.align ? { align: spec.align } : {})
      },
      cell: spec.cell
    }
  }

  const universalLeadingDefs = UNIVERSAL_LEADING_COLUMNS.map(buildUniversalColumnDef)
  const universalTrailingDefs = UNIVERSAL_TRAILING_COLUMNS.map(buildUniversalColumnDef)

  const universalLeadingAvailableColumns = UNIVERSAL_LEADING_COLUMNS.map(spec => ({
    id: spec.id,
    label: spec.label
  }))
  const universalTrailingAvailableColumns = UNIVERSAL_TRAILING_COLUMNS.map(spec => ({
    id: spec.id,
    label: spec.label
  }))

  const availableColumns = [
    ...universalLeadingAvailableColumns,
    ...catalogAvailableColumns,
    ...universalTrailingAvailableColumns
  ]

  return {
    columns: [...universalLeadingDefs, ...columns, ...universalTrailingDefs],
    availableColumns,
    sortableColumns: availableColumns.filter(column => sortFieldByColumnId[column.id]),
    defaultVisibleColumns: [...UNIVERSAL_VISIBLE_COLUMNS, ...availableColumns.map(column => column.id), 'actions'],
    queryFields: Array.from(queryFields),
    sortDescriptors,
    sortFieldByColumnId,
    dynamicFilterConfig,
    filterConditionByFilterId,
    relationFilterOptionSources
  }
}

export const buildInvestmentListColumnConfiguration = (
  formFieldsDefinition?: FormFieldsDefinition | null
): InvestmentListColumnConfiguration => {
  return buildInvestmentListColumnConfigurationFromFields(getDisplayFields(formFieldsDefinition))
}

export const buildAggregatedInvestmentListColumnConfiguration = (
  group: InvestmentGroup,
  catalogData: InvestmentListCatalogData
): InvestmentListColumnConfiguration => {
  return buildInvestmentListColumnConfigurationFromFields(getAggregatedInvestmentListFields(group, catalogData))
}
