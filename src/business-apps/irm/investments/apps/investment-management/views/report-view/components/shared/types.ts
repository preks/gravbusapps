// Shared types for Investment Report Tables
import React from 'react'

/**
 * Column configuration for investment report tables
 */
export interface ColumnConfig {
  key: string
  title: string
  width?: string
  render: (record: any) => React.ReactNode
}

/**
 * Configuration interface for customizing the shared investment report table component
 */
export interface InvestmentReportTableConfig {
  // Investment group identifier
  investmentGroup: 'EQUITY' | 'REAL_ESTATE' | 'LIQUID_FUND'

  // Display configuration
  icon?: React.ComponentType<any> // ChartPieIcon, BuildingsIcon, or undefined

  emptyStateMessage: {
    title: (investmentTypeValue: string) => string
    description: (investmentTypeValue: string) => string
  }

  // Navigation
  fromSubView: 'equity' | 'real-estate' | 'liquid-fund'

  // Column generation
  columnGenerator: (params: {
    investmentType: string
    catalogData: any
    accessToken?: string
    reports?: any[]
  }) => ColumnConfig[]

  // Optional: Actions column renderer
  actionsRenderer?: (row: any, accessToken: string) => React.ReactNode

  // Data access patterns
  getInvestmentId: (row: any) => string
  getInvestmentName: (row: any) => string
  getReportId?: (row: any) => string | undefined
}
