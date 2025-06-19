
export const GET_EMPLOYEE_ABSENCES = `
    query GetEmployeeAbsences($employeeId: uuid!) {
        EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
            description
            id
            endDate
            startDate
            status
            type {
                value
                objectValue
            }
            workingDays
            workingHours
            createdAt
        }
    }`;

export const GET_EMPLOYEE_ENTITLEMENTS = `
    query GetEmployeeEntitlements($employeeId: uuid!) {
        EmployeeAbsenceEntitlement(where: {employeeId: {_eq: $employeeId}}) {
          available
          type {
            value
            objectValue
            id
          }
          approved
          total
          pending
        }
    }`;
