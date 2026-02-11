// Table Configurations for Investment Report Tables
// Pre-configured settings for Equity, Real Estate, and Liquid Fund tables

import React from 'react'
import { ChartPieIcon, BuildingsIcon } from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createInvestmentReportColumns } from '@/business-apps/irm/investments/records/investment-record/components/shared/columnDefinitions'
import { InvestmentReportTableConfig, ColumnConfig } from './types'

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
  columnGenerator: ({ investmentType, catalogData, accessToken }) => {
    // First add the static Investment column with icon
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        render: (record: any) => (
          <div className="gba:flex gba:items-center gba:gap-2 gba:h-8">
            <ChartPieIcon
              className="gba:w-4 gba:h-4 gba:shrink-0"
              style={{ color: 'var(--nw-color-text-secondary)' }}
            />
            <span className="gba:font-medium gba:truncate gba:block" title={record.investment?.name || 'N/A'}>
              {record.investment?.name || 'N/A'}
            </span>
          </div>
        )
      }
    ]

    // Don't create dynamic columns if catalog data isn't ready
    if (!catalogData) {
      return staticColumns
    }

    // For reports-view, provide investment group context for correct column logic
    const mockInvestmentForContext = {
      investmentGroup: { code: 'EQUITY' }
    }

    const dynamicColumns = createInvestmentReportColumns(
      investmentType,
      undefined,
      catalogData,
      accessToken,
      mockInvestmentForContext
    )

    return [...staticColumns, ...dynamicColumns]
  },
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
  columnGenerator: ({ investmentType, catalogData, accessToken }) => {
    // First add the static Investment column with icon
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        render: (record: any) => (
          <div className="gba:flex gba:items-center gba:gap-2 gba:h-8">
            <BuildingsIcon
              className="gba:shrink-0"
              style={{
                width: 'var(--nw-spacing-4)',
                height: 'var(--nw-spacing-4)',
                color: 'var(--nw-muted-foreground)'
              }}
            />
            <span className="gba:font-medium gba:truncate gba:block" title={record.investment?.name || 'N/A'}>
              {record.investment?.name || 'N/A'}
            </span>
          </div>
        )
      }
    ]

    if (!catalogData) {
      return staticColumns
    }

    const mockInvestmentForContext = {
      investmentGroup: { code: 'REAL_ESTATE' }
    }

    const dynamicColumns = createInvestmentReportColumns(
      investmentType,
      undefined,
      catalogData,
      accessToken,
      mockInvestmentForContext
    )

    return [...staticColumns, ...dynamicColumns]
  },
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
    // Static columns for liquid funds (investment and date)
    // Note: Liquid fund columns are actually generated via columnsOverride in LiquidFundReport.tsx
    // This is just a fallback that returns basic columns
    const staticColumns: ColumnConfig[] = [
      {
        key: 'investment',
        title: 'Investment',
        render: (record: any) => (
          <span style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>{record.investmentName || 'N/A'}</span>
        )
      },
      {
        key: 'date',
        title: 'Date',
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

    // For liquid funds, we would need to integrate with useInvestmentLiquidFundReportCatalog
    // to get dynamic columns. Since that's a hook, we can't call it here.
    // The dynamic columns will need to be generated in the parent component and passed down,
    // or we need a different approach.

    // For now, return static columns - the parent component will need to handle
    // liquid fund column generation separately
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
