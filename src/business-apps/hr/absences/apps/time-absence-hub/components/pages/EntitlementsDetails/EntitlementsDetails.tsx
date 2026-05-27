import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Spinner,
  Alert,
  AlertDescription,
  AlertTitle
} from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  CalendarBlankIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  UserIcon,
  CalendarCheckIcon
} from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '../../../../../../../../common/network/catalogs/useCatalogManagerClient'
import { TimeFilter } from '../../../types'
import { getTranslationFromI18nKeyAndLabel, getDateFormat } from '@/common/utils/windowUtils'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import { EVERYTHING_DATE_FROM, EVERYTHING_DATE_TO } from '../../../constants/routes'
import type { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import type { FilterConfiguration } from '@newwork/nw-design-system'

interface EntitlementsDetailsProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter
  globalFilters?: HubGlobalFilters
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  onOpenGlobalFilters?: () => void
  onNavigateBack: () => void
}

const VACATION_TYPE_ID = 'AbsenceType:v1:A001'

interface GlobalFilterRedirectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenGlobalFilters?: () => void
}

const GlobalFilterRedirect: React.FC<GlobalFilterRedirectProps> = ({ open, onOpenChange, onOpenGlobalFilters }) => {
  useEffect(() => {
    if (!open) {
      return
    }

    onOpenGlobalFilters?.()
    onOpenChange(false)
  }, [open, onOpenChange, onOpenGlobalFilters])

  return null
}

// Helper functions
const formatDayValue = (value: number): string => {
  const rounded = Number(value.toFixed(1))

  if (Number.isInteger(rounded)) {
    return String(rounded)
  }

  return rounded.toFixed(1)
}

const formatDaysLeftLabel = (available: number, total: number, daysLabel: string): string =>
  `${formatDayValue(available)} / ${formatDayValue(total)} ${daysLabel} ${getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.entitlements.left', 'left')}`

const renderSortIcon = (field: string, sortField: string, sortOrder: 'asc' | 'desc' | '') => {
  if (sortField !== field) return null
  if (sortOrder === 'asc') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
  if (sortOrder === 'desc') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
  return null
}

const formatDateForDisplay = (dateStr: string) => {
  return dayjs(dateStr).format(getDateFormat('date.short'))
}

interface SummaryMetricCardProps {
  title: string
  value: string | number
  description: string
  icon: React.ReactNode
}

const SummaryMetricCard: React.FC<SummaryMetricCardProps> = ({ title, value, description, icon }) => (
  <Card className="gba:border-0 gba:bg-muted/40 gba:shadow-none">
    <CardContent className="gba:p-4">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className="gba:min-w-0">
          <p className="gba:text-sm gba:text-muted-foreground">{title}</p>
          <p className="gba:mt-3 gba:text-2xl gba:font-bold gba:leading-none gba:text-foreground">{value}</p>
          <p className="gba:mt-2 gba:text-xs gba:text-muted-foreground">{description}</p>
        </div>
        <div className="gba:text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
)

interface DetailedEntitlement {
  id: string // Add unique ID for table keys
  employeeId: string
  employeeName: string
  organizationalUnitId: string
  organizationalUnit: string | null
  absenceType: string
  absenceTypeId: string
  entitlement: number
  validFrom: string
  validTo: string
  used: number
  available: number
  status: string
}

interface EntitlementsSummaryStats {
  totalEmployees: number
  totalEntitlements: number
  totalUsed: number
  totalAvailable: number
}

type SortField = 'employeeName' | 'organizationalUnit' | 'absenceType' | 'daysLeft' | 'validFrom' | 'validTo'
type SortOrder = 'asc' | 'desc'

