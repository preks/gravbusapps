import React, { useCallback, useMemo, useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Button, Alert } from '@newwork/nw-design-system'
import { Building2, RefreshCw } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { RealEstateReportFilters } from '../types'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { createInvestmentReportColumns } from '@/business-apps/irm/investments/records/investment-record/components/shared/columnDefinitions'
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports'
import { type InvestmentReportQueryVariables } from '@/common/data/investment-report/queries/investmentReportQueries'
import { ReportTableSkeleton } from '../../ReportTableSkeleton'

interface RealEstateAnalyticsTableProps extends BusinessAppContextProps {
  'data-testid'?: string
  filters: RealEstateReportFilters
  investmentType: string
  investmentTypeValue: string // User-friendly name for display
  catalogData: any // Required for dynamic columns
  isTransposed?: boolean // Toggle for transposed table view
  visibleColumns?: string[] // Column visibility control
  onCurrenciesChange?: (currencies: string[]) => void // Callback to report available currencies
  onTotalCountChange?: (count: number, isLoading: boolean) => void // Callback to report total count
  isInitialLoad?: boolean // Whether this is the initial load
}

// Helper: Render empty state
const renderEmptyState = (colSpan: number, investmentTypeValue: string) => (
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
          No {investmentTypeValue} Data Found
        </p>
        <p style={{ fontSize: 'var(--nw-text-sm)' }}>
          No real estate investment reports are available for {investmentTypeValue.toLowerCase()} in the selected time
          period.
        </p>
      </div>
    </TableCell>
  </TableRow>
)

// Options interface for table body content helpers
interface TableBodyOptions {
  isInitialLoading: boolean
  initialLoadDone: boolean
  reports: any[]
  skeletonColumnCount: number
  visibleColumnsArray: any[]
  investmentTypeValue: string
  handleRowClick: (id: string) => void
  dataTestId?: string
}

// Helper: Get normal table body content
const getNormalTableBodyContent = (options: TableBodyOptions): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    reports,
    skeletonColumnCount,
    visibleColumnsArray,
    investmentTypeValue,
    handleRowClick,
    dataTestId = ''
  } = options
  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (reports.length === 0) {
    if (initialLoadDone) {
      return renderEmptyState(visibleColumnsArray.length, investmentTypeValue)
    }
    return null
  }

  return reports.map(report => (
    <TableRow
      key={report.id}
      className="gba:cursor-pointer"
      style={{ borderBottom: 'var(--nw-border-width-thin) solid var(--nw-color-border-default)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
      onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
      data-testid={`${dataTestId}-row-${report.id}`}
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
          {column.render(report)}
        </TableCell>
      ))}
    </TableRow>
  ))
}

// Helper: Get transposed table body content
const getTransposedTableBodyContent = (options: Omit<TableBodyOptions, 'dataTestId'>): React.ReactNode => {
  const {
    isInitialLoading,
    initialLoadDone,
    reports,
    skeletonColumnCount,
    visibleColumnsArray,
    investmentTypeValue,
    handleRowClick
  } = options
  if (isInitialLoading) {
    return <ReportTableSkeleton rowCount={10} columnCount={skeletonColumnCount} />
  }

  if (reports.length === 0) {
    if (initialLoadDone) {
      return renderEmptyState(reports.length + 1, investmentTypeValue)
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
      {reports.map((report, index) => (
        <TableCell
          key={report.id || index}
          style={{
            padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
            cursor: 'pointer'
          }}
          onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--nw-color-surface-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {column.render(report)}
        </TableCell>
      ))}
    </TableRow>
  ))
}

