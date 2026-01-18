// Shared Investment Report Table Component
// Unified table for Equity, Real Estate, and Liquid Fund investment reports

import React, { useCallback, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Alert } from '@newwork/nw-design-system'
import { ArrowsClockwiseIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { ReportTableSkeleton } from '../../tabs/ReportTableSkeleton'
import { useInvestmentReportData } from './useInvestmentReportData'
import { InvestmentReportTableConfig } from './types'

interface InvestmentReportTableProps extends BusinessAppContextProps {
  'data-testid'?: string
  config: InvestmentReportTableConfig
  filters: Record<string, any>
  investmentType: string
  investmentTypeValue: string
  catalogData: any
  isTransposed?: boolean
  visibleColumns?: string[]
  onCurrenciesChange?: (currencies: string[]) => void
  onTotalCountChange?: (count: number, isLoading: boolean) => void
  isInitialLoad?: boolean
  dataTransformer?: (reports: any[]) => any[] // For Liquid Funds
  columnsOverride?: any[] // For Liquid Funds with custom column generation
}

// Helper: Render empty state
const renderEmptyState = (colSpan: number, investmentTypeValue: string, config: InvestmentReportTableConfig) => (
  <TableRow>
    <TableCell
      colSpan={colSpan}
      style={{
        textAlign: 'center',
        padding: 'var(--nw-spacing-12) 0',
        color: 'var(--nw-muted-foreground)'
      }}
    >
      <div className="gba:flex gba:flex-col gba:items-center" style={{ gap: 'var(--nw-spacing-2)' }}>
        <p style={{ fontSize: 'var(--nw-text-lg)', fontWeight: 'var(--nw-font-weight-medium)' }}>
          {config.emptyStateMessage.title(investmentTypeValue)}
        </p>
        <p style={{ fontSize: 'var(--nw-text-sm)' }}>{config.emptyStateMessage.description(investmentTypeValue)}</p>
      </div>
    </TableCell>
  </TableRow>
)

// Options interface for table body content helpers
interface TableBodyOptions {
  isInitialLoading: boolean
  initialLoadDone: boolean
  data: any[]
  skeletonColumnCount: number
  visibleColumnsArray: any[]
  investmentTypeValue: string
  handleRowClick: (id: string) => void
  dataTestId?: string
  config: InvestmentReportTableConfig
  accessToken?: string
}

// Helper: Get normal table body content
const getNormalTableBodyContent = (options: TableBodyOptions): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    data,
    skeletonColumnCount,
    visibleColumnsArray,
    investmentTypeValue,
    handleRowClick,
    dataTestId = '',
    config,
    accessToken
  } = options

  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (data.length === 0) {
    if (initialLoadDone) {
      // Account for actions column if present
      const colSpan =
        config.actionsRenderer && accessToken ? visibleColumnsArray.length + 1 : visibleColumnsArray.length
      return renderEmptyState(colSpan, investmentTypeValue, config)
    }
    return null
  }

  return data.map((row, index) => (
    <TableRow
      key={row.id || `row-${index}`}
      className="gba:cursor-pointer"
      style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      onClick={() => {
        const investmentId = config.getInvestmentId(row)
        if (investmentId) handleRowClick(investmentId)
      }}
      data-testid={row.id ? `${dataTestId}-row-${row.id}` : `${dataTestId}-row-${index + 1}`}
    >
      {visibleColumnsArray.map(column => (
        <TableCell
          key={column.key}
          style={{
            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
            // Add sticky positioning for actions column
            ...(column.key === 'actions' && {
              position: 'sticky',
              right: 0,
              backgroundColor: 'var(--nw-color-background)',
              zIndex: 5
            })
          }}
        >
          {column.render(row)}
        </TableCell>
      ))}
      {config.actionsRenderer && accessToken && config.getReportId && config.getReportId(row) && (
        <TableCell
          style={{
            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
            position: 'sticky',
            right: 0,
            backgroundColor: 'var(--nw-color-background)',
            zIndex: 5
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {config.actionsRenderer(row, accessToken)}
        </TableCell>
      )}
    </TableRow>
  ))
}

// Helper: Get transposed table body content
const getTransposedTableBodyContent = (options: Omit<TableBodyOptions, 'dataTestId'>): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    data,
    skeletonColumnCount,
    visibleColumnsArray,
    investmentTypeValue,
    handleRowClick,
    config
  } = options

  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (data.length === 0) {
    if (initialLoadDone) {
      return renderEmptyState(data.length + 1, investmentTypeValue, config)
    }
    return null
  }

  return visibleColumnsArray.map(column => (
    <TableRow
      key={column.key}
      style={{
        borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)'
      }}
    >
      <TableCell
        style={{
          fontWeight: 'var(--nw-font-weight-semibold)',
          padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
          backgroundColor: 'var(--nw-color-surface-secondary)'
        }}
      >
        {column.title}
      </TableCell>
      {data.map((row, index) => (
        <TableCell
          key={row.id || index}
          style={{
            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
            cursor: 'pointer'
          }}
          onClick={() => {
            const investmentId = config.getInvestmentId(row)
            if (investmentId) handleRowClick(investmentId)
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {column.render(row)}
        </TableCell>
      ))}
    </TableRow>
  ))
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
  isTransposed = false,
  visibleColumns = ['investment', 'date'],
  onCurrenciesChange,
  onTotalCountChange,
  isInitialLoad = true,
  dataTransformer,
  columnsOverride
}) => {
  // Use shared hook for data fetching
  const { data, isLoading, error, initialLoadDone, refetch } = useInvestmentReportData({
    investmentGroup: config.investmentGroup,
    filters,
    investmentType,
    accessToken,
    userInfo,
    onCurrenciesChange,
    onTotalCountChange,
    isInitialLoad,
    dataTransformer
  })

  // Generate columns using config or use override (for liquid funds)
  const columns = useMemo(() => {
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

  // Filter columns based on visibility settings
  const visibleColumnsArray = useMemo(() => {
    const visibleSet = new Set(visibleColumns)
    return columns.filter(column => visibleSet.has(column.key))
  }, [columns, visibleColumns])

  // Calculate column count for skeleton - must be before any early returns
  const skeletonColumnCount = useMemo(() => {
    if (isTransposed) {
      return 4
    }
    // Add 1 if actions column is present
    const baseCount = visibleColumnsArray.length || 4
    return config.actionsRenderer && accessToken ? baseCount + 1 : baseCount
  }, [isTransposed, visibleColumnsArray.length, config.actionsRenderer, accessToken])

  // Handle row click navigation
  const handleRowClick = useCallback(
    (investmentId: string) => {
      const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
        investmentId,
        fromView: 'reports',
        fromSubView: config.fromSubView
      })
      navigateTo(detailsUrl)
    },
    [config.fromSubView]
  )

  // Only show error during initial load
  const hasError = error

  if (hasError && isInitialLoad && !initialLoadDone) {
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
              {error && (
                <div
                  style={{
                    fontSize: 'var(--nw-text-sm)',
                    marginTop: 'var(--nw-spacing-1)',
                    color: 'var(--nw-color-text-secondary)'
                  }}
                >
                  {typeof error === 'string' ? error : error?.message || 'Unknown error'}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <ArrowsClockwiseIcon style={{ height: 'var(--nw-spacing-4)', width: 'var(--nw-spacing-4)' }} />
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // Show loading state during initial load
  const isInitialLoading = isInitialLoad && !initialLoadDone && isLoading

  // Render transposed view
  if (isTransposed) {
    return (
      <div className="gba:overflow-x-auto">
        <Table data-testid={`${dataTestId}-table`}>
          <TableHeader>
            <TableRow
              style={{
                borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)',
                backgroundColor: 'var(--nw-color-surface-secondary)'
              }}
            >
              <TableHead
                style={{
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  textAlign: 'left',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                  width: '200px',
                  color: 'var(--nw-color-text-primary)'
                }}
              >
                Field
              </TableHead>
              {data.map((row, index) => (
                <TableHead
                  key={row.id || index}
                  style={{
                    fontWeight: 'var(--nw-font-weight-semibold)',
                    textAlign: 'left',
                    padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                    color: 'var(--nw-color-text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const investmentId = config.getInvestmentId(row)
                    if (investmentId) handleRowClick(investmentId)
                  }}
                >
                  {config.getInvestmentName(row) || `Investment ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {getTransposedTableBodyContent({
              isInitialLoading,
              initialLoadDone,
              data,
              skeletonColumnCount,
              visibleColumnsArray,
              investmentTypeValue,
              handleRowClick,
              config
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Render normal view
  return (
    <div className="gba:overflow-x-auto">
      <Table data-testid={`${dataTestId}-table`}>
        <TableHeader>
          <TableRow
            style={{
              borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)',
              backgroundColor: 'var(--nw-color-surface-secondary)'
            }}
          >
            {visibleColumnsArray.map(column => (
              <TableHead
                key={column.key}
                style={{
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  textAlign: 'left',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                  width: column.width,
                  color: 'var(--nw-color-text-primary)',
                  // Add sticky positioning for actions column
                  ...(column.key === 'actions' && {
                    position: 'sticky',
                    right: 0,
                    backgroundColor: 'var(--nw-color-surface-secondary)',
                    zIndex: 10
                  })
                }}
              >
                {column.title}
              </TableHead>
            ))}
            {config.actionsRenderer && accessToken && (
              <TableHead
                style={{
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  fontFamily: 'var(--nw-font-family-base)',
                  color: 'var(--nw-color-text-primary)',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                  width: '60px',
                  position: 'sticky',
                  right: 0,
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  zIndex: 10
                }}
              >
                {/* Empty title */}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {getNormalTableBodyContent({
            isInitialLoading,
            initialLoadDone,
            data,
            skeletonColumnCount,
            visibleColumnsArray,
            investmentTypeValue,
            handleRowClick,
            dataTestId,
            config,
            accessToken
          })}
        </TableBody>
      </Table>
    </div>
  )
}
