// Investment Reports Tab - Refactored for Size Compliance
import React, { useCallback, useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Spinner,
  Alert,
  AlertTitle,
  AlertDescription
} from '@newwork/nw-design-system'
import { FlipHorizontalIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentReports } from '@/common/data/investment-report/hooks/useInvestmentReports'
import { type InvestmentReportQueryVariables } from '@/common/data/investment-report/queries'
import { createInvestmentReportColumns, ColumnDefinition } from './columnDefinitions'
import TransposedTable from './TransposedTable'
import ReportFilters from './ReportFilters'

interface InvestmentReportsTabProps extends BusinessAppContextProps {
  investmentId: string
  investmentGroupIds?: string[]
  specificInvestmentId?: string
  customColumns?: ColumnDefinition[]
  catalogData: any // Now required for dynamic columns
  investmentTypeCode: string // Now required
  liquidFundTypeCode?: string
  investment?: any // Add the full investment record from header
  filterHeaderActions?: React.ReactNode // Optional actions for filter header
  'data-testid'?: string
}

const InvestmentReportsTab: React.FC<InvestmentReportsTabProps> = ({
  investmentId,
  investmentGroupIds,
  specificInvestmentId,
  customColumns,
  catalogData,
  investmentTypeCode,
  liquidFundTypeCode,
  investment,
  filterHeaderActions,
  accessToken,
  userInfo,
  'data-testid': dataTestId = 'investment-reports-tab'
}) => {
  const [reports, setReports] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [sortField, setSortField] = useState<string>('date')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [isTransposed, setIsTransposed] = useState(false)

  const { fetchInvestmentReports } = useGetInvestmentReports({ accessToken, userInfo } as BusinessAppContextProps)

  const loadReports = useCallback(async () => {
    if (!investmentId) return
    setIsLoading(true)
    setError(null)

    try {
      const params: InvestmentReportQueryVariables = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: [{ field: sortField, direction: sortOrder }]
      }

      // INDIVIDUAL INVESTMENT REPORTS: Always show ALL reports for this investment
      // Unlike the reports-view which shows latest-per-investment, here we want ALL reports
      // So we always use the generic investment filter to get all reports for this investment ID

      params.investmentIds = [investmentId]

      // Handle date filtering
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.reportDateFrom = dateRange[0].format('YYYY-MM-DD')
        params.reportDateTo = dateRange[1].format('YYYY-MM-DD')
      } else if (timeFilter !== 'all') {
        const now = dayjs()
        let startDate: dayjs.Dayjs | null = null
        switch (timeFilter) {
          case 'last7days':
            startDate = now.subtract(7, 'days')
            break
          case 'last30days':
            startDate = now.subtract(30, 'days')
            break
          case 'last3months':
            startDate = now.subtract(3, 'months')
            break
          case 'last6months':
            startDate = now.subtract(6, 'months')
            break
          case 'lastyear':
            startDate = now.subtract(1, 'year')
            break
          default:
            startDate = null
        }
        if (startDate) {
          params.reportDateFrom = startDate.format('YYYY-MM-DD')
        }
      }

      const response = await fetchInvestmentReports(params)

      setReports(response.reports || [])
      setTotal(response.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [
    investmentId,
    investmentGroupIds,
    specificInvestmentId,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    dateRange,
    timeFilter,
    fetchInvestmentReports
  ])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('ASC')
    }
    setCurrentPage(1)
  }

  // Generate columns using the dynamic catalog-based system
  const columns: ColumnDefinition[] = React.useMemo(() => {
    if (customColumns && customColumns.length > 0) {
      return customColumns
    }
    return createInvestmentReportColumns(investmentTypeCode, liquidFundTypeCode, catalogData, accessToken, investment)
  }, [customColumns, investmentTypeCode, liquidFundTypeCode, catalogData, accessToken, investment])

  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    setDateRange(dates)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setTimeFilter('all')
    setDateRange(null)
    setCurrentPage(1)
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid={`${dataTestId}-loading`}>
        <Spinner data-testid={`${dataTestId}-loading-spinner`} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid={`${dataTestId}-error`}>
        <Alert variant="destructive" data-testid="investment-reports-alert">
          <AlertTitle>Error Loading Reports</AlertTitle>
          <AlertDescription>
            {error}
            <div className="gba:mt-3">
              <Button size="sm" onClick={loadReports} data-testid="investment-reports-retry-button">
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid={dataTestId}>
      {/* Filters */}
      <ReportFilters
        timeFilter={timeFilter}
        dateRange={dateRange}
        onTimeFilterChange={handleTimeFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onClearFilters={handleClearFilters}
        headerActions={filterHeaderActions}
        data-testid={`${dataTestId}-filters`}
      />

      {/* Reports Table */}
      <div className="gba:bg-white gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:p-4 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center">
            <h3 className="gba:text-lg gba:font-semibold">Investment Reports ({total})</h3>
            <Button variant="outline" size="sm" onClick={() => setIsTransposed(!isTransposed)}>
              <FlipHorizontalIcon className="gba:w-4 gba:h-4 gba:mr-2" />
              Transpose
            </Button>
          </div>
        </div>

        <div className="gba:p-4">
          {isTransposed ? (
            <TransposedTable columns={columns} reports={reports} data-testid={`${dataTestId}-transposed`} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead
                      key={column.key}
                      className={column.sortable ? 'gba:cursor-pointer gba:select-none' : ''}
                      onClick={() => column.sortable && handleSort(column.key)}
                      style={{
                        width: column.width,
                        // Add sticky positioning for actions column
                        ...(column.key === 'actions' && {
                          position: 'sticky',
                          right: 0,
                          backgroundColor: 'var(--nw-color-surface-secondary)',
                          zIndex: 10
                        })
                      }}
                    >
                      <div className="gba:flex gba:items-center gba:gap-1">
                        {column.title}
                        {column.sortable && sortField === column.key && (
                          <span className="gba:text-xs">{sortOrder === 'ASC' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="gba:text-center gba:py-8 gba:text-gray-500">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map(report => (
                    <TableRow key={report.id}>
                      {columns.map(column => (
                        <TableCell
                          key={column.key}
                          style={{
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
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}

export default InvestmentReportsTab
