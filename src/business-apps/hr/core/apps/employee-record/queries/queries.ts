// Catalog entry by id (for employment region label and parent-country check)
export const GET_CATALOG_ENTRY_BY_ID = `
  query GetCatalogEntryById($entryId: String!, $activeUserLocale: String!) {
    CatalogEntry(where: { id: { _eq: $entryId } }) {
      id
      value
      additionalValue3
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
  }
`

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

// Weekly schedule (per-day planned hours) for an employee - most recent record
export const GET_EMPLOYEE_WEEKLY_SCHEDULE = `
  query GetEmployeeWeeklySchedule($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }) {
      workingHours(orderBy: [{ activeFrom: DESC }], limit: 1) {
        activeFrom
        activeTo
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
      }
    }
  }
`

// Daily absence facts for a date window, used to paint effective working days in the calendar
export const GET_ABSENCE_DAILY_FACTS = `
  query AbsenceFacts($employeeId: uuid!, $from: date!, $to: date!) {
    DailyAbsenceFactView(
      where: {
        employeeId: { _eq: $employeeId }
        dayDate: { _gte: $from, _lte: $to }
      }
    ) {
      dayDate
      signedDayFraction
      dayFraction
      status
      typeRef
    }
  }
`
