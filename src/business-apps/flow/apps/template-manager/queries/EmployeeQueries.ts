/**
 * GraphQL queries for employee data resolution
 */

export const GET_EMPLOYEE_BY_ID = `
  query GetEmployeeById($idEmployee: uuid!) {
    EmployeeByPk(id: $idEmployee) {
      id
      firstName
      lastName
      displayName
    }
  }
`

export interface EmployeeDetails {
  id: string
  firstName: string
  lastName: string
  displayName?: string
}

export interface EmployeeByIdResponse {
  EmployeeByPk: EmployeeDetails | null
}
