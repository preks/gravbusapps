// Liquid Fund Report Column Transformer
// Transforms form field definitions into table columns following the same pattern as header transformations

import { FormFieldsDefinition, FormFieldDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { formatCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { getValueByPath } from '@/common/utils/objectUtils'

/**
 * Formats a field value for table display based on its type
 * Same logic as investmentHeaderConfig but optimized for table cells
 */
const formatFieldValueForTable = (value: any, fieldType: string, currencyCode: string): string => {
  if (value === null || value === undefined) return '-'

  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      } catch {
        return '-'
      }

    case 'AMOUNT':
      return typeof value === 'number' ? formatCurrency(value, currencyCode) : '-'

    case 'PERCENTAGE':
      return typeof value === 'number' ? `${value}%` : '-'

    case 'NUMBER':
      return typeof value === 'number' ? formatNumberFunction(value) : '-'

    case 'TEXT':
    case 'TEXTAREA':
      return value.toString()

    default:
      // Handle catalog fields
      if (fieldType.startsWith('CATALOG_') || fieldType.startsWith('REF_')) {
        if (typeof value === 'object' && value.value) {
          return value.value // Catalog entry
        }
        if (typeof value === 'object' && value.name) {
          return value.name // Entity reference
        }
      }
      return value.toString()
  }
}

/**
 * Interface for dynamic table columns
 */
export interface DynamicTableColumn {
  id: string
  label: string
  type: string
  property: string
  displayOrder: number
  getValue: (row: any) => string
  className?: string
}

/**
 * Transforms form field definitions into table column configurations
 * Following the same pattern as transformFormFieldsToHeaderItems
 */
export const transformFormFieldsToTableColumns = (
  formFieldsDefinition: FormFieldsDefinition | null,
  defaultCurrency: string = 'EUR'
): DynamicTableColumn[] => {
  if (!formFieldsDefinition?.formFields) return []

  const columns: DynamicTableColumn[] = []

  // Combine all field definitions from all groups
  const allFields: FormFieldDefinition[] = []
  formFieldsDefinition.formFields.forEach(group => {
    allFields.push(...group.fields)
  })

  // Sort fields by display order
  allFields.sort((a, b) => {
    const orderA = Number.parseFloat(a.displayOrder || '999')
    const orderB = Number.parseFloat(b.displayOrder || '999')
    return orderA - orderB
  })

  // Transform each field to a table column
  allFields.forEach(field => {
    const currencyCode = extractCurrencyCode(defaultCurrency)

    // Special handling: Interest rate fields should always be formatted as percentages
    // even if catalog incorrectly defines them as AMOUNT
    const effectiveFieldType = field.property.toLowerCase().includes('interestrate') ? 'PERCENTAGE' : field.type

    columns.push({
      id: field.property.split('.').join('_'), // Convert dot notation to underscore for HTML IDs
      label: field.label,
      type: field.type,
      property: field.property,
      displayOrder: Number.parseFloat(field.displayOrder || '999'),
      getValue: (row: any) => {
        const prop = field.property
        let value = getValueByPath(row, prop)

        if (value === undefined) {
          const tryFrom = (source: any, prefix: string) => {
            if (!source) return undefined
            const rest = prop.startsWith(prefix) ? prop.slice(prefix.length) : prop
            const trimmed = rest.startsWith('.') ? rest.slice(1) : rest
            return getValueByPath(source, trimmed)
          }

          const lfi = Array.isArray(row.liquidFundInvestment) ? row.liquidFundInvestment[0] : row.liquidFundInvestment
          value =
            tryFrom(lfi, 'liquidFundInvestment') ??
            tryFrom(row.investment, 'investment') ??
            tryFrom(row.liquidFundReport, 'liquidFundReport')

          // SPECIAL FIX: If catalog defines liquidFundInvestment.additionalProperties but value not found,
          // try liquidFundReport.additionalProperties instead (report data is stored in liquidFundReport)
          if (value === undefined && prop.startsWith('liquidFundInvestment.additionalProperties.')) {
            const fieldName = prop.replace('liquidFundInvestment.additionalProperties.', '')
            value = getValueByPath(row.liquidFundReport, `additionalProperties.${fieldName}`)
          }
        }

        return formatFieldValueForTable(value, effectiveFieldType, currencyCode)
      },
      className: getColumnClassName(effectiveFieldType)
    })
  })

  return columns
}

/**
 * Get appropriate CSS classes for column types
 */
const getColumnClassName = (fieldType: string): string => {
  switch (fieldType) {
    case 'AMOUNT':
      return 'gba:text-right' // Removed gba:font-mono for consistent font styling
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

// Note: getDynamicColumnsForType functionality is now provided by useInvestmentLiquidFundReportCatalog hook

/**
 * Groups dynamic columns by type for better table organization
 */
export const groupDynamicColumnsByType = (columns: DynamicTableColumn[]) => {
  const groups = {
    financial: columns.filter(col => col.type === 'AMOUNT'),
    dates: columns.filter(col => col.type === 'DATE' || col.type === 'DATETIME'),
    text: columns.filter(col => col.type === 'TEXT' || col.type === 'TEXTAREA'),
    numbers: columns.filter(col => col.type === 'NUMBER' || col.type === 'PERCENTAGE'),
    catalog: columns.filter(col => col.type.startsWith('CATALOG_') || col.type.startsWith('REF_'))
  }

  return groups
}
