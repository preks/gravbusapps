/**
 * GraphQL queries for Employee Attendance data
 */

export const GET_OFFICE_ATTENDANCE = `
  query GetOfficeAttendance(
    $dateFrom: date!
    $dateTo: date!
    $structureId: uuid!
    $asOfTs: timestamp!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _gte: $dateFrom, _lte: $dateTo } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
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
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    ) {
      employeeId
      siteLocationId
    }
  }
`

export const GET_OFFICE_ATTENDANCE_BY_COMPANY = `
  query GetOfficeAttendanceByCompany(
    $dateFrom: date!
    $dateTo: date!
    $structureId: uuid!
    $asOfTs: timestamp!
    $companyIds: [uuid!]!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _gte: $dateFrom, _lte: $dateTo } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
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
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
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
    $asOfTs: timestamp!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _eq: $today } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          { startTime: { _isNull: false } }
          { endTime: { _isNull: true } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
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
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    ) {
      employeeId
      siteLocationId
    }
  }
`

export const GET_LIVE_PRESENCE_ATTENDANCE = `
  query GetLivePresenceAttendance(
    $today: date!
    $structureId: uuid!
    $asOfTs: timestamp!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _eq: $today } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          { startTime: { _isNull: false } }
          { endTime: { _isNull: true } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
    }
  }
`

export const GET_LIVE_PRESENCE_BY_COMPANY = `
  query GetLivePresenceByCompany(
    $today: date!
    $structureId: uuid!
    $asOfTs: timestamp!
    $companyIds: [uuid!]!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _eq: $today } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          { startTime: { _isNull: false } }
          { endTime: { _isNull: true } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
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
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    ) {
      employeeId
      siteLocationId
    }
  }
`

export const GET_LIVE_PRESENCE_ATTENDANCE_BY_COMPANY = `
  query GetLivePresenceAttendanceByCompany(
    $today: date!
    $structureId: uuid!
    $asOfTs: timestamp!
    $companyIds: [uuid!]!
  ) {
    EmployeeAttendance(
      where: {
        _and: [
          { attendanceDate: { _eq: $today } }
          { isDeleted: { _eq: false } }
          { attendanceLocation: { _eq: "IS_NEAR_OFFICE" } }
          { startTime: { _isNull: false } }
          { endTime: { _isNull: true } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
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
          companyId
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
    }
  }
`

export const GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS = `
  query GetEmployeeSiteLocationsByEmployeeIds(
    $structureId: uuid!
    $employeeIds: [uuid!]!
  ) {
    EmployeeSiteLocation(
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          { employeeId: { _in: $employeeIds } }
        ]
      }
    ) {
      employeeId
      siteLocationId
    }
  }
`

export const GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS_AND_COMPANY = `
  query GetEmployeeSiteLocationsByEmployeeIdsAndCompany(
    $structureId: uuid!
    $employeeIds: [uuid!]!
    $companyIds: [uuid!]!
    $asOfTs: timestamp!
  ) {
    EmployeeSiteLocation(
      where: {
        _and: [
          { structureId: { _eq: $structureId } }
          { employeeId: { _in: $employeeIds } }
          {
            employee: {
              isDeleted: { _eq: false }
              employeePosition: {
                _and: [
                  { structureId: { _eq: $structureId } }
                  { companyId: { _in: $companyIds } }
                  {
                    _or: [
                      { hireDate: { _isNull: true } }
                      { hireDate: { _lte: $asOfTs } }
                    ]
                  }
                  {
                    _or: [
                      { exitDate: { _isNull: true } }
                      { exitDate: { _gt: $asOfTs } }
                    ]
                  }
                ]
              }
            }
          }
        ]
      }
    ) {
      employeeId
      siteLocationId
    }
  }
`
