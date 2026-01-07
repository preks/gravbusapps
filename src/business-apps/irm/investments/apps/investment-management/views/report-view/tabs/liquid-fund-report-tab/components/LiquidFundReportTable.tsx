import React, { useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Alert } from '@newwork/nw-design-system'
import { RefreshCw } from 'lucide-react'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useLiquidFundReports } from '../hooks/useLiquidFundReports'
import { useInvestmentLiquidFundReportCatalog } from '../hooks/useInvestmentLiquidFundReportCatalog'
import { AnalyticsFilters } from '../types'
import { DynamicTableColumn } from '../utils/liquidFundReportColumnTransformer'
import { ReportTableSkeleton } from '../../ReportTableSkeleton'

interface AnalyticsTableProps {
  accessToken: string
  userInfo?: any
  'data-testid'?: string
  filters: AnalyticsFilters
  investmentType: string
  isTransposed?: boolean
  visibleColumns?: string[]
  onTotalCountChange?: (count: number, isLoading: boolean) => void
  isInitialLoad?: boolean
}

// Helper function to get text alignment from column className
const getTextAlignment = (className?: string): 'center' | 'right' | 'left' => {
  if (className?.includes('text-center')) return 'center'
  if (className?.includes('text-right')) return 'right'
  return 'left'
}

// Helper: Format date to match other investment report tables
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid Date'
  }
}

// Helper: Render empty state
const renderEmptyState = (colSpan: number, investmentType: string) => (
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
          No {investmentType} Data Found
        </p>
        <p style={{ fontSize: 'var(--nw-text-sm)' }}>
          No liquid fund portfolios are available for {investmentType.toLowerCase()} in the selected time period.
        </p>
      </div>
    </TableCell>
  </TableRow>
)

// Helper: Calculate colSpan for normal view
const getNormalViewColSpan = (
  visibleColumns: string[],
  shouldShowDynamicColumns: boolean,
  visibleDynamicColumnsLength: number
): number => {
  let count = 0
  if (visibleColumns.includes('investment')) count++
  if (visibleColumns.includes('date')) count++
  if (shouldShowDynamicColumns) count += visibleDynamicColumnsLength
  return count
}

// Options interface for table body content helpers
interface NormalTableBodyOptions {
  isInitialLoading: boolean
  initialLoadDone: boolean
  analyticsData: any[] | undefined
  skeletonColumnCount: number
  visibleColumns: string[]
  shouldShowDynamicColumns: boolean
  visibleDynamicColumns: DynamicTableColumn[]
  investmentType: string
  handleRowClick: (id: string) => void
  dataTestId: string
  accessToken?: string
}

