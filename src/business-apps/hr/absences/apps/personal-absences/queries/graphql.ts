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
    }`

export const GET_EMPLOYEE_ENTITLEMENTS = `
    query GetEmployeeEntitlements($employeeId: uuid!, $activeUserLocale: String!) {
        EmployeeAbsenceEntitlement(where: {employeeId: {_eq: $employeeId}}) {
          available
          type {
            value
            objectValue
            id
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                localeCode
                value
            }
          }
          approved
          total
          pending
        }
    }`
