// Shared types for Investment Report Tables
import React from 'react'
import type { ReportSectionKind } from '../../utils/subSectionHelpers'

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
 */
export interface InvestmentReportTableConfig {
  emptyStateMessage: {
    title: (investmentTypeValue: string) => string
    description: (investmentTypeValue: string) => string
  }

  // Column generation
  columnGenerator: (params: {
    investmentGroup: string
    investmentType: string
    sectionKind?: ReportSectionKind
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
