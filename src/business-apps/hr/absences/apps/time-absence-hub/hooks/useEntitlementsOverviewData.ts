import { useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_ENTITLEMENT_EMPLOYEES_BY_IDS,
  GET_ORG_ENTITLEMENTS_OVERVIEW,
  OrgEntitlementRow
} from '../queries/OrgEntitlementQueries'
import { HubGlobalFilters } from './useHubGlobalFilters'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'

export type EntitlementHealthFilter = 'all' | 'negative' | 'expiring' | 'expired'
export type EntitlementsOverviewSortField =
  | 'employeeName'
  | 'departmentName'
  | 'locationName'
  | 'typeName'
  | 'total'
  | 'approved'
  | 'pending'
  | 'available'
  | 'validFrom'
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

const buildWhere = (
  filters: HubGlobalFilters,
  derivedDateRange: { dateFrom: string; dateTo: string } | null,
  healthFilter: EntitlementHealthFilter,
  todayIso: string
): Record<string, any> => {
  const conditions: Record<string, any>[] = [
    { isDeleted: { _eq: false } },
    { employeeId: { _isNull: false } },
    { employee: { isDeleted: { _eq: false } } }
  ]

  if (filters.departmentIds.length > 0) {
    conditions.push({
      employee: {
        employeePosition: { organizationalUnitId: { _in: filters.departmentIds } }
      }
    })
  }
  if (filters.legalEntityIds.length > 0) {
    const includeMissingLegalEntity = filters.legalEntityIds.includes(LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)
    const definedLegalEntityIds = filters.legalEntityIds.filter(id => id !== LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)

    if (includeMissingLegalEntity && definedLegalEntityIds.length > 0) {
      conditions.push({
        employee: {
          employeePosition: {
            _or: [{ companyId: { _in: definedLegalEntityIds } }, { companyId: { _isNull: true } }]
          }
        }
      })
    } else if (includeMissingLegalEntity) {
      conditions.push({
        employee: {
          employeePosition: { companyId: { _isNull: true } }
        }
      })
    } else {
      conditions.push({
        employee: {
          employeePosition: { companyId: { _in: definedLegalEntityIds } }
        }
      })
    }
  }
  if (filters.locationIds.length > 0) {
    conditions.push({
      employee: {
        employeePosition: { siteLocationId: { _in: filters.locationIds } }
      }
    })
  }
  if (filters.managerIds.length > 0) {
    conditions.push({
      employee: {
        employeePosition: { supervisorEmployeeId: { _in: filters.managerIds } }
      }
    })
  }
  if (filters.absenceTypeIds.length > 0) {
    conditions.push({ typeRef: { _in: filters.absenceTypeIds } })
  }
  if (derivedDateRange) {
    conditions.push({
      _and: [
        { validFrom: { _lte: derivedDateRange.dateTo } },
        {
          _or: [{ validTo: { _isNull: true } }, { validTo: { _gte: derivedDateRange.dateFrom } }]
        }
      ]
    })
  }
  if (filters.employeeQuery) {
    const like = `%${filters.employeeQuery}%`
    conditions.push({
      employee: {
        _or: [{ firstName: { _ilike: like } }, { lastName: { _ilike: like } }, { displayName: { _ilike: like } }]
      }
    })
  }
  if (healthFilter === 'negative') {
    conditions.push({ available: { _lt: 0 } })
  }
  if (healthFilter === 'expired') {
    conditions.push({ validTo: { _lt: todayIso } })
  }
  if (healthFilter === 'expiring') {
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)
    conditions.push({ validTo: { _gte: todayIso, _lte: in30Days.toISOString().slice(0, 10) } })
  }

  return conditions.length > 0 ? { _and: conditions } : {}
}

const buildOrderBy = (
  sortField: EntitlementsOverviewSortField,
  sortOrder: EntitlementsOverviewSortOrder
): Record<string, unknown>[] => {
  switch (sortField) {
    case 'employeeName':
      return [{ employee: { firstName: sortOrder } }, { employee: { lastName: sortOrder } }]
    case 'departmentName':
      return [{ employee: { employeePosition: { organizationalUnit: { name: sortOrder } } } }]
    case 'locationName':
      return [{ employee: { employeePosition: { siteLocation: { name: sortOrder } } } }]
    case 'typeName':
      return [{ type: { value: sortOrder } }]
    case 'total':
      return [{ total: sortOrder }]
    case 'approved':
      return [{ approved: sortOrder }]
    case 'pending':
      return [{ pending: sortOrder }]
    case 'available':
      return [{ available: sortOrder }]
    case 'validFrom':
    default:
      return [{ validFrom: sortOrder }]
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
    isLoading: false,
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
      setState({ rows: [], total: 0, isLoading: false, error: null })
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
        const where = buildWhere(filters, derivedDateRange, healthFilter, todayIso)
        const orderBy = buildOrderBy(sortField, sortOrder)
        const response = await graphqlClient.request<{
          EmployeeAbsenceEntitlement: OrgEntitlementRow[]
          EmployeeAbsenceEntitlementAggregate: { aggregate: { count: number } }
        }>(GET_ORG_ENTITLEMENTS_OVERVIEW, {
          where,
          offset: (page - 1) * pageSize,
          limit: pageSize,
          orderBy
        })

        if (cancelled) {
          return
        }

        const rows = await hydrateMissingEmployees(response.EmployeeAbsenceEntitlement ?? [], graphqlClient)

        if (cancelled) {
          return
        }

        hasLoadedOnceRef.current = true
        setState({
          rows,
          total: response.EmployeeAbsenceEntitlementAggregate?.aggregate?.count ?? 0,
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
