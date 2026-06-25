import { useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  EntitlementUsageSnapshotRow,
  GET_ENTITLEMENT_ABSENCE_TYPES_BY_IDS,
  GET_ENTITLEMENT_EMPLOYEES_BY_IDS,
  GET_ORG_ENTITLEMENTS_OVERVIEW,
  OrgEntitlementRow,
  mapSnapshotRowToOrgEntitlementRow
} from '../queries/OrgEntitlementQueries'
import { GET_FILTERED_EMPLOYEE_IDS, type FilteredEmployee } from '../queries/OrgAttendanceQueries'
import { HubGlobalFilters } from './useHubGlobalFilters'
import { buildEmployeeWhereForHubFilters } from './useOrgAttendanceData'

export type EntitlementHealthFilter = 'all' | 'negative' | 'expiring' | 'expired'
export type EntitlementsOverviewSortField = 'total' | 'approved' | 'pending' | 'available' | 'validFrom'
export type EntitlementsOverviewSortOrder = 'ASC' | 'DESC'

export interface UseEntitlementsOverviewDataParams {
  accessToken: string
  filters: HubGlobalFilters
  derivedDateRange: { dateFrom: string; dateTo: string } | null
  healthFilter: EntitlementHealthFilter
  page: number
  pageSize: number
  sortField: EntitlementsOverviewSortField
  sortOrder: EntitlementsOverviewSortOrder
}

export interface UseEntitlementsOverviewDataReturn {
  rows: OrgEntitlementRow[]
  total: number
  isLoading: boolean
  error: string | null
}

type EntitlementEmployee = NonNullable<OrgEntitlementRow['employee']>
type EntitlementType = NonNullable<OrgEntitlementRow['type']>

const SNAPSHOT_TOTAL_LIMIT = 5000
const MISSING_ACCESS_TOKEN_ERROR = 'Access token missing'

