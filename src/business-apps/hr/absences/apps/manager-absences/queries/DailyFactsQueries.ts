export const GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE = `
  query GetTeamAbsenceDailyFactsByType($employeeIds: [uuid!], $from: date!, $to: date!) {
    DailyAbsenceNetView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ typeRef: ASC }, { dayDate: ASC }]
    ) {
      typeRef
      dayDate
      netSignedEps
      netConsumed
    }
  }
`

export const GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE_FACT = `
  query GetTeamAbsenceDailyFactsByTypeFact($employeeIds: [uuid!], $from: date!, $to: date!, $statuses: [String!]) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
        status: { _in: $statuses }
      }
      orderBy: [{ typeRef: ASC }, { dayDate: ASC }]
    ) {
      typeRef
      dayDate
      signedDayFraction
      dayFraction
    }
  }
`

export const GET_TEAM_ABSENCE_REQUESTS_BY_TYPE = `
  query GetTeamAbsenceRequestsByType($employeeIds: [uuid!], $from: timestamp!, $to: timestamp!, $statuses: [String!]) {
    EmployeeAbsence(
      where: {
        isDeleted: { _eq: false }
        employeeId: { _in: $employeeIds }
        status: { _in: $statuses }
        startDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ typeRef: ASC }, { startDate: ASC }]
    ) {
      typeRef
      startDate
      endDate
      createdAt
      effectiveDays
      workingDays
      calendarDays
      type {
        isDeleted
      }
    }
  }
`

export const GET_TEAM_ABSENCE_DAILY_FACTS_BY_STATUS = `
  query GetTeamAbsenceDailyFactsByStatus($employeeIds: [uuid!], $from: date!, $to: date!) {
    DailyAbsenceFactView(
      where: { employeeId: { _in: $employeeIds }, dayDate: { _gte: $from, _lte: $to } }
    ) {
      status
      signedDayFraction
      dayFraction
    }
  }
`
