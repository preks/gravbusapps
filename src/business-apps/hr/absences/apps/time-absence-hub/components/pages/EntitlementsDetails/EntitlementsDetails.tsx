import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, CardContent, Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, CalendarBlankIcon, UsersIcon, ArrowUpIcon, CalendarCheckIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '../../../../../../../../common/BusinessAppContext'
import { useGraphQLClient } from '../../../../../../../../common/network/graphql/useGraphQLClient'
import { TimeFilter } from '../../../types'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BackofficeDataDisplay } from '@/business-apps/fin/expenses/apps/backoffice-expenses/common/components/BackofficeDataDisplay'
import type { HubGlobalFilters } from '../../../hooks/useHubGlobalFilters'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  EntitlementUsageSnapshotRow,
  GET_ENTITLEMENT_ABSENCE_TYPES_BY_IDS,
  GET_ENTITLEMENT_EMPLOYEES_BY_IDS
} from '../../../queries/OrgEntitlementQueries'
import { GET_FILTERED_EMPLOYEE_IDS, type FilteredEmployee } from '../../../queries/OrgAttendanceQueries'
import { buildEmployeeWhereForHubFilters } from '../../../hooks/useOrgAttendanceData'
import { HubDataTable, type HubDataTableColumn } from '../../views/shared/HubDataTable'
import { HubEmployeeCell } from '../../views/shared/HubEmployeeCell'

interface EntitlementsDetailsProps extends BusinessAppContextProps {
  timeFilter?: TimeFilter
  globalFilters?: HubGlobalFilters
  derivedDateRange?: { dateFrom: string; dateTo: string } | null
  onOpenGlobalFilters?: () => void
  onNavigateBack: () => void
}

const VACATION_TYPE_ID = 'AbsenceType:v1:A001'
const SNAPSHOT_SUMMARY_LIMIT = 5000

const DEFAULT_HUB_FILTERS: HubGlobalFilters = {
  timeScope: 'current-year',
  dateFrom: undefined,
  dateTo: undefined,
  departmentIds: [],
  locationIds: [],
  legalEntityIds: [],
  managerIds: [],
  employeeQuery: '',
  absenceTypeIds: [],
  statusIds: []
}

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
  id: string
  employeeId: string
  employeeName: string
  pictureThumbnail?: string | null
  organizationalUnitId: string
  organizationalUnit: string | null
  absenceType: string
  absenceTypeId: string
  entitlement: number
  used: number
  available: number
}

interface EntitlementsSummaryStats {
  totalEmployees: number
  totalEntitlements: number
  totalUsed: number
  totalAvailable: number
}

type SortField = 'employeeName' | 'organizationalUnit' | 'absenceType' | 'daysLeft'
type SortOrder = 'ASC' | 'DESC'

const buildEntitlementsOrderBy = (sortField: SortField, sortOrder: SortOrder): Record<string, unknown>[] => {
  switch (sortField) {
    case 'employeeName':
      return [{ employeeId: sortOrder }]
    case 'organizationalUnit':
      return [{ employeeId: sortOrder }]
    case 'absenceType':
      return [{ typeRef: sortOrder }]
    case 'daysLeft':
      return [{ remaining: sortOrder }]
    default:
      return [{ employeeId: 'ASC' }]
  }
}

interface EntitlementEmployee {
  id: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  pictureThumbnail?: string | null
  employeePosition?: {
    organizationalUnit?: { id: string; name: string } | null
  } | null
}

interface EntitlementAbsenceType {
  id: string
  value: string
  parentEntryId?: string | null
}

interface DetailedEntitlementsResponse {
  snapshotRows: EntitlementUsageSnapshotRow[]
  summaryRows: EntitlementUsageSnapshotRow[]
}

const toSnapshotNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) {
    return 0
  }

  const numeric = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(numeric) ? numeric : 0
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
  const daysLabel = getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')
  const columns = useMemo<HubDataTableColumn<DetailedEntitlement>[]>(
    () => [
      {
        key: 'employee',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.summary_statistics.name',
          'Name'
        ),
        sortableField: 'employeeName',
        widthClassName: 'gba:w-1/4',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: entitlement => (
          <HubEmployeeCell
            name={entitlement.employeeName}
            pictureThumbnail={entitlement.pictureThumbnail}
            subtitle={entitlement.organizationalUnit}
          />
        )
      },
      {
        key: 'daysLeft',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:time_absence_hub.entitlements.days_left', 'Days Left'),
        sortableField: 'daysLeft',
        widthClassName: 'gba:w-1/4',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3',
        renderCell: entitlement => (
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
        )
      },
      {
        key: 'organizationalUnit',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.summary_statistics.org_unit',
          'Org Unit'
        ),
        sortableField: 'organizationalUnit',
        widthClassName: 'gba:w-1/4',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
        renderCell: entitlement => (
          <span className="gba:block gba:truncate" title={entitlement.organizationalUnit ?? undefined}>
            {entitlement.organizationalUnit}
          </span>
        )
      },
      {
        key: 'absenceType',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.summary_statistics.absence_type',
          'Absence Type'
        ),
        sortableField: 'absenceType',
        widthClassName: 'gba:w-1/4',
        headerClassName: 'gba:px-3',
        cellClassName: 'gba:px-2 gba:py-3 gba:text-sm',
        renderCell: entitlement => (
          <span className="gba:block gba:truncate" title={entitlement.absenceType}>
            {entitlement.absenceType}
          </span>
        )
      }
    ],
    [daysLabel]
  )

  return (
    <HubDataTable
      columns={columns}
      rows={entitlements}
      getRowKey={entitlement => entitlement.id}
      loading={loading}
      error={error}
      total={total}
      currentPage={currentPage}
      pageSize={pageSize}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={field => onSort(field as SortField)}
      onPaginationChange={onPaginationChange}
      dataTestIdPrefix="vacation-balance-details"
      rowLabel={getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.summary_statistics.pagination_entitlements',
        'entitlements'
      )}
      emptyMessage={getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_absence_hub.entitlements.table_empty',
        'No vacation balances match the current filters.'
      )}
    />
  )
}

