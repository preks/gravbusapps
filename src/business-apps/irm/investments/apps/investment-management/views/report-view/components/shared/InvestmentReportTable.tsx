// Shared Investment Report Table Component
// Unified table for Equity, Real Estate, and Liquid Fund investment reports
// Uses DataTable component for consistent pagination with Investment tab

import React, { useCallback, useMemo } from 'react'
import { DataTable, Alert, Button } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useInvestmentReportData } from './useInvestmentReportData'
import { InvestmentReportTableConfig } from './types'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'

interface InvestmentReportTableProps extends BusinessAppContextProps {
  'data-testid'?: string
  config: InvestmentReportTableConfig
  filters: Record<string, any>
  investmentType: string
  investmentTypeValue: string
  catalogData: any
  visibleColumns?: string[]
  onCurrenciesChange?: (currencies: string[]) => void
  enabled?: boolean
  dataTransformer?: (reports: any[]) => any[] // For Liquid Funds
  columnsOverride?: any[] // For Liquid Funds with custom column generation
  // Sorting props
  sortField?: string
  sortOrder?: 'ASC' | 'DESC'
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void
}

export const InvestmentReportTable: React.FC<InvestmentReportTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'investment-report-table',
  config,
  filters,
  investmentType,
  investmentTypeValue,
  catalogData,
  visibleColumns = ['investment', 'date'],
  onCurrenciesChange,
  enabled = true,
  dataTransformer,
  columnsOverride,
  sortField,
  sortOrder,
  onSortingChange
}) => {
  // Use shared hook for data fetching
  const { data, isLoading, error, initialLoadDone, refetch, page, pageSize, totalCount, setPage, setPageSize } =
    useInvestmentReportData({
      investmentGroup: config.investmentGroup,
      filters,
      investmentType,
      accessToken,
      userInfo,
      onCurrenciesChange,
      enabled,
      dataTransformer,
      sortField,
      sortOrder
    })

  // Generate columns using config or use override (for liquid funds)
  const generatedColumns = useMemo(() => {
    if (columnsOverride) {
      return columnsOverride
    }
    return config.columnGenerator({
      investmentType,
      catalogData,
      accessToken,
      reports: data
    })
  }, [columnsOverride, config, investmentType, catalogData, accessToken, data])

  // Helper to check if a column is sortable
  const isColumnSortable = useCallback((columnKey: string): boolean => {
    // Fields in additionalProperties are JSONB and NOT sortable
    if (columnKey.includes('additionalProperties')) {
      return false
    }

    // Check if the column has a sortPath in the descriptors (direct match)
    const descriptor = INVESTMENT_REPORT_DESCRIPTORS.find(d => d.key === columnKey)

    // Column is sortable only if it has an explicit sortPath defined
    if (descriptor?.sortPath) {
      return true
    }

    // For dynamic catalog fields (with underscores from dot notation)
    // Convert underscore back to dot notation and check if any descriptor's sortPath matches
    if (columnKey.includes('_')) {
      const dotNotation = columnKey.split('_').join('.')

      // Double-check: if it contains additionalProperties in dot notation, not sortable
      if (dotNotation.includes('additionalProperties')) {
        return false
      }

      // SPECIAL MAPPING: Catalog uses investment.* prefix for InvestmentReport root fields
      // Remove the investment. prefix to get the actual field name
      // Example: investment.totalInvestmentAmount -> totalInvestmentAmount
      let mappedNotation = dotNotation
      if (dotNotation.startsWith('investment.')) {
        // Remove investment. prefix - these are InvestmentReport root fields
        mappedNotation = dotNotation.replace('investment.', '')
      } else {
        // CRITICAL MAPPING: Catalog uses *Investment paths, but GraphQL uses *InvestmentReport paths
        mappedNotation = dotNotation
          .replace('equityInvestment.', 'equityInvestmentReport.')
          .replace('liquidFundInvestment.', 'liquidFundInvestmentReport.')
          .replace('realEstateInvestment.', 'realEstateInvestmentReport.')
      }

      const dynamicDescriptor = INVESTMENT_REPORT_DESCRIPTORS.find(
        d => d.sortPath === mappedNotation || d.path === mappedNotation || d.key === mappedNotation
      )
      if (dynamicDescriptor?.sortPath) {
        return true
      }
    }

    return false
  }, [])

  // Convert to DataTable column format
  const columns = useMemo<ColumnDef<any>[]>(() => {
    const visibleSet = new Set(visibleColumns)
    const visibleGeneratedColumns = generatedColumns.filter(column => visibleSet.has(column.key))

    return visibleGeneratedColumns.map(column => {
      // Parse width string (e.g., '200px' -> 200)
      let size: number | undefined
      let minSize: number | undefined
      let maxSize: number | undefined

      if (column.width) {
        const parsedWidth = Number.parseInt(column.width, 10)
        if (!Number.isNaN(parsedWidth)) {
          size = parsedWidth
          // Set reasonable min/max constraints
          minSize = Math.max(80, Math.floor(parsedWidth * 0.7))
          maxSize = Math.ceil(parsedWidth * 1.5)
        }
      }

      return {
        id: column.key,
        header: column.title,
        accessorFn: (row: any) => row, // Return full row for custom rendering
        cell: ({ row }: any) => column.render(row.original),
        size,
        minSize,
        maxSize,
        enableSorting: isColumnSortable(column.key) // Only enable sorting if column is sortable
      }
    })
  }, [generatedColumns, visibleColumns, isColumnSortable])

  // Handle row click navigation
  const handleRowClick = useCallback(
    (row: any) => {
      const investmentId = config.getInvestmentId(row)
      if (investmentId) {
        const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
          investmentId,
          fromView: 'reports',
          fromSubView: config.fromSubView
        })
        navigateTo(detailsUrl)
      }
    },
    [config]
  )

  // Handle pagination changes
  const handlePaginationChange = useCallback(
    (pagination: { pageIndex: number; pageSize: number }) => {
      // Handle page size changes - reset to first page when page size changes
      if (pagination.pageSize === pageSize) {
        setPage(pagination.pageIndex + 1) // DataTable uses 0-based pageIndex, we use 1-based page
      } else {
        setPageSize(pagination.pageSize)
        setPage(1) // Reset to first page when page size changes
      }
    },
    [setPage, setPageSize, pageSize]
  )

  // Pagination state for DataTable (0-based pageIndex)
  const pagination = useMemo(
    () => ({
      pageIndex: page - 1, // Convert 1-based page to 0-based pageIndex
      pageSize
    }),
    [page, pageSize]
  )

  // Sorting state for DataTable
  const sorting = useMemo(() => {
    if (!sortField) return []
    return [{ id: sortField, desc: sortOrder === 'DESC' }]
  }, [sortField, sortOrder])

  // Row actions renderer
  const rowActions = useMemo(() => {
    if (!config.actionsRenderer || !accessToken) return undefined
    return (row: { original: any }) => config.actionsRenderer!(row.original, accessToken)
  }, [config, accessToken])

  // Error state during initial load
  if (error && !initialLoadDone) {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error'
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center"
        style={{ height: 'var(--nw-spacing-64)' }}
        data-testid={`${dataTestId}-error`}
      >
        <Alert variant="destructive">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <div style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>Error Loading Analytics Data</div>
              <div
                style={{
                  fontSize: 'var(--nw-text-sm)',
                  marginTop: 'var(--nw-spacing-1)',
                  color: 'var(--nw-color-text-secondary)'
                }}
              >
                {errorMessage}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <ArrowsClockwiseIcon style={{ height: 'var(--nw-spacing-4)', width: 'var(--nw-spacing-4)' }} />
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <DataTable
      data={data}
      columns={columns}
      loading={isLoading}
      error={error ? (typeof error === 'string' ? error : error.message || 'Unknown error') : undefined}
      totalCount={totalCount}
      pagination={pagination}
      onPaginationChange={handlePaginationChange}
      enablePagination
      enableSorting
      sorting={sorting}
      onSortingChange={onSortingChange}
      enableSelection={false}
      enableColumnPinning
      enableResizing={false}
      tableLayout="fixed"
      rowsPerPageOptions={[10, 20, 50, 100]}
      showPageNumbers
      maxVisiblePages={7}
      emptyMessage={config.emptyStateMessage.description(investmentTypeValue)}
      onRowClick={handleRowClick}
      actions={rowActions}
      data-testid={dataTestId}
    />
  )
}
