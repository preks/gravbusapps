// GraphQL queries for absences and entitlements
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
      description
      id
      endDate
      startDate
      status
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
