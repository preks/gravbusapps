export const GET_EMPLOYEE_ABSENCES = `
    query GetEmployeeAbsences(
        $where: EmployeeAbsenceBoolExp!
        $orderBy: [EmployeeAbsenceOrderBy!]
        $limit: Int!
        $offset: Int!
        $activeUserLocale: String!
    ) {
        EmployeeAbsence(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
            description
            id
            endDate
            startDate
            status
            typeRef
            type {
                id
                value   
                parentEntryId
                objectValue
                translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                    localeCode
                    value
                }
            }
            workingDays
            workingHours
            calendarDays
            effectiveDays
            createdAt
            employee {
                id
                firstName
                lastName
            }
        }
        EmployeeAbsenceAggregate(where: $where) {
            aggregate {
                count
            }
        }
    }`

// New: Calendar view (month grid)
export const GET_EMPLOYEE_CALENDAR_DAYS = `
  query CalendarDays($employeeId: uuid!, $from: date!, $to: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ dayDate: ASC }, { typeRef: ASC }]
    ) {
      dayDate
      typeRef
      status
      employeeAbsenceId
    }
  }
`

// New: Daily facts for distributions (by type)
export const GET_ABSENCE_DAILY_FACTS_BY_TYPE = `
  query AbsenceByType($employeeId: uuid!, $from: date!, $to: date!, $statuses: [String!]) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
        status: { _in: $statuses }
      }
    ) {
      typeRef
      signedDayFraction
      dayFraction
    }
  }
`

// New: Daily facts for distributions (by status)
export const GET_ABSENCE_DAILY_FACTS_BY_STATUS = `
  query AbsenceByStatus($employeeId: uuid!, $from: date!, $to: date!) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
      }
    ) {
      status
      signedDayFraction
      dayFraction
    }
  }
`

// New: Entitlements snapshot (current period rows)
export const GET_ENTITLEMENTS_SNAPSHOT = `
  query EntitlementsSnapshot($employeeId: uuid!, $today: date!) {
    EntitlementUsageSnapshotView(
      where: {
        employeeId: { _eq: $employeeId }
        periodStart: { _lte: $today }
        periodEnd: { _gte: $today }
      }
      orderBy: [{ typeRef: ASC }]
    ) {
      typeRef
      totalEntitlement
      usedApproved
      usedPending
      remaining
      periodStart
      periodEnd
    }
  }
`

export const GET_ENTITLEMENTS_SNAPSHOT_FOR_YEAR = `
  query EntitlementsSnapshotForYear($employeeId: uuid!, $yearStart: date!, $yearEnd: date!) {
    EntitlementUsageSnapshotView(
      where: {
        employeeId: { _eq: $employeeId }
        periodStart: { _lte: $yearEnd }
        periodEnd: { _gte: $yearStart }
      }
      orderBy: [{ typeRef: ASC }, { periodStart: ASC }]
    ) {
      typeRef
      totalEntitlement
      usedApproved
      usedPending
      remaining
      periodStart
      periodEnd
    }
  }
`

export const GET_EMPLOYEE_ENTITLEMENTS = `
    query GetEmployeeEntitlements($employeeId: uuid!, $activeUserLocale: String!) {
        EmployeeAbsenceEntitlement(where: {employeeId: {_eq: $employeeId}}) {
          available
          type {
            value
            objectValue
            id
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                localeCode
                value
            }
          }
          approved
          total
          pending
          validFrom
          validTo
        }
    }`

export const GET_ABSENCE_TYPES = `
    query GetAbsenceTypes($activeUserLocale: String!) {
        CatalogEntry(
            where: { 
                catalog: { 
                    version: { _eq: "v1" }, 
                    identifier: { _eq: "AbsenceType" } 
                },
                isDeleted: { _eq: false }
            }
            orderBy: { value: ASC }
        ) {
            id
            value
            code
            objectValue
            parentEntryId
            translations(where: { localeCode: { _eq: $activeUserLocale } }) {
                localeCode
                value
            }
        }
    }`
