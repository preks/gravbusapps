/**
 * GraphQL query for employee attendance data (monthly, paginated)
 */

export const employeeAttendanceMonthlyQuery = `
  query GetEmployeeAttendance(
    $employeeId: uuid!
    $dateFrom: date!
    $dateTo: date!
    $limit: Int!
    $offset: Int!
  ) {

    EmployeeAttendance(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
      }
      orderBy: { startTime: DESC, attendanceDate: DESC }
      limit: $limit
      offset: $offset
    ) {
      id
      version
      employeeId
      attendanceDate
      startTime
      endTime
      recordedTime
      breakTime
      effectiveTime
      plannedTime
      differenceTime
      manualOverride
      notes
      attendanceLocation
    }
  }
`

// Fetch all attendance rows for a month (no pagination) to compute totals client-side
export const employeeAttendanceMonthlyAllQuery = `
  query GetEmployeeAttendanceAll(
    $employeeId: uuid!
    $dateFrom: date!
    $dateTo: date!
  ) {
    EmployeeAttendance(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
      }
      orderBy: { attendanceDate: ASC, startTime: ASC }
    ) {
      id
      attendanceDate
      effectiveTime
      breakTime
      plannedTime
      recordedTime
      version
      attendanceLocation
    }
  }
`

// Fetch attendance rows for an exact date (today check)
export const employeeAttendanceForDateQuery = `
  query GetEmployeeAttendanceForDate($employeeId: uuid!, $date: date!) {
    EmployeeAttendance(
      where: {
        employeeId: { _eq: $employeeId }
        isDeleted: { _eq: false }
        attendanceDate: { _eq: $date }
      }
      orderBy: { startTime: DESC }
    ) {
      id
      startTime
      endTime
    }
  }
`

// Employment region lookup for a given employee (to resolve regionId for holiday catalogs)
export const employeeRegionLookupQuery = `
  query GetEmployeeRegion($employeeId: uuid!, $activeUserLocale: String!) {
    employee: Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingCondition {
        region {
          id
          value
          translations(where: { localeCode: { _eq: $activeUserLocale } }) { value }
          catalog { defaultLocale }
        }
      }
    }
  }
`

// Holidays catalog entries for an Employment Region
export const employmentRegionHolidaysQuery = `
  query GetEmploymentRegionHolidays($activeUserLocale: String!, $regionId:String!) {
    holidays: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegionHoliday" } }
        additionalValue2: { _eq:  $regionId }
      }
      orderBy: { value: ASC }
    ) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      additionalValue3
      objectValue
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
      catalog {
        defaultLocale
      }
    }
  }
`

/**
 * Active attendance correction requests for a date range (by employee)
 */
export const employeeAttendanceCorrectionsForRangeQuery = `
  query GetEmployeeAttendanceCorrections(
    $employeeId: uuid!
    $dateFrom: date!
    $dateTo: date!
  ) {
    EmployeeAttendanceCorrectionRequest(
      where: {
        employeeId: { _eq: $employeeId }
        recordState: { _eq: "active" }
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
        status: { _neq: "APPROVED_CORRECTION_REQUEST" }
      }
      orderBy: { attendanceDate: ASC }
    ) {
      id
      attendanceDate
      status
      recordState
    }
  }
`

/**
 * Single attendance row by id (for review/diff)
 */
export const employeeAttendanceByIdQuery = `
  query GetEmployeeAttendanceById($id: uuid!) {
    EmployeeAttendance(where: { id: { _eq: $id }, isDeleted: { _eq: false } }, limit: 1) {
      id
      version
      attendanceDate
      startTime
      endTime
      recordedTime
      breakTime
      effectiveTime
      plannedTime
      differenceTime
      manualOverride
      notes
      attendanceLocation
    }
  }
`
