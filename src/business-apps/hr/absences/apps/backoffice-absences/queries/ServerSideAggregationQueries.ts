import { getDateFilters } from './DashboardQueries'

const buildBaseWhere = (startIso: string, endIso: string): string => `{
  _and: [
    { isDeleted: { _eq: false } },
    { startDate: { _lte: "${endIso}" } },
    { endDate: { _gte: "${startIso}" } }
  ]
}`

export const getKPIAggregationsQuery = (timeFilter: string) => {
  const dateFilters = getDateFilters(timeFilter)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate)

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

export const getVacationEntitlementsAggregationsQuery = (timeFilter: string, vacationGroupId?: string) => {
  const dateFilters = getDateFilters(timeFilter)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  let entitlementWhere = `{
    _and: [
      { isDeleted: { _eq: false } },
      { employee: { employeePosition: { id: { _isNull: false } } } }
    ]
  }`

  if (vacationGroupId) {
    entitlementWhere = `{
      _and: [
        { isDeleted: { _eq: false } },
        { type: { parentEntryId: { _eq: "${vacationGroupId}" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
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

export const getHybridDataQuery = (timeFilter: string) => {
  const dateFilters = getDateFilters(timeFilter)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const absenceWhere = `where: ${buildBaseWhere(dateFilters.startDate, dateFilters.endDate)}`

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

export const getCompleteAggregationsQuery = (timeFilter: string, vacationGroupId: string | null = null): string => {
  const dateFilters = getDateFilters(timeFilter)

  if (!dateFilters) {
    throw new Error(`Invalid time filter: ${timeFilter}`)
  }

  const baseWhere = buildBaseWhere(dateFilters.startDate, dateFilters.endDate)

  const currentYear = new Date().getFullYear()
  const currentYearStart = `${currentYear}-01-01`
  const currentYearEnd = `${currentYear}-12-31`
  let vacationWhereCondition = ''
  if (vacationGroupId) {
    vacationWhereCondition = `
    where: {
      _and: [
        { isDeleted: { _eq: false } },
        { validFrom: { _lte: "${currentYearEnd}" } },
        { validTo: { _gte: "${currentYearStart}" } },
        { type: { id: { _eq: "AbsenceType:v1:A001" } } },
        { employee: { employeePosition: { id: { _isNull: false } } } }
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

    entitlementSnapshot: entitlement_usage_snapshot_view(
      where: {
        period_start: { _lte: "${currentYearEnd}" }
        period_end: { _gte: "${currentYearStart}" }
        type_ref: { _eq: "AbsenceType:v1:A001" }
      }
    ) {
      employee_id
      type_ref
      total_entitlement
      used_approved
      used_pending
      remaining
      period_start
      period_end
    }

    
    activeEmployeesCount: EmployeePositionAggregate(where: { id: { _isNull: false } }) {
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