const hydrateMissingEmployees = async (
  rows: OrgEntitlementRow[],
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<OrgEntitlementRow[]> => {
  const missingEmployeeIds = Array.from(
    new Set(rows.filter(row => row.employeeId && !row.employee).map(row => row.employeeId as string))
  )

  if (missingEmployeeIds.length === 0) {
    return rows
  }

  const response = await graphqlClient.request<{ Employee: EntitlementEmployee[] }>(GET_ENTITLEMENT_EMPLOYEES_BY_IDS, {
    employeeIds: missingEmployeeIds
  })
  const employeesById = new Map((response.Employee ?? []).map(employee => [employee.id, employee]))

  return rows.map(row => {
    if (row.employee || !row.employeeId) {
      return row
    }

    return {
      ...row,
      employee: employeesById.get(row.employeeId) ?? null
    }
  })
}

const hydrateTypes = async (
  rows: OrgEntitlementRow[],
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<OrgEntitlementRow[]> => {
  const typeRefs = Array.from(
    new Set(rows.map(row => row.typeRef).filter((typeRef): typeRef is string => Boolean(typeRef)))
  )

  if (typeRefs.length === 0) {
    return rows
  }

  const response = await graphqlClient.request<{ CatalogEntry: EntitlementType[] }>(
    GET_ENTITLEMENT_ABSENCE_TYPES_BY_IDS,
    { typeRefs }
  )
  const typesById = new Map((response.CatalogEntry ?? []).map(type => [type.id, type]))

  return rows.map(row => {
    if (!row.typeRef) {
      return row
    }

    return {
      ...row,
      type: typesById.get(row.typeRef) ?? row.type ?? null
    }
  })
}

const hasPopulationFilters = (filters: HubGlobalFilters): boolean =>
  filters.departmentIds.length > 0 ||
  filters.legalEntityIds.length > 0 ||
  filters.locationIds.length > 0 ||
  filters.managerIds.length > 0 ||
  Boolean(filters.employeeQuery)

const resolveFilteredEmployeeIds = async (
  filters: HubGlobalFilters,
  graphqlClient: ReturnType<typeof useGraphQLClient>
): Promise<string[] | null> => {
  if (!hasPopulationFilters(filters)) {
    return null
  }

  const structureId = getCurrentActiveStructureId()
  if (!structureId) {
    return []
  }

  const response = await graphqlClient.request<{ Employee: FilteredEmployee[] }>(GET_FILTERED_EMPLOYEE_IDS, {
    where: buildEmployeeWhereForHubFilters(structureId, filters)
  })

  return (response.Employee ?? []).map(employee => employee.id)
}

const buildWhere = (
  filters: HubGlobalFilters,
  derivedDateRange: { dateFrom: string; dateTo: string } | null,
  healthFilter: EntitlementHealthFilter,
  todayIso: string,
  employeeIds: string[] | null
): Record<string, any> => {
  const conditions: Record<string, any>[] = [{ employeeId: { _isNull: false } }, { typeRef: { _isNull: false } }]

  if (filters.absenceTypeIds.length > 0) {
    conditions.push({ typeRef: { _in: filters.absenceTypeIds } })
  }
  if (employeeIds) {
    conditions.push({ employeeId: { _in: employeeIds } })
  }
  if (derivedDateRange) {
    conditions.push({
      _and: [
        { periodStart: { _lte: derivedDateRange.dateTo } },
        {
          _or: [{ periodEnd: { _isNull: true } }, { periodEnd: { _gte: derivedDateRange.dateFrom } }]
        }
      ]
    })
  }
  if (healthFilter === 'negative') {
    conditions.push({ remaining: { _lt: 0 } })
  }
  if (healthFilter === 'expired') {
    conditions.push({ periodEnd: { _lt: todayIso } })
  }
  if (healthFilter === 'expiring') {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    conditions.push({ periodEnd: { _gte: todayIso, _lte: in30Days.toISOString().slice(0, 10) } })
  }

  return conditions.length > 0 ? { _and: conditions } : {}
}

const buildOrderBy = (
  sortField: EntitlementsOverviewSortField,
  sortOrder: EntitlementsOverviewSortOrder
): Record<string, unknown>[] => {
  switch (sortField) {
    case 'total':
      return [{ totalEntitlement: sortOrder }]
    case 'approved':
      return [{ usedApproved: sortOrder }]
    case 'pending':
      return [{ usedPending: sortOrder }]
    case 'available':
      return [{ remaining: sortOrder }]
    case 'validFrom':
    default:
      return [{ periodStart: sortOrder }]
  }
}

export const useEntitlementsOverviewData = ({
  accessToken,
  filters,
  derivedDateRange,
  healthFilter,
  page,
  pageSize,
  sortField,
  sortOrder
}: UseEntitlementsOverviewDataParams): UseEntitlementsOverviewDataReturn => {
  const [state, setState] = useState<UseEntitlementsOverviewDataReturn>({
    rows: [],
    total: 0,
    isLoading: true,
    error: null
  })
  const graphqlClient = useGraphQLClient(accessToken)
  const hasLoadedOnceRef = useRef(false)

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const variablesKey = useMemo(
    () =>
      JSON.stringify({
        d: filters.departmentIds,
        l: filters.locationIds,
        le: filters.legalEntityIds,
        m: filters.managerIds,
        t: filters.absenceTypeIds,
        q: filters.employeeQuery,
        from: derivedDateRange?.dateFrom,
        to: derivedDateRange?.dateTo,
        h: healthFilter,
        page,
        pageSize,
        sortField,
        sortOrder
      }),
    [filters, derivedDateRange, healthFilter, page, pageSize, sortField, sortOrder]
  )

  useEffect(() => {
    if (!accessToken) {
      hasLoadedOnceRef.current = false
      setState({ rows: [], total: 0, isLoading: false, error: MISSING_ACCESS_TOKEN_ERROR })
      return
    }

    let cancelled = false
    setState(prev => ({
      ...prev,
      isLoading: hasLoadedOnceRef.current ? prev.isLoading : true,
      error: null
    }))

    const fetchOverview = async () => {
      try {
        const employeeIds = await resolveFilteredEmployeeIds(filters, graphqlClient)
        if (cancelled) {
          return
        }
        if (employeeIds?.length === 0) {
          hasLoadedOnceRef.current = true
          setState({ rows: [], total: 0, isLoading: false, error: null })
          return
        }

        const where = buildWhere(filters, derivedDateRange, healthFilter, todayIso, employeeIds)
        const orderBy = buildOrderBy(sortField, sortOrder)
        const response = await graphqlClient.request<{
          snapshotRows: EntitlementUsageSnapshotRow[]
          totalRows: EntitlementUsageSnapshotRow[]
        }>(GET_ORG_ENTITLEMENTS_OVERVIEW, {
          where,
          offset: (page - 1) * pageSize,
          limit: pageSize,
          orderBy,
          totalLimit: SNAPSHOT_TOTAL_LIMIT
        })

        if (cancelled) {
          return
        }

        const snapshotRows = (response.snapshotRows ?? []).map(mapSnapshotRowToOrgEntitlementRow)
        const rowsWithEmployees = await hydrateMissingEmployees(snapshotRows, graphqlClient)
        const rows = await hydrateTypes(rowsWithEmployees, graphqlClient)

        if (cancelled) {
          return
        }

        hasLoadedOnceRef.current = true
        setState({
          rows,
          total: response.totalRows?.length ?? 0,
          isLoading: false,
          error: null
        })
      } catch (err) {
        if (cancelled) {
          return
        }
        const message = err instanceof Error ? err.message : 'Failed to load entitlements'
        hasLoadedOnceRef.current = true
        setState(prev => ({
          rows: prev.rows,
          total: prev.total,
          isLoading: false,
          error: message
        }))
      }
    }

    fetchOverview()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, variablesKey, todayIso])

  return state
}
