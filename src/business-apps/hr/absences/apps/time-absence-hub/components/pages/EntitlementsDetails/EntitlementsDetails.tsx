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
import { BackofficeFilterSheet } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeFilterSheet'
import type { FilterConfiguration } from '@newwork/nw-design-system'

interface EntitlementsDetailsProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter
  onNavigateBack: () => void
}

// Helper functions
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

type SortField =
  | 'employeeName'
  | 'organizationalUnit'
  | 'absenceType'
  | 'entitlement'
  | 'validFrom'
  | 'validTo'
  | 'used'
  | 'available'
type SortOrder = 'asc' | 'desc'

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
                onClick={() => onSort('entitlement')}
                data-testid="entitlements-entitlement-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.entitlement',
                    'Entitlement'
                  )}
                  {renderSortIcon('entitlement', sortField, sortOrder)}
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
              <TableHead
                className="gba:w-1/12 gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-muted"
                onClick={() => onSort('used')}
                data-testid="entitlements-used-header"
              >
                <div className="gba:flex gba:items-center">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.summary_statistics.used',
                    'Used'
                  )}
                  {renderSortIcon('used', sortField, sortOrder)}
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
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-org-unit-cell-${entitlement.id}`}>
                  <span className="gba:text-sm">{entitlement.organizationalUnit}</span>
                </TableCell>
                <TableCell
                  className="gba:py-4 gba:px-6"
                  data-testid={`entitlements-absence-type-cell-${entitlement.id}`}
                >
                  <span className="gba:text-sm">{entitlement.absenceType}</span>
                </TableCell>
                <TableCell
                  className="gba:py-4 gba:px-6"
                  data-testid={`entitlements-entitlement-cell-${entitlement.id}`}
                >
                  <span className="gba:text-sm gba:font-medium gba:text-right">{entitlement.entitlement}</span>
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
                <TableCell className="gba:py-4 gba:px-6" data-testid={`entitlements-used-cell-${entitlement.id}`}>
                  <span className="gba:text-sm gba:font-medium gba:text-right">{entitlement.used}</span>
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

  // Filtering state
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // Get date filter for the current time filter
  const getDateFilters = () => {
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
      default:
        return null
    }
  }

  // Build GraphQL where conditions like AbsenceList does
  const buildWhereConditions = () => {
    const conditions: any = {
      isDeleted: { _eq: false }
    }
    const trimmedSearch = search.trim()

    // Add filters EXACTLY like AbsenceList - employee filters are raw IDs, others have prefixes
    const employeeFilters = selectedFilters.filter(f => !f.startsWith('department-') && !f.startsWith('type-'))
    const departmentFilters = selectedFilters
      .filter(f => f.startsWith('department-'))
      .map(f => f.replace('department-', ''))
    const typeFilters = selectedFilters.filter(f => f.startsWith('type-')).map(f => f.replace('type-', ''))

    // FIXED: If employee filters are selected, use them instead of search for employees
    if (employeeFilters.length > 0) {
      conditions.employee = { id: { _in: employeeFilters } }

      // Still allow search on type and department, but not employee names
      if (trimmedSearch) {
        conditions._or = [
          { type: { value: { _ilike: `%${trimmedSearch}%` } } },
          { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${trimmedSearch}%` } } } } }
        ]
      }
    }

    // No employee filters, use search for everything including employee names
    if (employeeFilters.length === 0 && trimmedSearch) {
      conditions._or = [
        { employee: { firstName: { _ilike: `%${trimmedSearch}%` } } },
        { employee: { lastName: { _ilike: `%${trimmedSearch}%` } } },
        { type: { value: { _ilike: `%${trimmedSearch}%` } } },
        { employee: { employeePosition: { organizationalUnit: { name: { _ilike: `%${trimmedSearch}%` } } } } }
      ]
    }

    if (departmentFilters.length > 0) {
      const departmentCondition = { organizationalUnit: { id: { _in: departmentFilters } } }

      // Merge with existing employee conditions properly
      if (conditions.employee) {
        conditions.employee.employeePosition = departmentCondition
      } else {
        conditions.employee = { employeePosition: departmentCondition }
      }
    }

    if (typeFilters.length > 0) {
      // Filter by absence type IDs (from catalog)
      const typeIds = typeFilters.map(f => f.replace('type-', ''))
      conditions.type = { id: { _in: typeIds } }
    }

    // Active employee positions filter - ADD TO _and instead of overwriting employee condition
    const currentDate = new Date().toISOString()

    // Always add active position filter as a separate condition to avoid conflicts
    if (!conditions._and) {
      conditions._and = []
    }

    conditions._and.push({
      employee: {
        employeePosition: {
          _or: [{ exitDate: { _isNull: true } }, { exitDate: { _gte: currentDate } }]
        }
      }
    })

    // Date filters - ADD to existing _and array
    const dateFilters = getDateFilters()
    if (dateFilters) {
      conditions._and.push({ validFrom: { _lte: dateFilters.endDate } }, { validTo: { _gte: dateFilters.startDate } })
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

  // Search and filter effects - reset to page 1 and fetch
  useEffect(() => {
    if (initialLoadDone.current) {
      if (currentPage === 1) {
        fetchEntitlements()
        return
      }

      setCurrentPage(1)
    }
  }, [search, JSON.stringify(selectedFilters), pageSize])

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

      // Build order by clause (map sort fields to GraphQL field names)
      const orderBy: any[] = []
      if (sortField && sortOrder) {
        const graphqlSortOrder = sortOrder.toUpperCase() // Convert to uppercase for GraphQL
        if (sortField === 'employeeName') {
          // For employee name, we can't sort directly since it's computed client-side
          // Sort by employeeId instead (not ideal but functional)
          orderBy.push({ employeeId: graphqlSortOrder })
        } else if (sortField === 'organizationalUnit') {
          // This field is also computed, skip sorting for now
          orderBy.push({ employeeId: graphqlSortOrder })
        } else if (sortField === 'absenceType') {
          // Sort by type value
          orderBy.push({ type: { value: graphqlSortOrder } })
        } else {
          // Direct mapping for other fields
          orderBy.push({ [sortField]: graphqlSortOrder })
        }
      } else {
        orderBy.push({ employeeId: 'ASC' })
      }

      const query = getDetailedEntitlementsQuery()
      const result = await graphQLClient.request<{
        EmployeeAbsenceEntitlement: any[]
        EmployeeAbsenceEntitlementAggregate: { aggregate: { count: number } }
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

        return {
          id: ent.id, // Use entitlement ID for unique keys
          employeeId: ent.employeeId || '',
          employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Unknown Employee',
          organizationalUnitId: employee?.employeePosition?.organizationalUnit?.id || '',
          organizationalUnit: employee?.employeePosition?.organizationalUnit?.name || 'No Department',
          absenceType: typeName, // Use dashboard pattern
          absenceTypeId: ent.type?.id || '',
          entitlement: ent.total || 0,
          validFrom: ent.validFrom || '',
          validTo: ent.validTo || '',
          used: ent.approved || 0, // Use approved field as "used"
          available: ent.available || 0,
          status: ent.available > 0 ? 'Active' : 'Expired'
        }
      })

      setEntitlements(transformedData)
      setTotal(result.EmployeeAbsenceEntitlementAggregate.aggregate.count)
    } catch (err) {
      console.error('❌ Error loading entitlements:', err)
      setError(err instanceof Error ? err.message : 'Failed to load entitlements data')
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

  const entitlementFilterOptions = useMemo(() => {
    const employees = new Map<string, string>()
    const departments = new Map<string, string>()
    const absenceTypes = new Map<string, string>()

    entitlements.forEach(entitlement => {
      if (entitlement.employeeId && entitlement.employeeName) {
        employees.set(entitlement.employeeId, entitlement.employeeName)
      }

      if (entitlement.organizationalUnitId && entitlement.organizationalUnit) {
        departments.set(entitlement.organizationalUnitId, entitlement.organizationalUnit)
      }

      if (entitlement.absenceTypeId && entitlement.absenceType) {
        absenceTypes.set(entitlement.absenceTypeId, entitlement.absenceType)
      }
    })

    const toOptions = (entries: Map<string, string>) =>
      Array.from(entries.entries())
        .map(([id, label]) => ({ id, label }))
        .sort((a, b) => a.label.localeCompare(b.label))

    return {
      employees: toOptions(employees),
      departments: toOptions(departments),
      absenceTypes: toOptions(absenceTypes)
    }
  }, [entitlements])

  const filtersObject = useMemo<Record<string, unknown>>(() => {
    const employeeIds = selectedFilters.filter(
      filter => !filter.startsWith('department-') && !filter.startsWith('type-')
    )
    const departmentIds = selectedFilters
      .filter(filter => filter.startsWith('department-'))
      .map(filter => filter.replace('department-', ''))
    const absenceTypeIds = selectedFilters
      .filter(filter => filter.startsWith('type-'))
      .map(filter => filter.replace('type-', ''))
    const filters: Record<string, unknown> = {}

    if (employeeIds.length > 0) {
      filters.employeeIds = employeeIds
    }

    if (departmentIds.length > 0) {
      filters.departmentIds = departmentIds
    }

    if (absenceTypeIds.length > 0) {
      filters.absenceTypeIds = absenceTypeIds
    }

    return filters
  }, [selectedFilters])

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'entitlements-details-filters',
      name: getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.summary_statistics.employee_entitlements',
        'Employee Entitlements'
      ),
      groups: [
        {
          id: 'employee-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'employeeIds',
              field: 'employeeIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.employee', 'Employee'),
              type: 'multi-select',
              config: { options: entitlementFilterOptions.employees, showSearch: true, showSelectAll: false }
            }
          ]
        },
        {
          id: 'department-group',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.absence_list.department',
            'Department'
          ),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'departmentIds',
              field: 'departmentIds',
              label: getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_list.department',
                'Department'
              ),
              type: 'multi-select',
              config: { options: entitlementFilterOptions.departments, showSearch: true, showSelectAll: false }
            }
          ]
        },
        {
          id: 'absence-type-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absence_type', 'Absence Type'),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'absenceTypeIds',
              field: 'absenceTypeIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.absence_type', 'Absence Type'),
              type: 'multi-select',
              config: { options: entitlementFilterOptions.absenceTypes, showSearch: true, showSelectAll: false }
            }
          ]
        }
      ]
    }),
    [entitlementFilterOptions]
  )

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const employeeIds = (filters.employeeIds as string[] | undefined) ?? []
    const departmentIds = ((filters.departmentIds as string[] | undefined) ?? []).map(id => `department-${id}`)
    const absenceTypeIds = ((filters.absenceTypeIds as string[] | undefined) ?? []).map(id => `type-${id}`)

    setSelectedFilters([...employeeIds, ...departmentIds, ...absenceTypeIds])
    setCurrentPage(1)
  }, [])

  const handlePaginationChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1)
    }
  }

  // Summary statistics based on filtered data
  const summaryStats = useMemo(() => {
    if (total === 0) return null

    const totalEmployees = new Set(entitlements.map(e => e.employeeId)).size
    const totalEntitlements = entitlements.reduce((sum, e) => sum + e.entitlement, 0)
    const totalUsed = entitlements.reduce((sum, e) => sum + e.used, 0)
    const totalAvailable = entitlements.reduce((sum, e) => sum + e.available, 0)

    return {
      totalEmployees,
      totalEntitlements,
      totalUsed,
      totalAvailable,
      utilizationRate: totalEntitlements > 0 ? ((totalUsed / totalEntitlements) * 100).toFixed(1) : '0'
    }
  }, [entitlements, total])

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
              'Employees in current results'
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
        filters={filtersObject}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChangeFromDisplay}
        data-testid="entitlements-details-data-display"
        renderFilterSheet={(open, onOpenChange) => (
          <BackofficeFilterSheet
            open={open}
            onOpenChange={onOpenChange}
            configuration={filterConfiguration}
            values={filtersObject}
            onApply={handleFilterChangeFromDisplay}
            title={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.filter_title',
              'Filter Entitlements'
            )}
            description={getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_absence_hub.entitlements.filter_description',
              'Narrow entitlement results by employee, department, and absence type.'
            )}
          />
        )}
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
