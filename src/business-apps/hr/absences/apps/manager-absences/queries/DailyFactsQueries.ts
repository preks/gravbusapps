export const GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE = `
  query GetTeamAbsenceDailyFactsByType($employeeIds: [uuid!], $from: date!, $to: date!, $statuses: [String!]) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
        status: { _in: $statuses }
      }
      orderBy: [{ typeRef: ASC }]
    ) {
      typeRef
      signedDayFraction
      dayFraction
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