export const RealEstateAnalyticsTable: React.FC<RealEstateAnalyticsTableProps> = ({
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'real-estate-analytics-table',
  filters,
  investmentType,
  investmentTypeValue,
  catalogData,
  isTransposed = false,
  visibleColumns = ['investment', 'date'],
  onCurrenciesChange,
  onTotalCountChange,
  isInitialLoad = true
}) => {
  // State management
  const [reports, setReports] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initialLoadDone = React.useRef(false)

  // Track initial load completion
  React.useEffect(() => {
    if (!isLoading && !initialLoadDone.current) {
      initialLoadDone.current = true
    }
  }, [isLoading])

  // Report loading state to parent (only report loading state during initial load)
  React.useEffect(() => {
    if (onTotalCountChange) {
      const shouldReportLoading = isInitialLoad && !initialLoadDone.current && isLoading
      onTotalCountChange(totalCount || 0, shouldReportLoading)
    }
  }, [totalCount, isLoading, isInitialLoad])

  // Use common data layer
  const { fetchInvestmentReports } = useGetInvestmentReports({ accessToken, userInfo })

  // Fetch data function
  const loadReports = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const variables: InvestmentReportQueryVariables = {
        investmentGroupIds: ['InvestmentGroup:v1:REAL_ESTATE'],
        limit: 1000,
        offset: 0,
        orderBy: [{ field: 'date', direction: 'DESC' }]
      }

      if (filters.startDate) {
        variables.reportDateFrom = filters.startDate
      }
      if (filters.endDate) {
        variables.reportDateTo = filters.endDate
      }
      if (filters.currencyIds && filters.currencyIds.length > 0) {
        variables.currencyIds = filters.currencyIds
      }
      if (filters.search?.trim()) {
        variables.search = filters.search.trim()
      }
      if (investmentType && investmentType !== 'all') {
        variables.investmentTypeIds = [`InvestmentType:v1:${investmentType}`]
      }

      const { reports: fetchedReports, total } = await fetchInvestmentReports(variables)

      // Get latest report per investment
      const latestReportsByInvestment = new Map<string, any>()
      fetchedReports.forEach((report: any) => {
        const investmentId = report.investment?.id
        if (!investmentId) return

        const existingReport = latestReportsByInvestment.get(investmentId)
        if (!existingReport || new Date(report.date) > new Date(existingReport.date)) {
          latestReportsByInvestment.set(investmentId, report)
        }
      })

      const latestReports = Array.from(latestReportsByInvestment.values())
      setReports(latestReports)

      // Extract unique currency IDs from reports and notify parent
      if (onCurrenciesChange) {
        const currencyIds = Array.from(
          new Set(
            latestReports
              .map(
                report =>
                  report.currencyRef || // InvestmentReport.currencyRef (primary)
                  report.investment?.currencyRef // Investment.currencyRef (fallback)
              )
              .filter(Boolean)
          )
        )
        onCurrenciesChange(currencyIds)
      }

      // Derive totalCount from actual visible data
      const finalCount = latestReports.length || total
      setTotalCount(finalCount)

      // Report total count to parent
      if (onTotalCountChange) {
        onTotalCountChange(finalCount, false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load reports'))
      console.error('Error loading real estate reports:', err)
      if (onTotalCountChange) {
        onTotalCountChange(0, false)
      }
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    userInfo,
    filters.startDate,
    filters.endDate,
    filters.currencyIds,
    filters.search,
    investmentType,
    fetchInvestmentReports
  ])

  // Load data on mount and when filters change
  useEffect(() => {
    loadReports()
  }, [loadReports])

  const refetch = loadReports

  // Create dynamic columns
  const columns = useMemo(() => {
    const staticColumns = [
      {
        key: 'investment',
        title: 'Investment',
        width: '200px',
        render: (record: any) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--nw-spacing-2)' }}>
            <Building2
              style={{
                width: 'var(--nw-spacing-4)',
                height: 'var(--nw-spacing-4)',
                color: 'var(--nw-muted-foreground)'
              }}
            />
            <span className="gba:font-medium">{record.investment?.name || 'N/A'}</span>
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
      undefined,
      mockInvestmentForContext
    )

    return [...staticColumns, ...dynamicColumns]
  }, [investmentType, catalogData, accessToken])

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
    return visibleColumnsArray.length || 4
  }, [isTransposed, visibleColumnsArray.length])

  // Handle row click navigation
  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', {
      investmentId,
      fromView: 'reports',
      fromSubView: 'real-estate'
    })
    navigateTo(detailsUrl)
  }, [])

  // Only show error during initial load
  const hasError = error

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
              <RefreshCw style={{ height: 'var(--nw-spacing-4)', width: 'var(--nw-spacing-4)' }} />
            </Button>
          </div>
        </Alert>
      </div>
    )
  }

  // Show loading state during initial load
  const isInitialLoading = isInitialLoad && !initialLoadDone.current && isLoading

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
              {reports.map((report, index) => (
                <TableHead
                  key={report.id || index}
                  style={{
                    fontWeight: 'var(--nw-font-weight-semibold)',
                    textAlign: 'left',
                    padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
                    color: 'var(--nw-color-text-primary)',
                    cursor: 'pointer'
                  }}
                  onClick={() => report.investment?.id && handleRowClick(report.investment.id)}
                >
                  {report.investment?.name || `Investment ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {getTransposedTableBodyContent({
              isInitialLoading,
              initialLoadDone: initialLoadDone.current,
              reports,
              skeletonColumnCount,
              visibleColumnsArray,
              investmentTypeValue,
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
            {visibleColumnsArray.map(column => (
              <TableHead
                key={column.key}
                style={{
                  textAlign: 'left',
                  width: column.width,
                  fontWeight: 'var(--nw-font-weight-semibold)',
                  fontFamily: 'var(--nw-font-family-base)',
                  color: 'var(--nw-color-text-primary)',
                  padding: 'var(--nw-spacing-3) var(--nw-spacing-4)',
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {getNormalTableBodyContent({
            isInitialLoading,
            initialLoadDone: initialLoadDone.current,
            reports,
            skeletonColumnCount,
            visibleColumnsArray,
            investmentTypeValue,
            handleRowClick,
            dataTestId
          })}
        </TableBody>
      </Table>
    </div>
  )
}