const buildEntitlementsOrderBy = (sortField: SortField, sortOrder: SortOrder): Record<string, unknown>[] => {
  const graphqlSortOrder = sortOrder.toUpperCase()

  switch (sortField) {
    case 'employeeName':
      return [{ employee: { firstName: graphqlSortOrder } }, { employee: { lastName: graphqlSortOrder } }]
    case 'organizationalUnit':
      return [{ employee: { employeePosition: { organizationalUnit: { name: graphqlSortOrder } } } }]
    case 'absenceType':
      return [{ type: { value: graphqlSortOrder } }]
    case 'daysLeft':
      return [{ available: graphqlSortOrder }]
    case 'validFrom':
      return [{ validFrom: graphqlSortOrder }]
    case 'validTo':
      return [{ validTo: graphqlSortOrder }]
    default:
      return [{ employeeId: 'ASC' }]
  }
}

interface EntitlementsTableProps {
  entitlements: DetailedEntitlement[]
  loading: boolean
  error: string | null
  total: number
  currentPage: number
  pageSize: number
  sortField: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  onPaginationChange: (page: number, newPageSize?: number) => void
}

const EntitlementsTable: React.FC<EntitlementsTableProps> = ({
  entitlements,
  loading,
  error,
  total,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSort,
  onPaginationChange
}) => {
  const totalPages = Math.ceil(total / pageSize)
  const daysLabel = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-8" data-testid="entitlements-table-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="entitlements-table-error">
        <Alert variant="destructive">
          <AlertTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.error_title',
              'Error Loading Entitlements'
            )}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid="entitlements-table-container">
      <div className="gba:overflow-x-auto">
        <Table data-testid="entitlements-table">
          <TableHeader>
            <TableRow className="gba:border-b gba:bg-muted">
              <TableHead
                className="gba:w-1/5 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('employeeName')}
                data-testid="entitlements-employee-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.name',
                    'Name'
                  )}
                  {renderSortIcon('employeeName', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-1/5 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('daysLeft')}
                data-testid="entitlements-days-left-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.entitlements.days_left', 'Days Left')}
                  {renderSortIcon('daysLeft', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-1/6 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('organizationalUnit')}
                data-testid="entitlements-org-unit-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.org_unit',
                    'Org Unit'
                  )}
                  {renderSortIcon('organizationalUnit', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-1/6 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('absenceType')}
                data-testid="entitlements-absence-type-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.absence_type',
                    'Absence Type'
                  )}
                  {renderSortIcon('absenceType', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-1/12 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('validFrom')}
                data-testid="entitlements-valid-from-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.valid_from',
                    'Valid From'
                  )}
                  {renderSortIcon('validFrom', sortField, sortOrder)}
                </div>
              </TableHead>
              <TableHead
                className="gba:w-1/12 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('validTo')}
                data-testid="entitlements-valid-to-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.valid_to',
                    'Valid To'
                  )}
                  {renderSortIcon('validTo', sortField, sortOrder)}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entitlements.map(entitlement => (
              <TableRow
                key={entitlement.id}
                className="gba:border-b gba:hover:bg-muted gba:transition-colors"
                data-testid={`entitlements-row-${entitlement.id}`}
              >
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-employee-cell-${entitlement.id}`}>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <UserIcon size={16} className="gba:text-muted-foreground" />
                    <span className="gba:font-medium gba:text-sm">{entitlement.employeeName}</span>
                  </div>
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-days-left-cell-${entitlement.id}`}>
                  <div className="gba:flex gba:flex-col gba:gap-0.5">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {formatDaysLeftLabel(entitlement.available, entitlement.entitlement, daysLabel)}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_absence_hub.entitlements.annual_allowance',
                        '{used} of {total} {days} used'
                      )
                        .replace('{used}', formatDayValue(entitlement.used))
                        .replace('{total}', formatDayValue(entitlement.entitlement))
                        .replace('{days}', daysLabel)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-org-unit-cell-${entitlement.id}`}>
                  <span className="gba:text-sm">{entitlement.organizationalUnit}</span>
                </TableCell>
                <TableCell
                  className="gba:py-4 gba:px-6"
                  data-testid={`entitlements-absence-type-cell-${entitlement.id}`}
                >
                  <span className="gba:text-sm">{entitlement.absenceType}</span>
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-valid-from-cell-${entitlement.id}`}>
                  {entitlement.validFrom ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <CalendarIcon size={16} className="gba:text-muted-foreground" />
                      <span className="gba:text-sm">{formatDateForDisplay(entitlement.validFrom)}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-valid-to-cell-${entitlement.id}`}>
                  {entitlement.validTo ? (
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <CalendarIcon size={16} className="gba:text-muted-foreground" />
                      <span className="gba:text-sm">{formatDateForDisplay(entitlement.validTo)}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid="entitlements-pagination"
        >
          <div className="gba:text-sm gba:text-muted-foreground" data-testid="entitlements-pagination-info">
            {`${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, total)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.summary_statistics.pagination_entitlements', 'entitlements')}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
            <div className="gba:flex gba:items-center gba:space-x-2">
              <p className="gba:text-sm gba:font-medium">
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
              </p>
              <select
                value={pageSize}
                onChange={e => onPaginationChange(1, Number(e.target.value))}
                className="gba:h-8 gba:w-20 gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="entitlements-page-size-select"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div
              className="gba:flex gba:w-24 gba:items-center gba:justify-center gba:text-sm gba:font-medium"
              data-testid="entitlements-page-info"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.page', 'Page')} {currentPage}{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} {totalPages}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(1)}
                disabled={currentPage === 1}
                data-testid="entitlements-first-page-button"
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_list.go_to_first_page',
                    'Go to first page'
                  )}
                </span>
                <span aria-hidden="true">«</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage - 1)}
                disabled={currentPage === 1}
                data-testid="entitlements-previous-page-button"
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_list.go_to_previous_page',
                    'Go to previous page'
                  )}
                </span>
                <span aria-hidden="true">‹</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                data-testid="entitlements-next-page-button"
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_list.go_to_next_page',
                    'Go to next page'
                  )}
                </span>
                <span aria-hidden="true">›</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                onClick={() => onPaginationChange(totalPages)}
                disabled={currentPage >= totalPages}
                data-testid="entitlements-last-page-button"
              >
                <span className="gba:sr-only">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_list.go_to_last_page',
                    'Go to last page'
                  )}
                </span>
                <span aria-hidden="true">»</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:px-2 gba:py-4"
          data-testid="entitlements-pagination-info-single-page"
        >
          <div className="gba:text-sm gba:text-muted-foreground">
            {`${total} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.summary_statistics.employee_entitlements', 'entitlements')}`}
          </div>
          <div className="gba:flex gba:items-center gba:space-x-2">
            <p className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.rows_per_page', 'Rows per page')}
            </p>
            <select
              value={pageSize}
              onChange={e => onPaginationChange(1, Number(e.target.value))}
              className="gba:h-8 gba:w-20 gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="entitlements-page-size-select-single"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

