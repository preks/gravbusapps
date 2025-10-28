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
    }
  }
`
