export const getEmployeeAbsences = `
  query GetEmployeeAbsences($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        _and: [
          { endDate: { _gte: $startDate } },
          { startDate: { _lte: $endDate } }
        ]
      }
      orderBy: { startDate: ASC }
    ) {
      id
      employeeId
      typeRef
      startDate
      endDate
      status
      description
      type {
        id
        parentEntryId
        objectValue
        translations {
          value
          localeCode
        }
      }
    }
  }
`

export const getEmployeeAbsenceEntitlement = `
  query GetEmployeeAbsenceEntitlement($employeeId: uuid!, $typeRef: String!) {
    EmployeeAbsenceEntitlement(
      where: {
        employeeId: { _eq: $employeeId },
        type: { id: { _eq: $typeRef } },
        isDeleted: { _eq: false }
      }
    ) {
      id
      employeeId
      available
      pending
      approved
      total
      validFrom
      validTo
      type {
        id
        objectValue
      }
    }
  }
`

export const getTodayAbsences = `
  query GetTodayAbsences($employeeId: uuid!, $today: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        startDate: { _lte: $today },
        endDate: { _gte: $today }
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      employeeId
      typeRef
      startDate
      endDate
      status
      description
      substituteEmployee {
        id
        firstName
        lastName
        displayName
      }
      type {
        id
        parentEntryId
        objectValue
        translations {
          value
          localeCode
        }
      }
    }
  }
`

export const employeeRegionLookupQuery = `
  query GetEmployeeRegion($employeeId: uuid!, $activeUserLocale: String!) {
    employee: Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingCondition {
        regionRef
        region {
          id
          value
          translations(where: { localeCode: { _eq: $activeUserLocale } }) { value }
          catalog { defaultLocale }
        }
      }
    }
    addresses: EmployeeAddress(
      where: { employeeId: { _eq: $employeeId }, isDeleted: { _eq: false } }
      orderBy: { type: ASC }
    ) {
      type
      region {
        id
      }
    }
  }
`

/** Single-date bank holiday check: region (additionalValue2), year (additionalValue3), date YYYYMMDD (alternativeCode). */
export const employmentRegionHolidayByDateQuery = `
  query GetEmploymentRegionHolidayByDate(
    $activeUserLocale: String!
    $regionId: String!
    $year: String!
    $altCode: String!
  ) {
    holidays: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegionHoliday" } }
        isDeleted: { _eq: false }
        additionalValue2: { _eq: $regionId }
        additionalValue3: { _eq: $year }
        alternativeCode: { _eq: $altCode }
      }
    ) {
      id
      value
      additionalValue1
      additionalValue2
      additionalValue3
      alternativeCode
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
      catalog {
        defaultLocale
      }
    }
  }
`

/** Holidays in a date range for working-days balance: alternativeCode between altCodeFrom and altCodeTo (YYYYMMDD). List required so weekends can be excluded when counting. */
export const employmentRegionHolidaysInRangeQuery = `
  query GetEmploymentRegionHolidaysInRange(
    $regionId: String!
    $altCodeFrom: String!
    $altCodeTo: String!
  ) {
    holidays: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegionHoliday" } }
        isDeleted: { _eq: false }
        additionalValue2: { _eq: $regionId }
        alternativeCode: { _gte: $altCodeFrom, _lte: $altCodeTo }
      }
      orderBy: { alternativeCode: ASC }
    ) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      additionalValue3
    }
  }
`

/** Per-day absence calendar view for a single employee — use for calendar painting. */
export const employeeAbsenceCalendarRangeQuery = `
  query GetEmployeeAbsenceCalendarRange($employeeId: uuid!, $from: date!, $to: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ dayDate: ASC }]
    ) {
      typeRef
      status
      dayDate
    }
  }
`

export const absenceTypePriorityQuery = `
  query GetAbsenceTypePriority($typeRef: String!) {
    CatalogEntry(
      where: {
        id: { _eq: $typeRef }
        isDeleted: { _eq: false }
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "AbsenceType" } }
      }
      limit: 1
    ) {
      id
      objectValue
    }
  }
`

/** Latest snapshot for one employee + absence type in an overlapping period window. */
export const latestEntitlementSnapshotForRangeQuery = `
  query GetLatestEntitlementSnapshotForRange(
    $employeeId: uuid!
    $typeRef: String!
    $from: date!
    $to: date!
  ) {
    EntitlementUsageSnapshotView(
      where: {
        employeeId: { _eq: $employeeId }
        typeRef: { _eq: $typeRef }
        periodStart: { _lte: $to }
        periodEnd: { _gte: $from }
      }
      orderBy: [{ snapshotAt: DESC }]
      limit: 1
    ) {
      typeRef
      periodStart
      periodEnd
      totalEntitlement
      usedApproved
      usedPending
      remaining
      snapshotAt
    }
  }
`

export const employeeWorkingHoursQuery = `
  query GetEmployeeWorkingHours($employeeId: uuid!) {
    employee: Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingHours {
        id
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
        weeklyHours
        weeklyDays
      }
    }
  }
`
