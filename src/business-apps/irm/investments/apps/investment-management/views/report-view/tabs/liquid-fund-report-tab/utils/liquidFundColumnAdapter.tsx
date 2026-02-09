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
    width: column.width,
    render: (record: any) => {
      const value = column.getValue(record)
      const alignment = getTextAlignment(column.className)
      const justifyContent = alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start'

      return (
        <div className="gba:flex gba:items-center gba:h-8" style={{ justifyContent }}>
          <span className="gba:truncate gba:block" title={String(value)}>
            {value}
          </span>
        </div>
      )
    }
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
      width: '200px',
      render: (record: any) => {
        const name = record.investmentName || 'N/A'
        return (
          <div className="gba:flex gba:items-center gba:h-8">
            <span className="gba:truncate gba:block gba:font-medium" title={name}>
              {name}
            </span>
          </div>
        )
      }
    },
    {
      key: 'date',
      title: 'Date',
      width: '120px',
      render: (record: any) => {
        if (!record.reportDate) return <div className="gba:flex gba:items-center gba:justify-center gba:h-8">-</div>
        try {
          const formattedDate = new Date(record.reportDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })
          return (
            <div className="gba:flex gba:items-center gba:justify-center gba:h-8">
              <span className="gba:truncate gba:block" title={formattedDate}>
                {formattedDate}
              </span>
            </div>
          )
        } catch {
          return <div className="gba:flex gba:items-center gba:justify-center gba:h-8">-</div>
        }
      }
    }
  ]
}
