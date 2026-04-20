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
  getTextValue?: (record: any) => string
}

/**
 * Configuration interface for customizing the shared investment report table component
 * Accepts any investment group code (e.g., 'EQUITY', 'REAL_ESTATE', 'LIQUID_FUND', 'PRIVATE_EQUITY', etc.)
 */
export interface InvestmentReportTableConfig {
  // Investment group identifier (any string - dynamically determined from catalog)
  investmentGroup: string

  // Display configuration
  icon?: React.ComponentType<any> // ChartPieIcon, BuildingsIcon, or undefined

  emptyStateMessage: {
    title: (investmentTypeValue: string) => string
    description: (investmentTypeValue: string) => string
  }

  // Navigation (any string identifier for the sub-view)
  fromSubView: string

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