const EntitlementsDetails: React.FC<EntitlementsDetailsProps> = ({
  accessToken,
  globalFilters,
  onOpenGlobalFilters,
  onNavigateBack
}) => {
  const graphQLClient = useGraphQLClient(accessToken)

  const [entitlements, setEntitlements] = useState<DetailedEntitlement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('employeeName')
  const [sortOrder, setSortOrder] = useState<SortOrder>('ASC')

  // Track initial load to prevent unnecessary re-renders (like AbsenceList)
  const initialLoadDone = useRef(false)

  // Local quick-search input on top of the main hub filters
  const [search, setSearch] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [aggregateStats, setAggregateStats] = useState<EntitlementsSummaryStats | null>(null)

  const getCurrentYearRange = () => {
    const currentYear = new Date().getFullYear()
    return {
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`
    }
  }

  const getEffectiveFilters = (): HubGlobalFilters => {
    const localSearch = search.trim()
    const filterSearch = globalFilters?.employeeQuery?.trim() ?? ''

    return {
      ...DEFAULT_HUB_FILTERS,
      ...globalFilters,
      employeeQuery: filterSearch || localSearch
    }
  }

  const hasEmployeeFilters = (filters: HubGlobalFilters): boolean =>
    filters.departmentIds.length > 0 ||
    filters.legalEntityIds.length > 0 ||
    filters.locationIds.length > 0 ||
    filters.managerIds.length > 0 ||
    Boolean(filters.employeeQuery)

  const resolveFilteredEmployeeIds = async (filters: HubGlobalFilters): Promise<string[] | null> => {
    if (!hasEmployeeFilters(filters)) {
      return null
    }

    const structureId = getCurrentActiveStructureId()
    if (!structureId) {
      return []
    }

    const response = await graphQLClient.request<{ Employee: FilteredEmployee[] }>(GET_FILTERED_EMPLOYEE_IDS, {
      where: buildEmployeeWhereForHubFilters(structureId, filters)
    })

    return (response.Employee ?? []).map(employee => employee.id)
  }

  const buildWhereConditions = (employeeIds: string[] | null) => {
    const currentYearRange = getCurrentYearRange()
    const conditions: Record<string, unknown>[] = [
      { employeeId: { _isNull: false } },
      { typeRef: { _eq: VACATION_TYPE_ID } },
      { periodStart: { _lte: currentYearRange.endDate } },
      {
        _or: [{ periodEnd: { _isNull: true } }, { periodEnd: { _gte: currentYearRange.startDate } }]
      }
    ]

    if (employeeIds) {
      conditions.push({ employeeId: { _in: employeeIds } })
    }

    return { _and: conditions }
  }

  const getDetailedEntitlementsQuery = () => {
    return `
      query GetDetailedEntitlements(
        $where: EntitlementUsageSnapshotViewBoolExp!
        $offset: Int!
        $limit: Int!
        $orderBy: [EntitlementUsageSnapshotViewOrderBy!]
        $summaryLimit: Int!
      ) {
        snapshotRows: EntitlementUsageSnapshotView(
          where: $where
          offset: $offset
          limit: $limit
          orderBy: $orderBy
        ) {
          employeeId
          typeRef
          totalEntitlement
          usedApproved
          usedPending
          remaining
          periodStart
          periodEnd
        }
        summaryRows: EntitlementUsageSnapshotView(where: $where, limit: $summaryLimit) {
          employeeId
          totalEntitlement
          usedApproved
          usedPending
          remaining
        }
      }
    `
  }

  const loadEmployeesById = async (rows: EntitlementUsageSnapshotRow[]): Promise<Map<string, EntitlementEmployee>> => {
    const employeeIds = Array.from(
      new Set(rows.map(row => row.employeeId).filter((employeeId): employeeId is string => Boolean(employeeId)))
    )

    if (employeeIds.length === 0) {
      return new Map()
    }

    const response = await graphQLClient.request<{ Employee: EntitlementEmployee[] }>(
      GET_ENTITLEMENT_EMPLOYEES_BY_IDS,
      {
        employeeIds
      }
    )

    return new Map((response.Employee ?? []).map(employee => [employee.id, employee]))
  }

  const loadTypesById = async (rows: EntitlementUsageSnapshotRow[]): Promise<Map<string, EntitlementAbsenceType>> => {
    const typeRefs = Array.from(
      new Set(rows.map(row => row.typeRef).filter((typeRef): typeRef is string => Boolean(typeRef)))
    )

    if (typeRefs.length === 0) {
      return new Map()
    }

    const response = await graphQLClient.request<{ CatalogEntry: EntitlementAbsenceType[] }>(
      GET_ENTITLEMENT_ABSENCE_TYPES_BY_IDS,
      { typeRefs }
    )

    return new Map((response.CatalogEntry ?? []).map(type => [type.id, type]))
  }

  const getAvailableDays = (row: EntitlementUsageSnapshotRow): number => {
    if (row.remaining !== null && row.remaining !== undefined) {
      return toSnapshotNumber(row.remaining)
    }

    return Math.max(
      0,
      toSnapshotNumber(row.totalEntitlement) - toSnapshotNumber(row.usedApproved) - toSnapshotNumber(row.usedPending)
    )
  }

  const buildRowId = (row: EntitlementUsageSnapshotRow): string =>
    [row.employeeId, row.typeRef, row.periodStart, row.periodEnd].filter(Boolean).join(':') || 'snapshot-row'

  const getEmployeeDisplayName = (employee: EntitlementEmployee | undefined): string => {
    if (!employee) {
      return 'Unknown Employee'
    }

    const fullName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
    return employee.displayName || fullName || 'Unknown Employee'
  }

  const mapSnapshotRowToDetailedEntitlement = (
    row: EntitlementUsageSnapshotRow,
    employeesById: Map<string, EntitlementEmployee>,
    typesById: Map<string, EntitlementAbsenceType>
  ): DetailedEntitlement => {
    const employee = row.employeeId ? employeesById.get(row.employeeId) : undefined
    const absenceType = row.typeRef ? typesById.get(row.typeRef) : undefined
    const total = toSnapshotNumber(row.totalEntitlement)

    return {
      id: buildRowId(row),
      employeeId: row.employeeId || '',
      employeeName: getEmployeeDisplayName(employee),
      pictureThumbnail: employee?.pictureThumbnail ?? null,
      organizationalUnitId: employee?.employeePosition?.organizationalUnit?.id || '',
      organizationalUnit: employee?.employeePosition?.organizationalUnit?.name || 'No Department',
      absenceType: absenceType?.value || row.typeRef || 'Unknown Type',
      absenceTypeId: row.typeRef || '',
      entitlement: total,
      used: toSnapshotNumber(row.usedApproved),
      available: getAvailableDays(row)
    }
  }

  const buildSummaryStats = (summaryRows: EntitlementUsageSnapshotRow[]): EntitlementsSummaryStats => {
    const employeeIds = new Set<string>()

    const totals = summaryRows.reduce(
      (acc, row) => {
        if (row.employeeId) {
          employeeIds.add(row.employeeId)
        }

        return {
          totalEntitlements: acc.totalEntitlements + toSnapshotNumber(row.totalEntitlement),
          totalUsed: acc.totalUsed + toSnapshotNumber(row.usedApproved),
          totalAvailable: acc.totalAvailable + getAvailableDays(row)
        }
      },
      { totalEntitlements: 0, totalUsed: 0, totalAvailable: 0 }
    )

    return {
      totalEmployees: employeeIds.size,
      ...totals
    }
  }

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
    globalFilters?.employeeQuery
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

      const effectiveFilters = getEffectiveFilters()
      const filteredEmployeeIds = await resolveFilteredEmployeeIds(effectiveFilters)
      if (filteredEmployeeIds?.length === 0) {
        setEntitlements([])
        setTotal(0)
        setAggregateStats(null)
        return
      }

      const whereConditions = buildWhereConditions(filteredEmployeeIds)
      const orderBy = buildEntitlementsOrderBy(sortField, sortOrder)
      const query = getDetailedEntitlementsQuery()
      const result = await graphQLClient.request<DetailedEntitlementsResponse>(query, {
        where: whereConditions,
        offset: (currentPage - 1) * pageSize,
        limit: pageSize,
        orderBy,
        summaryLimit: SNAPSHOT_SUMMARY_LIMIT
      })

      const employeesById = await loadEmployeesById(result.snapshotRows)
      const typesById = await loadTypesById(result.snapshotRows)
      const transformedData = result.snapshotRows.map(row =>
        mapSnapshotRowToDetailedEntitlement(row, employeesById, typesById)
      )

      setEntitlements(transformedData)
      setTotal(result.summaryRows?.length ?? 0)
      setAggregateStats(buildSummaryStats(result.summaryRows ?? []))
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
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')
    } else {
      setSortField(field)
      setSortOrder('ASC')
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
                'lowcoder:time_absence_hub.entitlements.vacation_balance_details_title',
                'Vacation Balance Details'
              )}
            </h1>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_absence_hub.entitlements.vacation_balance_details_description',
                'Current-year breakdown of employee vacation balances and usage'
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
              'lowcoder:time_absence_hub.entitlements.employee_vacation_balances',
              'Employee Vacation Balances'
            ),
            metadata: { count: total, isLoading: loading }
          }
        ]}
        currentSection="entitlements"
        searchValue={search}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'lowcoder:time_absence_hub.entitlements.search_balances_placeholder',
          'Search balances...'
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
