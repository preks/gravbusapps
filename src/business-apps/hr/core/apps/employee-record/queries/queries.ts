// GraphQL queries for absences and entitlements
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
      description
      id
      endDate
      startDate
      status
      effectiveDays
      type {
        id
        value   
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      workingDays
      workingHours
      createdAt
    }
  }
`

// Daily absence facts for a date window, used to paint effective working days in the calendar
export const GET_ABSENCE_DAILY_FACTS = `
  query AbsenceFacts($employeeId: uuid!, $from: date!, $to: date!, $statuses: [String!]) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
        status: { _in: $statuses }
      }
    ) {
      dayDate
      dayFraction
      status
      typeRef
    }
  }
`
