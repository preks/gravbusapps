// Investment Report Column Definitions Factory
import React from 'react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel, formatDate } from '@/common/utils/windowUtils'
import { findFormFieldsDefinition, formatFieldValue } from '../../utils/investmentHeaderConfig'
import { getValueByPath } from '@/common/utils/objectUtils'
import { FormFieldDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'

export interface ColumnDefinition {
  key: string
  title: string
  width?: string
  sortable?: boolean
  render: (record: any) => React.ReactElement
}

/**
 * Creates investment report columns using dynamic catalog-based field definitions
 * REPORTS CONTEXT: We're dealing with InvestmentReport entities from report tables
 */
export const createInvestmentReportColumns = (
  investmentTypeCode: string,
  liquidFundTypeCode: string | undefined,
  catalogData: any,
  accessToken?: string,
  mainInvestment?: any
): ColumnDefinition[] => {
  const columns: ColumnDefinition[] = []

  // Always add date as first column
  columns.push({
    key: 'date',
    title: getTranslationFromI18nKeyAndLabel('crm.investments.reports.columns.date', 'Date'),
    sortable: true,
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

  const investmentGroup = mainInvestment?.investmentGroup?.code
  const formFieldsDefinition = findFormFieldsDefinition({
    investment: mainInvestment,
    catalogData,
    investmentTypeCode,
    liquidFundTypeCode,
    investmentGroupCode: investmentGroup
  })

  if (formFieldsDefinition?.formFields) {
    // Get all fields and sort by display order (same as header)
    const allFields: FormFieldDefinition[] = []
    formFieldsDefinition.formFields.forEach(group => {
      allFields.push(...group.fields)
    })

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
        width: getReportColumnWidth(field.type),
        sortable: isReportFieldSortable(field.type),
        render: (record: any) => {
          // REPORTS DATA STRUCTURE: record is InvestmentReport from report tables
          // Fields are stored in type-specific nested arrays (realEstateInvestmentReport, etc.)

          let value

          if (field.property.startsWith('investment.')) {
            // INVESTMENT FIELDS: For reports, these are report-level snapshots, not current investment values
            // Strip the 'investment.' prefix and look ONLY at report root level (no fallback to nested investment)
            const fieldName = field.property.replace('investment.', '')
            value = getValueByPath(record, fieldName)
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
  }

  // Add actions column
  if (accessToken) {
    columns.push({
      key: 'actions',
      title: '', // Empty title as requested
      render: (record: any) =>
        React.createElement(AppAction, {
          variant: 'table-row',
          contexts: [
            {
              context: FlowContextName.investmentReportEntity,
              contextData: { investmentReportId: record.id }
            }
          ],
          prefixDataTestId: 'investment-reports-update',
          accessToken: accessToken,
          lazyLoad: true,
          onClick: (e: React.MouseEvent) => e.stopPropagation(),
          'data-testid': `investment-reports-update-button-${record.id}`
        })
    })
  }

  return columns
}

/**
 * Helper functions for report column configuration
 */
const getReportColumnWidth = (fieldType: string): string => {
  switch (fieldType) {
    case 'DATE':
    case 'DATETIME':
      return '120px'
    case 'AMOUNT':
      return '140px'
    case 'PERCENTAGE':
    case 'NUMBER':
      return '100px'
    case 'TEXT':
      return '180px'
    default:
      return '150px' // Default width for unknown types to prevent overflow
  }
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
