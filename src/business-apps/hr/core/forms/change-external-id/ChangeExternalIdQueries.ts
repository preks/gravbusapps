export const EMPLOYEE_DATA_QUERY = `
    query fetchEmployeeData($idEmployee: uuid!) {
   EmployeeByPk(id: $idEmployee) {
    id
    version
    externalId
    additionalProperties
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
