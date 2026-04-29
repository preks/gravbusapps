import { getDateFilters } from './DashboardQueries'
import type { HubGlobalFilters } from '../hooks/useHubGlobalFilters'

type DashboardDateRange = { dateFrom: string; dateTo: string } | null | undefined

const quote = (value: string): string => JSON.stringify(value)

const list = (values: string[]): string => `[${values.map(quote).join(', ')}]`

const toStartIso = (date: string): string => `${date}T00:00:00.000Z`

const toEndIso = (date: string): string => `${date}T23:59:59.999Z`

const getResolvedDateFilters = (timeFilter: string, dateRange?: DashboardDateRange) => {
  if (dateRange?.dateFrom && dateRange.dateTo) {
    return {
      startDate: toStartIso(dateRange.dateFrom),
      endDate: toEndIso(dateRange.dateTo)
    }
  }

  return getDateFilters(timeFilter)
}

const buildEmployeePositionClauses = (filters?: HubGlobalFilters): string[] => {
  if (!filters) return []

  const clauses: string[] = []
  if (filters.departmentIds.length > 0) {
    clauses.push(`{ organizationalUnitId: { _in: ${list(filters.departmentIds)} } }`)
  }
  if (filters.legalEntityIds.length > 0) {
    clauses.push(`{ companyId: { _in: ${list(filters.legalEntityIds)} } }`)
  }
  if (filters.locationIds.length > 0) {
    clauses.push(`{ siteLocationId: { _in: ${list(filters.locationIds)} } }`)
  }
  if (filters.managerIds.length > 0) {
    clauses.push(`{ supervisorEmployeeId: { _in: ${list(filters.managerIds)} } }`)
  }
  return clauses
}

const hasPopulationFilters = (filters?: HubGlobalFilters): boolean =>
  Boolean(
    filters &&
      (filters.departmentIds.length > 0 ||
        filters.legalEntityIds.length > 0 ||
        filters.locationIds.length > 0 ||
        filters.managerIds.length > 0 ||
        Boolean(filters.employeeQuery))
  )

const buildEmployeeFilterClauses = (filters?: HubGlobalFilters): string[] => {
  if (!filters) return []

  const clauses: string[] = []
  const employeePositionClauses = buildEmployeePositionClauses(filters)
  if (employeePositionClauses.length > 0) {
    clauses.push(`{ employeePosition: { _and: [${employeePositionClauses.join(', ')}] } }`)
  }
  if (filters.employeeQuery) {
    const like = quote(`%${filters.employeeQuery}%`)
    clauses.push(
      `{ _or: [{ firstName: { _ilike: ${like} } }, { lastName: { _ilike: ${like} } }, { displayName: { _ilike: ${like} } }] }`
    )
  }
  return clauses
}

const buildEmployeeAbsenceFilterClauses = (filters?: HubGlobalFilters): string[] => {
  if (!filters) return []

  const clauses: string[] = []
  const employeeClauses = buildEmployeeFilterClauses(filters)
  if (employeeClauses.length > 0) {
    clauses.push(`{ employee: { _and: [${employeeClauses.join(', ')}] } }`)
  }
  if (filters.absenceTypeIds.length > 0) {
    clauses.push(`{ typeRef: { _in: ${list(filters.absenceTypeIds)} } }`)
  }
  if (filters.statusIds.length > 0) {
    clauses.push(`{ status: { _in: ${list(filters.statusIds)} } }`)
  }
  return clauses
}

const buildEmployeeNestedFilterClauses = (filters?: HubGlobalFilters): string[] => {
  const employeeClauses = buildEmployeeFilterClauses(filters)
  return employeeClauses.length > 0 ? [`{ employee: { _and: [${employeeClauses.join(', ')}] } }`] : []
}

const buildEmployeePositionWhere = (filters?: HubGlobalFilters): string => {
  const clauses = [`{ id: { _isNull: false } }`, ...buildEmployeePositionClauses(filters)]
  const employeeClauses = filters?.employeeQuery
    ? buildEmployeeFilterClauses(filters).filter(clause => !clause.includes('employeePosition'))
    : []

  if (employeeClauses.length > 0) {
    clauses.push(`{ employee: { _and: [${employeeClauses.join(', ')}] } }`)
  }

  return `{ _and: [${clauses.join(', ')}] }`
}

