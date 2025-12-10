export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    code
    firstName
    lastName
    displayName
    pictureThumbnail
  }
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}, limit: 1) {
    jobPosition {
      name
    }
  }
}
`

export const GET_COUNTRY_CURRENCY_QUERY = `query GetCountry($id: String!) {
  CatalogEntry(where: { id: { _eq: $id } }) {
    id
    objectValue
  }
}
`
