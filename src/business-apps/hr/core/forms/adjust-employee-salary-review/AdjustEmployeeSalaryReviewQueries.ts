export const GET_EMPLOYEE_NAME = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      firstName
      lastName
      id
    }
  }
`

export const GET_INITIATOR_EMPLOYEE_NAME = `
  query GetInitiatorEmployeeById($initiatorEmployeeId: uuid!) {
    initiator: EmployeeByPk(id: $initiatorEmployeeId) {
      firstName
      lastName
      id
    }
  }
`
