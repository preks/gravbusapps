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
import type { InvestmentCatalogEntry, InvestmentGroup, InvestmentListCatalogData } from '../hooks/useInvestmentGroups'

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
  sortFieldByColumnId: Record<string, string>
  dynamicFilterConfig: FilterConfiguration
  filterConditionByFilterId: Record<string, InvestmentDynamicFilterCondition>
}

type FilterGroup = NonNullable<FilterConfiguration['groups']>[number]
type Filter = FilterGroup['filters'][number]

export interface InvestmentDynamicFilterCondition {
  relationField?: 'equityInvestment' | 'realEstateInvestment' | 'liquidFundInvestment'
  descriptor: Descriptor
  filterType: 'number' | 'date' | 'text' | 'boolean'
}

const UNIVERSAL_VISIBLE_COLUMNS = ['name']
const UNIVERSAL_QUERY_FIELDS = [
  'id',
  'name',
  'currency',
  'currencyRef',
  'investmentGroup',
  'investmentGroupRef',
  'investmentStatus',
  'investmentStatusRef',
  'investmentType',
  'investmentTypeRef'
]

const SKIPPED_CATALOG_PROPERTIES = new Set(['investment.id', 'investment.name', 'id', 'name'])
const UNSORTABLE_FIELD_TYPES = new Set(['TEXTAREA'])
const RELATION_SORTING_ENABLED = false

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

const isAdditionalPropertiesPath = (propertyPath: string): boolean => {
  return propertyPath === 'additionalProperties' || propertyPath.startsWith('additionalProperties.')
}

const getDescriptorPath = (descriptor: Descriptor): string | undefined => {
  return descriptor.path || descriptor.sortPath || descriptor.searchPaths?.[0]
}

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
      (!relationField || RELATION_SORTING_ENABLED),
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
    const columnId = field.property.replaceAll('.', '_')
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
): { filter: Filter; condition: InvestmentDynamicFilterCondition } | null => {
  if (!mapping?.canFilter || !mapping.descriptorPath) {
    return null
  }

  const filterType = getFilterTypeFromCatalogType(field.type)
  if (!filterType) {
    return null
  }

  const filterId = mapping.relationField ? field.property.replaceAll('.', '_') : mapping.descriptor.key
  const descriptor: Descriptor = {
    ...mapping.descriptor,
    key: filterId,
    path: mapping.descriptorPath
  }
  const filter: Filter = {
    id: filterId,
    field: filterId,
    label: field.label,
    type: filterType === 'boolean' ? 'multi-select' : filterType,
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

  if (filterType === 'text') {
    filter.config = { placeholder: `Search ${field.label}...` }
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

  return {
    filter,
    condition: {
      relationField: mapping.relationField,
      descriptor,
      filterType
    }
  }
}

const buildDynamicFilterConfiguration = (
  fields: FormFieldDefinition[]
): Pick<InvestmentListColumnConfiguration, 'dynamicFilterConfig' | 'filterConditionByFilterId'> => {
  const filterConditionByFilterId: Record<string, InvestmentDynamicFilterCondition> = {}
  const seenFilterIds = new Set<string>()
  const groups: FilterGroup[] = []

  fields.forEach(field => {
    const filterConfig = buildFilterConfigForField(field, getCatalogDescriptorMapping(field.property))
    if (!filterConfig || seenFilterIds.has(filterConfig.filter.id)) {
      return
    }

    seenFilterIds.add(filterConfig.filter.id)
    filterConditionByFilterId[filterConfig.filter.id] = filterConfig.condition
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
    filterConditionByFilterId
  }
}

export const getAggregatedInvestmentListFields = (
  group: InvestmentGroup,
  catalogData: InvestmentListCatalogData
): FormFieldDefinition[] => {
  const groupEntry = catalogData.investmentGroups.find(entry => entry.id === group.id || entry.code === group.code)
  const groupFields = getDisplayFields(groupEntry?.objectValue || group.objectValue)

  const investmentTypeEntries = catalogData.investmentTypes.filter(entry => belongsToParent(entry, group))
  const investmentTypeFields = investmentTypeEntries.flatMap(entry => getDisplayFields(entry.objectValue))

  const liquidFundTypeEntries = group.code === 'LIQUID_FUND' ? catalogData.investmentLiquidFundTypes : []
  const liquidFundTypeFields = liquidFundTypeEntries.flatMap(entry => getDisplayFields(entry.objectValue))

  return dedupeFieldsByColumnId([groupFields, investmentTypeFields, liquidFundTypeFields])
}

const buildInvestmentListColumnConfigurationFromFields = (
  fields: FormFieldDefinition[]
): InvestmentListColumnConfiguration => {
  const queryFields = new Set<string>(UNIVERSAL_QUERY_FIELDS)
  const sortFieldByColumnId: Record<string, string> = {}
  const { dynamicFilterConfig, filterConditionByFilterId } = buildDynamicFilterConfiguration(fields)

  const columns: ColumnDef<Investment>[] = fields.map(field => {
    const id = field.property.replaceAll('.', '_')
    const descriptorMapping = getCatalogDescriptorMapping(field.property)
    const queryField = descriptorMapping?.queryField || getQueryFieldForProperty(field.property)
    const sortField = descriptorMapping?.canSort
      ? descriptorMapping.descriptor.key
      : getSortFieldForProperty(field.property)

    if (queryField) {
      queryFields.add(queryField)
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

  const availableColumns = fields.map(field => ({
    id: field.property.replaceAll('.', '_'),
    label: field.label
  }))

  return {
    columns,
    availableColumns,
    sortableColumns: availableColumns.filter(column => sortFieldByColumnId[column.id]),
    defaultVisibleColumns: [...UNIVERSAL_VISIBLE_COLUMNS, ...availableColumns.map(column => column.id), 'actions'],
    queryFields: Array.from(queryFields),
    sortFieldByColumnId,
    dynamicFilterConfig,
    filterConditionByFilterId
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
