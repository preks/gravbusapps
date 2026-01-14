// Liquid Fund Column Adapter
// Converts DynamicTableColumn to ColumnConfig format for the shared table component

import React from 'react'
import { DynamicTableColumn } from './liquidFundReportColumnTransformer'
import { ColumnConfig } from '../../../components/shared/types'

/**
 * Helper to get text alignment from column className
 */
const getTextAlignment = (className?: string): React.CSSProperties['textAlign'] => {
  if (className?.includes('text-center')) return 'center'
  if (className?.includes('text-right')) return 'right'
  return 'left'
}

/**
 * Converts DynamicTableColumn array to ColumnConfig array
 * This allows liquid fund dynamic columns to work with the shared InvestmentReportTable
 */
export const convertDynamicColumnsToConfig = (dynamicColumns: DynamicTableColumn[]): ColumnConfig[] => {
  return dynamicColumns.map(column => ({
    key: column.id,
    title: column.label,
    render: (record: any) => (
      <span style={{ textAlign: getTextAlignment(column.className) }}>{column.getValue(record)}</span>
    )
  }))
}

/**
 * Creates static columns for liquid fund tables (investment and date)
 */
export const createLiquidFundStaticColumns = (): ColumnConfig[] => {
  return [
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
}