// Helper: Get normal table body content
const getNormalTableBodyContent = (options: NormalTableBodyOptions): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    analyticsData,
    skeletonColumnCount,
    visibleColumns,
    shouldShowDynamicColumns,
    visibleDynamicColumns,
    investmentType,
    handleRowClick,
    dataTestId,
    accessToken
  } = options
  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (!analyticsData || analyticsData.length === 0) {
    if (initialLoadDone) {
      const colSpan = getNormalViewColSpan(visibleColumns, shouldShowDynamicColumns, visibleDynamicColumns.length)
      return renderEmptyState(colSpan, investmentType)
    }
    return null
  }

  return analyticsData.map((row, index) => (
    <TableRow
      key={row.id}
      className="gba:cursor-pointer"
      style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      onClick={() => row.investmentId && handleRowClick(row.investmentId)}
      data-testid={`${dataTestId}-row-${index + 1}`}
    >
      {visibleColumns.includes('investment') && (
        <TableCell style={{ padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}>
          <span style={{ fontWeight: 'var(--nw-font-weight-medium)' }}>{row.investmentName}</span>
        </TableCell>
      )}
      {visibleColumns.includes('date') && (
        <TableCell style={{ textAlign: 'center', padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}>
          {row.reportDate ? formatDate(row.reportDate) : '-'}
        </TableCell>
      )}
      {shouldShowDynamicColumns &&
        visibleDynamicColumns.map(column => (
          <TableCell
            key={column.id}
            style={{
              textAlign: getTextAlignment(column.className),
              padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
            }}
          >
            {column.getValue(row)}
          </TableCell>
        ))}
      {accessToken && row.reportId && (
        <TableCell
          style={{
            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
            // Add sticky positioning for actions column
            position: 'sticky',
            right: 0,
            backgroundColor: 'var(--nw-color-background)',
            zIndex: 5
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
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
        </TableCell>
      )}
    </TableRow>
  ))
}

// Options interface for transposed table body content
interface TransposedTableBodyOptions {
  isInitialLoading: boolean
  initialLoadDone: boolean
  analyticsData: any[] | undefined
  skeletonColumnCount: number
  visibleColumns: string[]
  shouldShowDynamicColumns: boolean
  visibleDynamicColumns: DynamicTableColumn[]
  investmentType: string
  handleRowClick: (id: string) => void
}

// Helper: Get transposed table body content
const getTransposedTableBodyContent = (options: TransposedTableBodyOptions): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    analyticsData,
    skeletonColumnCount,
    visibleColumns,
    shouldShowDynamicColumns,
    visibleDynamicColumns,
    investmentType,
    handleRowClick
  } = options
  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (!analyticsData || analyticsData.length === 0) {
    if (initialLoadDone) {
      return renderEmptyState(1 + (analyticsData?.length || 0), investmentType)
    }
    return null
  }

  return (
    <>
      {/* Date row */}
      {visibleColumns.includes('date') && (
        <TableRow style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}>
          <TableCell
            style={{
              fontWeight: 'var(--nw-font-weight-semibold)',
              padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
              backgroundColor: 'var(--nw-color-surface-secondary)'
            }}
          >
            Date
          </TableCell>
          {analyticsData.map((row, index) => (
            <TableCell
              key={row.id || index}
              style={{
                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                cursor: 'pointer',
                textAlign: 'center'
              }}
              onClick={() => row.investmentId && handleRowClick(row.investmentId)}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {row.reportDate ? formatDate(row.reportDate) : '-'}
            </TableCell>
          ))}
        </TableRow>
      )}
      {/* Dynamic columns as rows */}
      {shouldShowDynamicColumns &&
        visibleDynamicColumns.map(column => (
          <TableRow
            key={column.id}
            style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
          >
            <TableCell
              style={{
                fontWeight: 'var(--nw-font-weight-semibold)',
                padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                backgroundColor: 'var(--nw-color-surface-secondary)'
              }}
            >
              {column.label}
            </TableCell>
            {analyticsData.map((row, index) => (
              <TableCell
                key={row.id || index}
                style={{
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                  cursor: 'pointer',
                  textAlign: getTextAlignment(column.className)
                }}
                onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                {column.getValue(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
    </>
  )
}

export const AnalyticsTable: React.FC<AnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'analytics-table',
  filters,
  investmentType,
  isTransposed = false,
  visibleColumns = ['investment', 'date'],
  onTotalCountChange,
  isInitialLoad = true
}) => {
  const initialLoadDone = React.useRef(false)

  // Use the dedicated liquid fund reports hook
  const { analyticsData, isLoading, error, totalCount, refetch } = useLiquidFundReports(
    { accessToken, userInfo },
    {
      startDate: filters.startDate,
      endDate: filters.endDate,
      currencyIds: filters.currencyIds,
      investmentType: filters.investmentType,
      search: filters.search,
      onCurrenciesChange: filters.onCurrenciesChange
    }
  )

  // Track initial load completion
  React.useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [isLoading])

  // Report total count to parent (only report loading state during initial load)
  React.useEffect(() => {
    if (onTotalCountChange) {
      const shouldReportLoading = isInitialLoad && !initialLoadDone.current && isLoading
      onTotalCountChange(totalCount || 0, shouldReportLoading)
    }
  }, [totalCount, isLoading, isInitialLoad])

  // Use catalog integration for dynamic columns
  const {
    catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    getDynamicColumnsForType
  } = useInvestmentLiquidFundReportCatalog({ accessToken, userInfo })

  // Determine dynamic columns based on the data and investment type filter
  const dynamicColumns: DynamicTableColumn[] = useMemo(() => {
    if (!catalogData) return []

    // Strategy 1: Try to detect from data if we have it
    if (analyticsData && analyticsData.length > 0) {
      const liquidFundTypeCodes = Array.from(
        new Set(
          (analyticsData || [])
            .map(row => {
              return (
                row.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code ||
                row.liquidFundReport?.investmentLiquidFundType?.code ||
                row.investment?.liquidFundInvestment?.[0]?.investmentLiquidFundType?.code ||
                row.liquidFundInvestment?.[0]?.investmentLiquidFundTypeRef?.split(':')?.pop() ||
                row.liquidFundReport?.investmentLiquidFundTypeRef?.split(':')?.pop()
              )
            })
            .filter(Boolean)
        )
      )

      if (liquidFundTypeCodes.length > 0) {
        const primaryTypeCode = liquidFundTypeCodes[0]
        const columns = getDynamicColumnsForType(primaryTypeCode)
        if (columns.length > 0) {
          return columns
        }
      }
    }

    // Strategy 2: Use tab-based mapping when no data (empty tabs)
    const tabToTypeMapping: Record<string, string> = {
      'Bank Deposit': 'BANK_DEPOSITE',
      'Bank Deposits': 'BANK_DEPOSITE',
      'Fixed-Term Deposit': 'FIXED_TERM_DEPOSIT',
      'Fixed-Term Deposits': 'FIXED_TERM_DEPOSIT',
      'Money Market Funds': 'MONEY_MARKET_FUNDS',
      'Pension Fund': 'PENSION_FUNDS',
      Equity: 'EQUITY',
      Bond: 'BONDS',
      'Multiple Investment Types': 'MONEY_MARKET_FUNDS'
    }

    const mappedType =
      tabToTypeMapping[filters.investmentType || ''] ||
      Object.values(tabToTypeMapping).find(type =>
        (filters.investmentType || '').toLowerCase().includes(type.toLowerCase().replace('_', '-'))
      )

    if (mappedType) {
      const columns = getDynamicColumnsForType(mappedType)
      if (columns.length > 0) {
        return columns
      }
    }

    // Strategy 3: Fallback to first available type
    if (catalogData.investmentLiquidFundTypes?.length > 0) {
      const firstAvailableType = catalogData.investmentLiquidFundTypes[0]
      const columns = getDynamicColumnsForType(firstAvailableType.code)
      if (columns.length > 0) {
        return columns
      }
    }

    return []
  }, [catalogData, analyticsData, getDynamicColumnsForType, investmentType, filters.investmentType])

  // Determine if we should show dynamic columns
  const shouldShowDynamicColumns = dynamicColumns.length > 0 && !catalogLoading

  // Filter dynamic columns based on visibility settings
  const visibleDynamicColumns = useMemo(() => {
    if (!shouldShowDynamicColumns) return []
    const visibleSet = new Set(visibleColumns)
    return dynamicColumns.filter(column => visibleSet.has(column.id))
  }, [dynamicColumns, shouldShowDynamicColumns, visibleColumns])

  // Calculate column count for skeleton - must be before any early returns
  const skeletonColumnCount = useMemo(() => {
    if (isTransposed) {
      return 4
    }
    let count = 0
    if (visibleColumns.includes('investment')) count++
    if (visibleColumns.includes('date')) count++
    if (shouldShowDynamicColumns) count += visibleDynamicColumns.length
    return count || 4
  }, [isTransposed, visibleColumns, shouldShowDynamicColumns, visibleDynamicColumns.length])

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId,
      fromView: 'reports',
      fromSubView: 'liquid-fund'
    })
    navigateTo(detailsUrl)
  }, [])

  // Only show error during initial load
  const hasError = error || catalogError

  if (hasError && isInitialLoad && !initialLoadDone.current) {
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
              {(error || catalogError) && (
                <div
                  style={{
                    fontSize: 'var(--nw-text-sm)',
                    marginTop: 'var(--nw-spacing-1)',
                    color: 'var(--nw-color-text-secondary)'
                  }}
                >
                  {typeof error === 'string' ? error : error?.message || 'Unknown error'}
                  {catalogError && ` | ${catalogError}`}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw style={{ height: 'var(--nw-spacing-4)', width: 'var(--nw-spacing-4)' }} />
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // Show loading state during initial load
  const isInitialLoading = isInitialLoad && !initialLoadDone.current && (isLoading || catalogLoading)

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
              {analyticsData?.map((row, index) => (
                <TableHead
                  key={row.id || index}
                  style={{
                    fontWeight: 'var(--nw-font-weight-semibold)',
                    textAlign: 'left',
                    padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                    color: 'var(--nw-color-text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => row.investmentId && handleRowClick(row.investmentId)}
                >
                  {row.investmentName || `Investment ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {getTransposedTableBodyContent({
              isInitialLoading,
              initialLoadDone: initialLoadDone.current,
              analyticsData,
              skeletonColumnCount,
              visibleColumns,
              shouldShowDynamicColumns,
              visibleDynamicColumns,
              investmentType,
              handleRowClick
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
            {visibleColumns.includes('investment') && (
              <TableHead
                style={{
                  textAlign: 'left',
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  fontFamily: 'var(--nw-font-family-base)',
                  color: 'var(--nw-color-text-primary)',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
                }}
              >
                Investment
              </TableHead>
            )}
            {visibleColumns.includes('date') && (
              <TableHead
                style={{
                  textAlign: 'center',
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  fontFamily: 'var(--nw-font-family-base)',
                  color: 'var(--nw-color-text-primary)',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
                }}
              >
                Date
              </TableHead>
            )}
            {shouldShowDynamicColumns &&
              visibleDynamicColumns.map(column => (
                <TableHead
                  key={column.id}
                  style={{
                    textAlign: getTextAlignment(column.className),
                    fontWeight: 'var(--nw-font-weight-semibold)',
                    fontFamily: 'var(--nw-font-family-base)',
                    color: 'var(--nw-color-text-primary)',
                    padding: 'var(--nw-spacing-3) var(--nw-spacing-4)'
                  }}
                >
                  {column.label}
                </TableHead>
              ))}
            {accessToken && (
              <TableHead
                style={{
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  fontFamily: 'var(--nw-font-family-base)',
                  color: 'var(--nw-color-text-primary)',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                  width: '60px',
                  // Add sticky positioning for actions column
                  position: 'sticky',
                  right: 0,
                  backgroundColor: 'var(--nw-color-surface-secondary)',
                  zIndex: 10
                }}
              >
                {/* Empty title as requested */}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {getNormalTableBodyContent({
            isInitialLoading,
            initialLoadDone: initialLoadDone.current,
            analyticsData,
            skeletonColumnCount,
            visibleColumns,
            shouldShowDynamicColumns,
            visibleDynamicColumns,
            investmentType,
            handleRowClick,
            dataTestId,
            accessToken
          })}
        </TableBody>
      </Table>
    </div>
  )
}
