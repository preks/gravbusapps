export const GET_EMPLOYEE_DETAILS = `
  query GetEmployeeDetails($idEmployee: uuid!) {
    EmployeeByPk(id: $idEmployee) {
      id
      firstName
      lastName
      pictureThumbnail
    }
    EmployeePosition(where: {employeeId: {_eq: $idEmployee}}) {
      jobPosition {
        name
      }
    }
  }
`
