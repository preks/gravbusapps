export const EMPLOYEE_DATA_QUERY = `
    query fetchEmployeeData($idEmployee: uuid!) {
   EmployeeByPk(id: $idEmployee) {
    id
    version
    externalId
  }
}
  `
