export const GET_TEAM_MEMBERS = `
  query GetTeamMembers($supervisorId: uuid!) {
    Employee(
      where: {
        employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ firstName: ASC }, { lastName: ASC }]
    ) {
      id
      firstName
      lastName
      workingHours {
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
      employeePosition {
        organizationalUnit {
          name
        }
      }
    }
  }
`

export const GET_TEAM_MEMBER_THUMBNAILS = `
  query GetTeamMemberThumbnails($employeeIds: [uuid!]!) {
    Employee(
      where: { id: { _in: $employeeIds }, isDeleted: { _eq: false } }
    ) {
      id
      pictureThumbnail
    }
  }
`

export const GET_TEAM_ATTENDANCE_FOR_RANGE = `
  query GetTeamAttendanceForRange($employeeIds: [uuid!]!, $dateFrom: date!, $dateTo: date!) {
    EmployeeAttendance(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
      }
      orderBy: [{ attendanceDate: DESC }, { startTime: DESC }]
    ) {
      id
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
      attendanceLocation
    }
  }
`

export const GET_TEAM_ABSENCES_CALENDAR_TODAY = `
  query GetTeamAbsencesCalendarToday($employeeIds: [uuid!]!, $today: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _eq: $today }
      }
    ) {
      employeeId
      typeRef
      status
      dayDate
      employeeAbsenceId
    }
  }
`

export const GET_TEAM_ABSENCES_CALENDAR_RANGE = `
  query GetTeamAbsencesCalendarRange($employeeIds: [uuid!]!, $from: date!, $to: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ dayDate: ASC }]
    ) {
      employeeId
      typeRef
      status
      dayDate
      employeeAbsenceId
    }
  }
`

export const GET_TEAM_PENDING_ABSENCES = `
  query GetTeamPendingAbsences($supervisorId: uuid!) {
    EmployeeAbsence(
      where: {
        isDeleted: { _eq: false }
        status: { _eq: "PENDING" }
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } } }
      }
      orderBy: { startDate: ASC }
    ) {
      id
      startDate
      endDate
      effectiveDays
      status
      createdAt
      type {
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        pictureThumbnail
      }
    }
  }
`

export const GET_TEAM_ABSENCE_NET_FOR_RANGE = `
  query GetTeamAbsenceNetForRange($employeeIds: [uuid!]!, $from: date!, $to: date!) {
    DailyAbsenceNetView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ employeeId: ASC }, { dayDate: ASC }]
    ) {
      employeeId
      typeRef
      dayDate
      netSignedEps
      netConsumed
    }
  }
`

export const GET_TEAM_COVERAGE = `
  query GetTeamCoverage($supervisorId: uuid!) {
    employees: Employee(
      where: {
        employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ firstName: ASC }, { lastName: ASC }]
    ) {
      id
      firstName
      lastName
      employeePosition {
        organizationalUnit {
          id
          name
        }
        matrixUnitEmployees {
          matrixUnit {
            id
            name
          }
        }
        employeeCapabilities {
          capability {
            id
            name
          }
        }
      }
    }
    currentAbsences: EmployeeAbsence(
      where: {
        isDeleted: { _eq: false }
        status: { _eq: "APPROVED" }
        employee: { employeePosition: { supervisorEmployeeId: { _eq: $supervisorId } } }
        type: { parentEntryId: { _neq: "AbsenceGroup:v1:WORK" } }
        _and: [
          { startDate: { _lte: "now()" } }
          { endDate: { _gte: "now()" } }
        ]
      }
    ) {
      id
      employee {
        id
        firstName
        lastName
      }
    }
  }
`

export const GET_TEAM_ENTITLEMENTS = `
  query GetTeamEntitlements($employeeIds: [uuid!]!, $today: date!) {
    EntitlementUsageSnapshotView(
      where: {
        employeeId: { _in: $employeeIds }
        periodStart: { _lte: $today }
        periodEnd: { _gte: $today }
      }
      orderBy: [{ employeeId: ASC }, { typeRef: ASC }]
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
  }
`
