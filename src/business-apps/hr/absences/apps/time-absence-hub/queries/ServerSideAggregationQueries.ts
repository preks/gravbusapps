import { getDateFilters } from './DashboardQueries'
import type { HubGlobalFilters } from '../hooks/useHubGlobalFilters'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'

type DashboardDateRange = { dateFrom: string; dateTo: string } | null | undefined

const quote = (value: string): string => JSON.stringify(value)

const list = (values: string[]): string => `[${values.map(quote).join(', ')}]`

const toStartIso = (date: string): string => `${date}T00:00:00.000Z`

const toEndIso = (date: string): string => `${date}T23:59:59.999Z`

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

const getResolvedDateFilters = (timeFilter: string, dateRange?: DashboardDateRange) => {
  if (dateRange?.dateFrom && dateRange?.dateTo) {
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
    const includeMissingLegalEntity = filters.legalEntityIds.includes(LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)
    const definedLegalEntityIds = filters.legalEntityIds.filter(id => id !== LEGAL_ENTITY_NOT_DEFINED_FILTER_ID)

    if (includeMissingLegalEntity && definedLegalEntityIds.length > 0) {
      clauses.push(
        `{ _or: [{ companyId: { _in: ${list(definedLegalEntityIds)} } }, { companyId: { _isNull: true } }] }`
      )
    } else if (includeMissingLegalEntity) {
      clauses.push('{ companyId: { _isNull: true } }')
    } else {
      clauses.push(`{ companyId: { _in: ${list(definedLegalEntityIds)} } }`)
    }
  }
  if (filters.locationIds.length > 0) {
    clauses.push(`{ siteLocationId: { _in: ${list(filters.locationIds)} } }`)
  }
  if (filters.managerIds.length > 0) {
    clauses.push(`{ supervisorEmployeeId: { _in: ${list(filters.managerIds)} } }`)
  }
  return clauses
}

const buildEmployeeFilterClauses = (filters?: HubGlobalFilters): string[] => {
  if (!filters) return []

  const clauses: string[] = []
  const employeePositionClauses = buildEmployeePositionClauses(filters)
  if (employeePositionClauses.length > 0) {
    clauses.push(`{ employeePosition: { _and: [${employeePositionClauses.join(', ')}] } }`)
  }
  if (filters.employeeQuery) {
    if (isUuid(filters.employeeQuery)) {
      clauses.push(`{ id: { _eq: ${quote(filters.employeeQuery)} } }`)
    } else {
      const like = quote(`%${filters.employeeQuery}%`)
      clauses.push(
        `{ _or: [{ firstName: { _ilike: ${like} } }, { lastName: { _ilike: ${like} } }, { displayName: { _ilike: ${like} } }] }`
      )
    }
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

const hasEmployeeFilters = (filters?: HubGlobalFilters): boolean => {
  if (!filters) return false
  return (
    filters.departmentIds.length > 0 ||
    filters.locationIds.length > 0 ||
    filters.legalEntityIds.length > 0 ||
    filters.managerIds.length > 0 ||
    !!filters.employeeQuery
  )
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

const buildActiveAbsenceWhere = (baseWhere: string): string => `{
  _and: [
    ${baseWhere},
    { status: { _nin: ["REJECTED", "CANCELLED"] } }
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
  const activeAbsenceWhere = buildActiveAbsenceWhere(baseWhere)

  return `
  query GetKPIAggregations {

    totalAbsences: EmployeeAbsenceAggregate(where: ${baseWhere}) {
      aggregate {
        count
        sum { effectiveDays }
        avg { effectiveDays }
      }
    }

    activeAbsences: EmployeeAbsenceAggregate(where: ${activeAbsenceWhere}) {
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

  if (dateFilters?.startDate && dateFilters?.endDate) {
    if (vacationGroupId) {
      entitlementWhere = `{
        _and: [
          { isDeleted: { _eq: false } },
          { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
          {
            _and: [
              { validFrom: { _lte: "${dateFilters.endDate}" } },
              {
                _or: [
                  { validTo: { _isNull: true } },
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
            _and: [
              { validFrom: { _lte: "${dateFilters.endDate}" } },
              {
                _or: [
                  { validTo: { _isNull: true } },
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

export const GET_CURRENT_SALARIES_BY_EMPLOYEE_IDS = `
  query GetCurrentSalariesByEmployeeIds($employeeIds: [uuid!]!, $today: date!) {
    currentSalaries: EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
        startDate: { _lte: $today }
      },
      orderBy: [{ employeeId: ASC }, { startDate: DESC_NULLS_LAST }, { createdAt: DESC }],
      limit: 2000
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      startDate
      endDate
      currencyRef
      currency {
        id
        code
        value
      }
    }
  }
`

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
  const activeAbsenceWhere = buildActiveAbsenceWhere(baseWhere)

  const currentYear = new Date().getFullYear()
  const currentYearStart = `${currentYear}-01-01`
  const currentYearEnd = `${currentYear}-12-31`
  const today = new Date().toISOString().slice(0, 10)
  // Always fetch the snapshot view so Time & Absence parity with My Absences is maintained.
  // Population-filter scoping is applied client-side using allowedEmployeeIds.
  const includeEntitlementSnapshot = true
  let vacationWhereCondition = ''
  const entitlementFilterClauses = buildEmployeeNestedFilterClauses(filters)
    .map(clause => `, ${clause}`)
    .join('')
  // Salary scoping happens client-side via the liability employee set. Filtering on the
  // server by name was unreliable (ILIKE on display names misses casing/accents/extra
  // spaces), so we fetch all active salaries for employees with a position.
  const salaryWhereCondition = `where: {
    _and: [
      { isDeleted: { _eq: false } },
      {
        _or: [
          { requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" } },
          { requestStatus: { _isNull: true } }
        ]
      },
      { startDate: { _lte: "${today}" } },
      {
        _or: [
          { endDate: { _isNull: true } },
          { endDate: { _gte: "${today}" } }
        ]
      },
      { employee: { employeePosition: { id: { _isNull: false } } } }
    ]
  }`
  if (vacationGroupId) {
    vacationWhereCondition = `
    where: {
      _and: [
        { isDeleted: { _eq: false } },
        { validFrom: { _lte: "${currentYearEnd}" } },
        {
          _or: [
            { validTo: { _isNull: true } },
            { validTo: { _gte: "${currentYearStart}" } }
          ]
        },
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

    activeAbsences: EmployeeAbsenceAggregate(where: ${activeAbsenceWhere}) {
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
      hasEmployeeFilters(filters)
        ? `
    filteredEmployees: EmployeePosition(where: ${buildEmployeePositionWhere(filters)}, limit: 5000) {
      employee {
        id
      }
    }
    `
        : ''
    }

    scopedEmployeePositions: EmployeePosition(where: ${buildEmployeePositionWhere(filters)}, limit: 5000) {
      employee {
        id
      }
      companyId
      company {
        currencyRef
        currency {
          id
          code
          value
        }
      }
    }

    currentSalaries: EmployeeSalary(${salaryWhereCondition}, orderBy: [{ employeeId: ASC }, { startDate: DESC_NULLS_LAST }, { createdAt: DESC }], limit: 5000) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      startDate
      endDate
      currencyRef
      currency {
        id
        code
        value
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
      available
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
