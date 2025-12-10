/**
 * GraphQL queries for Employee Attendance data
 */

export const GET_OFFICE_ATTENDANCE = `
  query GetOfficeAttendance(
    $dateFrom: date!
    $dateTo: date!
    $structureId: uuid!
  ) {
    EmployeeAttendance(
      where: {
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
        isDeleted: { _eq: false }
        attendanceLocation: { _eq: "IS_NEAR_OFFICE" }
        endTime: { _isNull: false }
      }
      orderBy: { attendanceDate: DESC, startTime: DESC }
    ) {
      id
      employeeId
      attendanceDate
      startTime
      endTime
      effectiveTime
      employee {
        id
        firstName
        lastName
        displayName
        businessKey
        pictureThumbnail
        employeePosition {
          jobPosition {
            id
            name
          }
          organizationalUnit {
            id
            name
          }
        }
      }
    }
    
    EmployeeSiteLocation(
      where: { structureId: { _eq: $structureId } }
    ) {
      employeeId
      siteLocationId
    }
  }
`

export const GET_LIVE_PRESENCE = `
  query GetLivePresence(
    $today: date!
    $structureId: uuid!
  ) {
    EmployeeAttendance(
      where: {
        attendanceDate: { _eq: $today }
        isDeleted: { _eq: false }
        attendanceLocation: { _eq: "IS_NEAR_OFFICE" }
        startTime: { _isNull: false }
        endTime: { _isNull: true }
      }
      orderBy: { startTime: DESC }
    ) {
      id
      employeeId
      startTime
      employee {
        id
        firstName
        lastName
        displayName
        businessKey
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
    }
    
    EmployeeSiteLocation(
      where: { structureId: { _eq: $structureId } }
    ) {
      employeeId
      siteLocationId
    }
  }
`