const buildBaseWhere = (startIso: string, endIso: string, filters?: HubGlobalFilters): string => `{
  _and: [
    { isDeleted: { _eq: false } },
    { startDate: { _lte: "${endIso}" } },
    { endDate: { _gte: "${startIso}" } }
    ${buildEmployeeAbsenceFilterClauses(filters)
      .map(clause => `, ${clause}`)
      .join('')}
  ]
}`

export const getKPIAggregationsQuery = (
  timeFilter: string,
  filters?: HubGlobalFilters,
  dateRange?: DashboardDateRange
) => {
  const dateFilters = getResolvedDateFilters(timeFilter, dateRange)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate, filters)

  return `
  query GetKPIAggregations {

    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays }
        avg { effectiveDays }
      }
    }
    

    approvedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "APPROVED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    pendingAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "PENDING" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    rejectedAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "REJECTED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    cancelledAbsences: EmployeeAbsenceAggregate(where: { _and: [${baseWhere}, { status: { _eq: "CANCELLED" } }] }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
  }`
}

export const getVacationEntitlementsAggregationsQuery = (
  timeFilter: string,
  vacationGroupId?: string,
  filters?: HubGlobalFilters,
  dateRange?: DashboardDateRange
) => {
  const dateFilters = getResolvedDateFilters(timeFilter, dateRange)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const entitlementFilterClauses = buildEmployeeNestedFilterClauses(filters)
    .map(clause => `, ${clause}`)
    .join('')

  let entitlementWhere = `{
    _and: [
      { isDeleted: { _eq: false } },
      { employee: { employeePosition: { id: { _isNull: false } } } }
      ${entitlementFilterClauses}
    ]
  }`

  if (vacationGroupId) {
    entitlementWhere = `{
      _and: [
        { isDeleted: { _eq: false } },
        { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
        ${entitlementFilterClauses}
      ]
    }`
  }

  if (dateFilters && dateFilters.startDate && dateFilters.endDate) {
    if (vacationGroupId) {
      entitlementWhere = `{
        _and: [
          { isDeleted: { _eq: false } },
          { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
          {
            _or: [
              { validFrom: { _gte: "${dateFilters.startDate}" } },
              { validTo: { _gte: "${dateFilters.startDate}" } },
              { 
                _and: [
                  { validFrom: { _lte: "${dateFilters.endDate}" } },
                  { validTo: { _gte: "${dateFilters.startDate}" } }
                ]
              }
            ]
          },
          { employee: { employeePosition: { id: { _isNull: false } } } }
          ${entitlementFilterClauses}
        ]
      }`
    } else {
      entitlementWhere = `{
        _and: [
          { isDeleted: { _eq: false } },
          {
            _or: [
              { validFrom: { _gte: "${dateFilters.startDate}" } },
              { validTo: { _gte: "${dateFilters.startDate}" } },
              { 
                _and: [
                  { validFrom: { _lte: "${dateFilters.endDate}" } },
                  { validTo: { _gte: "${dateFilters.startDate}" } }
                ]
              }
            ]
          },
          { employee: { employeePosition: { id: { _isNull: false } } } }
          ${entitlementFilterClauses}
        ]
      }`
    }
  }

  return `
  query GetVacationEntitlementsAggregations {
    vacationEntitlements: EmployeeAbsenceEntitlementAggregate(where: ${entitlementWhere}) {
      aggregate {
        count
        sum { total approved pending available }
        avg { total approved pending available }
      }
    }
  }`
}

export const getHybridDataQuery = (timeFilter: string, filters?: HubGlobalFilters, dateRange?: DashboardDateRange) => {
  const dateFilters = getResolvedDateFilters(timeFilter, dateRange)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const absenceWhere = `where: ${buildBaseWhere(dateFilters.startDate, dateFilters.endDate, filters)}`

  return `
  query GetHybridData {
    employeeAbsences: EmployeeAbsence(${absenceWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
      createdAt
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
      }
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
    }
  }`
}

