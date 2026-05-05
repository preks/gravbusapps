// Investment Report Column Definitions Factory
import React from 'react'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { findFormFieldsDefinition, formatFieldValue } from '../../utils/investmentHeaderConfig'
import { getValueByPath } from '@/common/utils/objectUtils'
import { FormFieldDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import { formatExportDate } from '@/common/utils/excelExportUtils'

export interface ColumnDefinition {
  key: string
  title: string
  width?: string
  sortable?: boolean
  render: (record: any) => React.ReactElement
  /** Plain-text value extractor for CSV/Excel export. Uses CRM amount pattern (no currency symbol). */
  getTextValue?: (record: any) => string
}

type ReportColumnField = Pick<FormFieldDefinition, 'type' | 'label' | 'property' | 'report'> &
  Partial<Pick<FormFieldDefinition, 'required' | 'displayOrder'>>

/** Extracts the raw field value from an InvestmentReport record, mirroring the render path logic. */
const getRecordFieldValue = (field: ReportColumnField, record: any): any => {
  if (field.property.startsWith('investment.')) {
    const fieldName = field.property.replace('investment.', '')
    return fieldName === 'investmentRole' ? record.investmentRoleReport : getValueByPath(record, fieldName)
  }
  if (field.property.startsWith('equityInvestment.')) {
    const fieldName = field.property.replace('equityInvestment.', '')
    const fromReport = getValueByPath(record.equityInvestmentReport?.[0], fieldName)
    return fromReport === undefined
      ? getValueByPath(record.equityInvestmentReport?.[0]?.equityInvestment, fieldName)
      : fromReport
  }
  if (field.property.startsWith('liquidFundInvestment.')) {
    const fieldName = field.property.replace('liquidFundInvestment.', '')
    const fromReport = getValueByPath(record.liquidFundInvestmentReport?.[0], fieldName)
    return fromReport === undefined
      ? getValueByPath(record.liquidFundInvestmentReport?.[0]?.liquidFundInvestment, fieldName)
      : fromReport
  }
  if (field.property.startsWith('realEstateInvestment.')) {
    const fieldName = field.property.replace('realEstateInvestment.', '')
    const fromReport = getValueByPath(record.realEstateInvestmentReport?.[0], fieldName)
    return fromReport === undefined
      ? getValueByPath(record.realEstateInvestmentReport?.[0]?.realEstateInvestment, fieldName)
      : fromReport
  }
  return getValueByPath(record, field.property)
}

const getRecordCurrencyCode = (record: any): string =>
  record.currency?.code?.split(':').pop() || record.investment?.currency?.code?.split(':').pop() || ''

/**
 * Formats a raw field value for CSV/Excel export.
 * AMOUNT uses the CRM pattern (`{value} {currency}`, no symbol) to avoid Excel column-width issues.
 */
const formatExportFieldValue = (value: any, fieldType: string, currencyCode: string): string => {
  if (value === null || value === undefined || value === '') return '-'

  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      return formatExportDate(String(value))

    case 'AMOUNT': {
      const num = typeof value === 'number' ? value : Number.parseFloat(String(value))
      if (Number.isNaN(num)) return '-'
      if (num === 0) return '0'
      return currencyCode ? `${num} ${currencyCode}` : String(num)
    }

    default:
      return formatFieldValue(value, fieldType, currencyCode)
  }
}

/**
 * Creates investment report columns using dynamic catalog-based field definitions
 * REPORTS CONTEXT: We're dealing with InvestmentReport entities from report tables
 */