const EntitlementsDetails: React.FC<EntitlementsDetailsProps> = ({
  accessToken,
  timeFilter = 'current-year',
  globalFilters,
  derivedDateRange,
  onOpenGlobalFilters,
  onNavigateBack
}) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [entitlements, setEntitlements] = useState<DetailedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [absenceTypesMap, setAbsenceTypesMap] = useState<Record<string, string>>({})

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('employeeName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  // Track initial load to prevent unnecessary re-renders (like AbsenceList)
  const initialLoadDone = useRef(false)

  // Local quick-search input on top of the main hub filters
  const [search, setSearch] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [aggregateStats, setAggregateStats] = useState<EntitlementsSummaryStats | null>(null)

  // Fallback date range when the parent does not pass a derived range (legacy timeFilter prop).
  const getLegacyDateFilters = () => {
    const now = new Date()

    switch (timeFilter) {
      case 'current-year':
        return {
          startDate: `${now.getFullYear()}-01-01`,
          endDate: `${now.getFullYear()}-12-31`
        }
      case 'quarter': {
        const quarter = Math.floor(now.getMonth() / 3)
        const quarterStart = new Date(now.getFullYear(), quarter * 3, 1)
        const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
        return {
          startDate: quarterStart.toISOString().split('T')[0],
          endDate: quarterEnd.toISOString().split('T')[0]
        }
      }
      case 'month':
        return {
          startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      case 'everything':
        return {
          startDate: EVERYTHING_DATE_FROM,
          endDate: EVERYTHING_DATE_TO
        }
      default:
        return null
    }
  }

  // Build GraphQL where conditions driven by the main hub global filters.
  const buildWhereConditions = () => {
    const conditions: Record<string, any> = {
      isDeleted: { _eq: false },
      type: { id: { _eq: VACATION_TYPE_ID } },
      _and: [] as any[]
    }

    const employeePositionAnd: any[] = []
    if (globalFilters?.departmentIds?.length) {
      employeePositionAnd.push({ organizationalUnitId: { _in: globalFilters.departmentIds } })
    }
    if (globalFilters?.locationIds?.length) {
      employeePositionAnd.push({ siteLocationId: { _in: globalFilters.locationIds } })
    }
    if (globalFilters?.legalEntityIds?.length) {
      employeePositionAnd.push({ companyId: { _in: globalFilters.legalEntityIds } })
    }
    if (globalFilters?.managerIds?.length) {
      employeePositionAnd.push({ supervisorEmployeeId: { _in: globalFilters.managerIds } })
    }

    const currentDate = new Date().toISOString()
    employeePositionAnd.push({
      _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gte: currentDate } }]
    })

    const employeeAnd: any[] = [{ employeePosition: { _and: employeePositionAnd } }]

    const globalEmployeeQuery = globalFilters?.employeeQuery?.trim() ?? ''
    const localSearch = search.trim()
    const nameQuery = globalEmployeeQuery || localSearch
    if (nameQuery) {
      employeeAnd.push({
        _or: [
          { firstName: { _ilike: `%${nameQuery}%` } },
          { lastName: { _ilike: `%${nameQuery}%` } },
          { displayName: { _ilike: `%${nameQuery}%` } }
        ]
      })
    }

    conditions._and.push({ employee: { _and: employeeAnd } })

    const dateRange = derivedDateRange
      ? { startDate: derivedDateRange.dateFrom, endDate: derivedDateRange.dateTo }
      : getLegacyDateFilters()
    if (dateRange) {
      conditions._and.push({ validFrom: { _lte: dateRange.endDate } })
      conditions._and.push({
        _or: [{ validTo: { _isNull: true } }, { validTo: { _gte: dateRange.startDate } }]
      })
    }

    return conditions
  }

  const getDetailedEntitlementsQuery = () => {
    return `
      query GetDetailedEntitlements($where: EmployeeAbsenceEntitlementBoolExp!, $offset: Int!, $limit: Int!, $orderBy: [EmployeeAbsenceEntitlementOrderBy!]) {
        EmployeeAbsenceEntitlement(
          where: $where
          offset: $offset
          limit: $limit
          orderBy: $orderBy
        ) {
          id
          employeeId
          total
          available
          approved
          pending
          validFrom
          validTo
          employee {
            id
            firstName
            lastName
            employeePosition {
              organizationalUnit {
                id
                name
              }
            }
          }
          type {
            id
            value
            parentEntryId
          }
        }
        EmployeeAbsenceEntitlementAggregate(where: $where) {
          aggregate {
            count
            distinctEmployees: count(columns: [employeeId], distinct: true)
            sum {
              total
              approved
              available
            }
          }
        }
      }
    `
  }

  // Fetch catalog data once on mount (like AbsenceList does)
  useEffect(() => {
    const fetchCatalogData = async () => {
      if (!accessToken) return

      try {
        // Ensure catalog client has access token (like dashboard does)
        catalogClient.setAccessToken(accessToken)

        // Fetch AbsenceType catalog with ALL required parameters like manager-absences
        const typesCatalogData = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AbsenceType', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Map types EXACTLY like AbsenceList maps groups
        const typesMap: Record<string, string> = {}
        typesCatalogData.data.forEach((entry: any) => {
          typesMap[entry.id] = entry.value
          // Map by both the main id and the catalogEntryLocalId for compatibility
          if (entry.catalogEntryLocalId) {
            typesMap[entry.catalogEntryLocalId] = entry.value
          }
        })
        setAbsenceTypesMap(typesMap)
      } catch (err) {
        console.error('❌ Error loading catalog:', err)
      }
    }

    fetchCatalogData()
  }, [accessToken])

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && accessToken) {
      initialLoadDone.current = true
      fetchEntitlements()
    }
  }, [accessToken])

  // Pagination effect - fetch new page when currentPage changes
  useEffect(() => {
    if (initialLoadDone.current) {
      fetchEntitlements()
    }
  }, [currentPage])

  // Search, hub filter, page size and sort effects - reset to page 1 and fetch
  useEffect(() => {
    if (initialLoadDone.current) {
      if (currentPage === 1) {
        fetchEntitlements()
        return
      }

      setCurrentPage(1)
    }
  }, [
    search,
    pageSize,
    sortField,
    sortOrder,
    globalFilters?.departmentIds?.join(','),
    globalFilters?.locationIds?.join(','),
    globalFilters?.legalEntityIds?.join(','),
    globalFilters?.managerIds?.join(','),
    globalFilters?.employeeQuery,
    derivedDateRange?.dateFrom,
    derivedDateRange?.dateTo
  ])

  // Main data fetching function (like AbsenceList fetchAbsences)
  const fetchEntitlements = async () => {
    if (!accessToken) return

    try {
      // ✅ KEY FIX: Only show loading on initial load, not filter changes
      if (!initialLoadDone.current) {
        setLoading(true)
      }
      setError(null)

      // Fetch entitlements data with GraphQL variables like AbsenceList
      const whereConditions = buildWhereConditions()

      const orderBy = buildEntitlementsOrderBy(sortField, sortOrder)

      const query = getDetailedEntitlementsQuery()
      const result = await graphQLClient.request<{
        EmployeeAbsenceEntitlement: any[]
        EmployeeAbsenceEntitlementAggregate: {
          aggregate: {
            count: number
            distinctEmployees: number
            sum?: {
              total?: number
              approved?: number
              available?: number
            }
          }
        }
      }>(query, {
        where: whereConditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy: orderBy
      })

      // Transform data using EXACT same pattern as AbsenceList for type mapping
      const transformedData: DetailedEntitlement[] = result.EmployeeAbsenceEntitlement.map((ent: any) => {
        const employee = ent.employee

        // Use EXACT same pattern as AbsenceList for type mapping
        const typeName = absenceTypesMap[ent.type?.id] || ent.type?.value || 'Unknown Type'

        // Log any unmapped types for debugging
        if (typeName === 'Unknown Type') {
          console.warn('❌ Unmapped absence type:', {
            typeId: ent.type?.id,
            typeValue: ent.type?.value
          })
        }

        const total = ent.total || 0
        const available = ent.available || 0
        const pending = ent.pending || 0
        const used = Math.max(0, total - available - pending)

        return {
          id: ent.id,
          employeeId: ent.employeeId || '',
          employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Unknown Employee',
          organizationalUnitId: employee?.employeePosition?.organizationalUnit?.id || '',
          organizationalUnit: employee?.employeePosition?.organizationalUnit?.name || 'No Department',
          absenceType: typeName,
          absenceTypeId: ent.type?.id || '',
          entitlement: total,
          validFrom: ent.validFrom || '',
          validTo: ent.validTo || '',
          used,
          available,
          status: available > 0 ? 'Active' : 'Expired'
        }
      })

      setEntitlements(transformedData)
      const aggregate = result.EmployeeAbsenceEntitlementAggregate.aggregate
      const sums = aggregate.sum

      setTotal(aggregate.count)
      setAggregateStats({
        totalEmployees: Number(aggregate.distinctEmployees || 0),
        totalEntitlements: Number(sums?.total || 0),
        totalUsed: Number(sums?.approved || 0),
        totalAvailable: Number(sums?.available || 0)
      })
    } catch (err) {
      console.error('❌ Error loading entitlements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load entitlements data')
      setAggregateStats(null)
    } finally {
      setLoading(false)
    }
  }

  // Handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setCurrentPage(1) // Reset to first page when search changes
  }, []) // Remove search dependency to prevent dropdown closing

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
    }
  }

  // Summary statistics based on filtered data
  const summaryStats = useMemo(() => {
    if (!aggregateStats || total === 0) {
      return null
    }

    return {
      ...aggregateStats,
      utilizationRate:
        aggregateStats.totalEntitlements > 0
          ? ((aggregateStats.totalUsed / aggregateStats.totalEntitlements) * 100).toFixed(1)
          : '0'
    }
  }, [aggregateStats, total])

  const hubFilterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'hub-global-filters',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.filters.label', 'Filter'),
      groups: []
    }),
    []
  )

  return (
    <div data-testid="entitlements-details-page" className="gba:p-4 gba:space-y-6">
      <div className="gba:flex gba:items-start gba:gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:p-0"
          aria-label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.back_to_btn',
            'Back to Dashboard'
          )}
          data-testid="back-to-dashboard-button"
        >
          <ArrowLeftIcon size={16} />
        </Button>
        <div className="gba:flex gba:min-w-0 gba:items-start gba:gap-3">
          <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-info-secondary gba:text-info">
            <UsersIcon size={22} />
          </div>
          <div className="gba:min-w-0">
            <h1 className="gba:text-2xl gba:font-bold gba:leading-tight gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.summary_statistics.title_vacation',
                'Vacation Entitlements Details'
              )}
            </h1>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.summary_statistics.description',
                'Complete breakdown of all employee vacation entitlements and usage'
              )}
            </p>
          </div>
        </div>
      </div>

      {summaryStats && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:sm:grid-cols-2 gba:lg:grid-cols-5">
          <SummaryMetricCard
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.total_employees',
              'Total Employees'
            )}
            value={summaryStats.totalEmployees}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.filtered_employees',
              'Employees in filtered dataset'
            )}
            icon={<UsersIcon size={20} />}
          />
          <SummaryMetricCard
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.total_entitlement_days',
              'Total Entitlement Days'
            )}
            value={summaryStats.totalEntitlements}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.entitlement_days_description',
              'Granted across all employees'
            )}
            icon={<CalendarBlankIcon size={20} />}
          />
          <SummaryMetricCard
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.days_used',
              'Days Used'
            )}
            value={summaryStats.totalUsed}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.days_used_description',
              'Already consumed'
            )}
            icon={<CalendarCheckIcon size={20} />}
          />
          <SummaryMetricCard
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.days_available',
              'Days Available'
            )}
            value={summaryStats.totalAvailable}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.days_available_description',
              'Still available'
            )}
            icon={<CalendarBlankIcon size={20} />}
          />
          <SummaryMetricCard
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.utilization_rate',
              'Utilization Rate'
            )}
            value={`${summaryStats.utilizationRate}%`}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.utilization_description',
              'Used from total allowance'
            )}
            icon={<ArrowUpIcon size={20} />}
          />
        </div>
      )}

      <BackofficeDataDisplay
        titleSections={[
          {
            id: 'entitlements',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.summary_statistics.employee_entitlements',
              'Employee Entitlements'
            ),
            metadata: { count: total, isLoading: loading }
          }
        ]}
        currentSection="entitlements"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_absence_hub.entitlements.search_placeholder',
          'Search entitlements...'
        )}
        onSearchChange={handleSearchChange}
        filterConfiguration={onOpenGlobalFilters ? hubFilterConfiguration : undefined}
        renderFilterSheet={
          onOpenGlobalFilters
            ? (open, onOpenChange) => (
                <GlobalFilterRedirect
                  open={open}
                  onOpenChange={onOpenChange}
                  onOpenGlobalFilters={onOpenGlobalFilters}
                />
              )
            : undefined
        }
        data-testid="entitlements-details-data-display"
      >
        <div data-testid="entitlements-table-container">
          <EntitlementsTable
            entitlements={entitlements}
            loading={loading}
            error={error}
            total={total}
            currentPage={currentPage}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onPaginationChange={handlePaginationChange}
          />
        </div>
      </BackofficeDataDisplay>
    </div>
  )
}

export default EntitlementsDetails