export const getCompleteAggregationsQuery = (
  timeFilter: string,
  vacationGroupId: string | null = null,
  filters?: HubGlobalFilters,
  dateRange?: DashboardDateRange
): string => {
  const dateFilters = getResolvedDateFilters(timeFilter, dateRange)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate, filters)

  const currentYear = new Date().getFullYear()
  const currentYearStart = `${currentYear}-01-01`
  const currentYearEnd = `${currentYear}-12-31`
  const includeEntitlementSnapshot = !hasPopulationFilters(filters)
  let vacationWhereCondition = ''
  const entitlementFilterClauses = buildEmployeeNestedFilterClauses(filters)
    .map(clause => `, ${clause}`)
    .join('')
  if (vacationGroupId) {
    vacationWhereCondition = `
    where: {
      _and: [
        { isDeleted: { _eq: false } },
        { validFrom: { _lte: "${currentYearEnd}" } },
        { validTo: { _gte: "${currentYearStart}" } },
        { type: { id: { _eq: "AbsenceType:v1:A001" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
        ${entitlementFilterClauses}
      ]
    }`
  }

  return `
  query GetCompleteAggregations {
    
    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays }
        avg { effectiveDays }
      }
    }
    
    
    approvedAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "APPROVED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    pendingAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "PENDING" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    rejectedAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "REJECTED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }
    
    cancelledAbsences: EmployeeAbsenceAggregate(where: { 
      _and: [${baseWhere}, { status: { _eq: "CANCELLED" } }] 
    }) {
      aggregate { 
        count 
        sum { effectiveDays } 
      }
    }

    
    ${
      vacationGroupId
        ? `
    vacationEntitlements: EmployeeAbsenceEntitlementAggregate(${vacationWhereCondition}) {
      aggregate {
        count
        sum { total }
        sum { approved }
        sum { pending }
        avg { total }
        avg { approved }
        avg { pending }
      }
    }
    `
        : ''
    }

    ${
      includeEntitlementSnapshot
        ? `
    entitlementSnapshot: EntitlementUsageSnapshotView(
      where: {
        periodStart: { _lte: "${currentYearEnd}" }
        periodEnd: { _gte: "${currentYearStart}" }
        typeRef: { _eq: "AbsenceType:v1:A001" }
      }
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
    `
        : ''
    }

    
    activeEmployeesCount: EmployeePositionAggregate(where: ${buildEmployeePositionWhere(filters)}) {
      aggregate {
        count
      }
    }

    
    ${
      vacationGroupId
        ? `
    vacationAbsenceBalance: EmployeeAbsenceAggregate(where: {
      _and: [
        { isDeleted: { _eq: false } },
        { type: { id: { _eq: "AbsenceType:v1:A001" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } },
        { status: { _nin: ["APPROVED", "REJECTED"] } }
        ${buildEmployeeAbsenceFilterClauses(filters)
          .map(clause => `, ${clause}`)
          .join('')}
      ]
    }) {
      aggregate {
        sum { balance }
      }
    }
    `
        : ''
    }

    
    employeeAbsences: EmployeeAbsence(where: ${baseWhere}) {
      id
      status
      startDate
      endDate
      effectiveDays
      createdAt
      type {
        objectValue
        translations {
          localeCode
          value
        }
        id
        value
        parentEntryId
        parentEntry {
          objectValue
          translations {
            localeCode
            value
          }
          id
          value
        }
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }

    ${
      vacationGroupId
        ? `
    EmployeeAbsenceEntitlement(${vacationWhereCondition}) {
      id
      total
      approved
      pending
      validFrom
      validTo
      type {
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
        }
      }
    }
    `
        : ''
    }
  }
`
}

export const getOptimizedDashboardQuery = getCompleteAggregationsQuery

export const getDepartmentStatsAggregation = getHybridDataQuery
export const getMonthlyTrendsAggregation = getHybridDataQuery
export const getEnhancedVacationMetrics = (timeFilter: string, vacationGroupId?: string) =>
  getVacationEntitlementsAggregationsQuery(timeFilter, vacationGroupId)
export const getOptimizedAbsenceData = getKPIAggregationsQuery