export const createInvestmentReportColumns = (
  investmentTypeCode: string,
  liquidFundTypeCode: string | undefined,
  catalogData: any,
  mainInvestment?: any,
  resolvedFields?: ReportColumnField[]
): ColumnDefinition[] => {
  const columns: ColumnDefinition[] = []

  // Always add date as first column
  columns.push({
    key: 'date',
    title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.date', 'Date'),
    sortable: true,
    getTextValue: (record: any) => formatExportDate(record.date),
    render: (record: any) => {
      const date = record.date
      if (!date) return React.createElement('div', { className: 'gba:flex gba:items-center gba:h-8' }, '-')
      try {
        const formatted = formatDate(date, 'date.short')
        let displayValue: string
        if (formatted && !formatted.includes('T')) {
          displayValue = formatted
        } else {
          const dateObj = new Date(date)
          if (Number.isNaN(dateObj.getTime())) {
            return React.createElement('div', { className: 'gba:flex gba:items-center gba:h-8' }, '-')
          }
          displayValue = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
        }
        return React.createElement('div', { className: 'gba:flex gba:items-center gba:h-8' }, displayValue)
      } catch {
        return React.createElement('div', { className: 'gba:flex gba:items-center gba:h-8' }, '-')
      }
    }
  })

  // Get all fields and sort by display order (same as header)
  const allFields: ReportColumnField[] = resolvedFields ? [...resolvedFields] : []
  if (!resolvedFields) {
    const investmentGroup = mainInvestment?.investmentGroup?.code
    const formFieldsDefinition = findFormFieldsDefinition({
      investment: mainInvestment,
      catalogData,
      investmentTypeCode,
      liquidFundTypeCode,
      investmentGroupCode: investmentGroup
    })

    formFieldsDefinition?.formFields?.forEach(group => {
      allFields.push(...group.fields)
    })
  }

  allFields.sort((a, b) => {
    const orderA = parseFloat(a.displayOrder || '999')
    const orderB = parseFloat(b.displayOrder || '999')
    return orderA - orderB
  })

  // Transform each field to a table column
  allFields.forEach(field => {
    // Filter out fields with report: false (not for report tables)
    if (field.report === false) {
      return
    }

    columns.push({
      key: field.property.replace(/\./g, '_'),
      title: field.label,
      width: getReportColumnWidth(field.type, field.label),
      sortable: isReportFieldSortable(field.type),
      getTextValue: (record: any) => {
        const effectiveType = field.property.toLowerCase().includes('interestrate') ? 'PERCENTAGE' : field.type
        const value = getRecordFieldValue(field, record)
        return formatExportFieldValue(value, effectiveType, getRecordCurrencyCode(record))
      },
      render: (record: any) => {
        // REPORTS DATA STRUCTURE: record is InvestmentReport from report tables
        // Fields are stored in type-specific nested arrays (realEstateInvestmentReport, etc.)

        let value

        if (field.property.startsWith('investment.')) {
          // INVESTMENT FIELDS: For reports, these are report-level snapshots, not current investment values
          // Strip the 'investment.' prefix and look ONLY at report root level (no fallback to nested investment)
          const fieldName = field.property.replace('investment.', '')
          // investmentRole at report level is stored in investmentRoleReport array
          if (fieldName === 'investmentRole') {
            value = record.investmentRoleReport
          } else {
            value = getValueByPath(record, fieldName)
          }
        } else if (field.property.startsWith('equityInvestment.')) {
          // EQUITY INVESTMENT FIELDS: Map to correct paths in equityInvestmentReport
          const fieldName = field.property.replace('equityInvestment.', '')

          // First try direct equityInvestmentReport fields (marketValue, ebitdaAmount, etc.)
          // Note: equityInvestmentReport is an array, access first element
          value = getValueByPath(record.equityInvestmentReport?.[0], fieldName)

          // If not found, try nested equityInvestment fields (foundationDate, etc.)
          if (value === undefined) {
            value = getValueByPath(record.equityInvestmentReport?.[0]?.equityInvestment, fieldName)
          }
        } else if (field.property.startsWith('liquidFundInvestment.')) {
          // LIQUID FUND INVESTMENT FIELDS: Map to correct paths in liquidFundInvestmentReport
          const fieldName = field.property.replace('liquidFundInvestment.', '')

          // First try direct liquidFundInvestmentReport fields
          // Note: liquidFundInvestmentReport is an array, access first element
          value = getValueByPath(record.liquidFundInvestmentReport?.[0], fieldName)

          // If not found, try nested liquidFundInvestment fields
          if (value === undefined) {
            value = getValueByPath(record.liquidFundInvestmentReport?.[0]?.liquidFundInvestment, fieldName)
          }
        } else if (field.property.startsWith('realEstateInvestment.')) {
          const fieldName = field.property.replace('realEstateInvestment.', '')

          value = getValueByPath(record.realEstateInvestmentReport?.[0], fieldName)

          if (value === undefined) {
            value = getValueByPath(record.realEstateInvestmentReport?.[0]?.realEstateInvestment, fieldName)
          }
        } else {
          // For all other field paths, retrieve directly from the record
          // Each group-specific field should be explicitly handled in the if/else if blocks above
          value = getValueByPath(record, field.property)
        }

        const currencyCode =
          record.currency?.code?.split(':').pop() || record.investment?.currency?.code?.split(':').pop() // InvestmentReport.currency (primary) // Investment.currency (fallback)

        // Special handling: Interest rate fields should always be formatted as percentages
        // even if catalog incorrectly defines them as AMOUNT
        let effectiveFieldType = field.type
        if (field.property.toLowerCase().includes('interestrate')) {
          effectiveFieldType = 'PERCENTAGE'
        }

        const formattedValue = formatFieldValue(value, effectiveFieldType, currencyCode)

        return React.createElement(
          'div',
          {
            className: `gba:flex gba:items-center gba:h-8 ${getReportColumnClassName(effectiveFieldType)}`
          },
          React.createElement(
            'span',
            {
              className: 'gba:truncate gba:block',
              title: formattedValue
            },
            formattedValue
          )
        )
      }
    })
  })

  return columns
}

/**
 * Helper functions for report column configuration
 */
const getReportColumnWidth = (fieldType: string, label?: string): string => {
  // Base width from field type
  let baseWidth = 150
  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      baseWidth = 120
      break
    case 'AMOUNT':
      baseWidth = 140
      break
    case 'PERCENTAGE':
    case 'NUMBER':
      baseWidth = 100
      break
    case 'TEXT':
      baseWidth = 180
      break
  }

  // If label provided, calculate width needed (roughly 8px per character + padding)
  if (label) {
    const labelWidth = Math.ceil(label.length * 8) + 32 // 32px for padding/icons
    return `${Math.max(baseWidth, labelWidth)}px`
  }

  return `${baseWidth}px`
}

const getReportColumnClassName = (fieldType: string): string => {
  switch (fieldType) {
    case 'AMOUNT':
    case 'PERCENTAGE':
    case 'NUMBER':
      return 'gba:text-right'
    case 'DATE':
    case 'DATETIME':
      return 'gba:text-center'
    default:
      return 'gba:text-left'
  }
}

const isReportFieldSortable = (fieldType: string): boolean => {
  return ['DATE', 'DATETIME', 'AMOUNT', 'PERCENTAGE', 'NUMBER', 'TEXT'].includes(fieldType)
}
