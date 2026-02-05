export const GET_TEAM_CALENDAR_DAYS = `
  query TeamCalendarDays($employeeIds: [uuid!], $from: date!, $to: date!) {
    EmployeeAbsenceCalendarView(
      where: {
        employeeId: { _in: $employeeIds }
        dayDate: { _gte: $from, _lte: $to }
      }
      orderBy: [{ employeeId: ASC }, { dayDate: ASC }, { typeRef: ASC }]
    ) {
      employeeId
      dayDate
      typeRef
      status
      employeeAbsenceId
    }
  }
`
