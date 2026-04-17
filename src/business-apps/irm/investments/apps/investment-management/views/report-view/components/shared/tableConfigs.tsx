// Table Configurations for Investment Report Tables
// Pre-configured settings for Equity, Real Estate, and Liquid Fund tables

import React from 'react'
import { ChartPieIcon, BuildingsIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createInvestmentReportColumns } from '@/business-apps/irm/investments/records/investment-record/components/shared/columnDefinitions'
import { InvestmentReportTableConfig, ColumnConfig } from './types'

/**
 * Factory that builds the standard investment-name column and wires up dynamic
 * catalog columns for a given investment group.  Shared by EQUITY and REAL_ESTATE
 * configs to avoid duplicating the identical ~40-line column-generator body.
 */
function createStandardColumnGenerator(
  investmentGroupCode: string,
  Icon: React.ElementType,
  iconProps: { className?: string; style?: React.CSSProperties }
): InvestmentReportTableConfig['columnGenerator'] {
  return ({ investmentType, catalogData, accessToken }) => {
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        getTextValue: (record: any) => record.investment?.name || '-',
        render: (record: any) => (
          <div className="gba:flex gba:items-center gba:gap-2 gba:h-8">
            <Icon {...iconProps} />
            <span className="gba:font-medium gba:truncate gba:block" title={record.investment?.name || 'N/A'}>
              {record.investment?.name || 'N/A'}
            </span>
          </div>
        )
      }
    ]

    if (!catalogData) return staticColumns

    const dynamicColumns = createInvestmentReportColumns(investmentType, undefined, catalogData, accessToken, {
      investmentGroup: { code: investmentGroupCode }
    })

    if (!dynamicColumns || dynamicColumns.length === 0) return staticColumns

    return [...staticColumns, ...dynamicColumns]
  }
}

/**
 * Equity Investment Table Configuration
 */
export const EQUITY_TABLE_CONFIG: InvestmentReportTableConfig = {
  investmentGroup: 'EQUITY',
  icon: ChartPieIcon,
  emptyStateMessage: {
    title: type => `No ${type} Data Found`,
    description: type =>
      `No equity investment reports are available for ${type.toLowerCase()} in the selected time period.`
  },
  fromSubView: 'equity',
  columnGenerator: createStandardColumnGenerator('EQUITY', ChartPieIcon, {
    className: 'gba:w-4 gba:h-4 gba:shrink-0',
    style: { color: 'var(--nw-color-text-secondary)' }
  }),
  getInvestmentId: row => row.investment?.id,
  getInvestmentName: row => row.investment?.name || 'N/A'
}

/**
 * Real Estate Investment Table Configuration
 */
export const REAL_ESTATE_TABLE_CONFIG: InvestmentReportTableConfig = {
  investmentGroup: 'REAL_ESTATE',
  icon: BuildingsIcon,
  emptyStateMessage: {
    title: type => `No ${type} Data Found`,
    description: type =>
      `No real estate investment reports are available for ${type.toLowerCase()} in the selected time period.`
  },
  fromSubView: 'real-estate',
  columnGenerator: createStandardColumnGenerator('REAL_ESTATE', BuildingsIcon, {
    className: 'gba:shrink-0',
    style: { width: 'var(--nw-spacing-4)', height: 'var(--nw-spacing-4)', color: 'var(--nw-muted-foreground)' }
  }),
  getInvestmentId: row => row.investment?.id,
  getInvestmentName: row => row.investment?.name || 'N/A'
}

/**
 * Liquid Fund Investment Table Configuration
 */
export const LIQUID_FUND_TABLE_CONFIG: InvestmentReportTableConfig = {
  investmentGroup: 'LIQUID_FUND',
  icon: undefined, // No icon for liquid funds
  emptyStateMessage: {
    title: type => `No ${type} Data Found`,
    description: type =>
      `No liquid fund portfolios are available for ${type.toLowerCase()} in the selected time period.`
  },
  fromSubView: 'liquid-fund',
  columnGenerator: () => {
    // Liquid Fund columns are generated dynamically via columnsOverride in GenericReportTab
    // This fallback only returns minimal static columns (Investment + Date)
    // If columnsOverride is not provided, only these columns will show
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        render: (record: any) => (
          <span style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>{record.investmentName || 'N/A'}</span>
        )
      },
      {
        key: 'date',
        title: 'Date',
        width: '120px',
        render: (record: any) => {
          if (!record.reportDate) return <span>-</span>
          try {
            return (
              <span style={{ textAlign: 'center' }}>
                {new Date(record.reportDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
            )
          } catch {
            return <span>-</span>
          }
        }
      }
    ]

    // Return only static columns as fallback
    // GenericReportTab will provide columnsOverride with dynamic catalog-based columns
    return staticColumns
  },
  actionsRenderer: (row, accessToken) => {
    if (!row.reportId) return null
    return (
      <AppAction
        variant="table-row"
        contexts={[
          {
            context: FlowContextName.investmentReportEntity,
            contextData: { investmentReportId: row.reportId }
          }
        ]}
        prefixDataTestId="liquid-fund-reports-update"
        accessToken={accessToken}
        emptyState="enable"
        lazyLoad
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        data-testid={`liquid-fund-reports-update-button-${row.reportId}`}
      />
    )
  },
  getInvestmentId: row => row.investmentId,
  getInvestmentName: row => row.investmentName || 'N/A',
  getReportId: row => row.reportId
}
