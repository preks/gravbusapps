/**
 * Utility to convert Liquid Fund dynamic columns to table column config format
 * Transforms DynamicTableColumn[] to ColumnConfig[] for InvestmentReportTable
 */

import React from 'react'
import type { DynamicTableColumn } from './liquidFundReportColumnTransformer'
import type { ColumnConfig } from '../components/shared/types'

/**
 * Converts dynamic columns (from catalog) to ColumnConfig format for rendering
 *
 * @param dynamicColumns - Dynamic columns from useInvestmentLiquidFundReportCatalog
 * @returns Array of ColumnConfig with render functions
 */
export const convertDynamicColumnsToConfig = (dynamicColumns: DynamicTableColumn[]): ColumnConfig[] => {
  return dynamicColumns.map(col => ({
    key: col.id,
    title: col.label,
    width: col.width,
    render: (record: any) => {
      const value = col.getValue(record)
      return (
        <span
          className={col.className}
          style={{ textAlign: col.type === 'AMOUNT' || col.type === 'NUMBER' ? 'right' : 'left' }}
        >
          {value}
        </span>
      )
    }
  }))
}

/**
 * Creates static columns for Liquid Fund reports (Investment + Date)
 * These are always present regardless of catalog configuration
 *
 * @returns Array of static ColumnConfig
 */
export const createLiquidFundStaticColumns = (): ColumnConfig[] => {
  return [
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
}
