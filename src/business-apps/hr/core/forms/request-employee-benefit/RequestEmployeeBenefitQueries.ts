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

export const GET_EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY = `query GetEmployeeBankAccountCurrency($employeeId: uuid!) {
  EmployeeBankAccount(
    where: { 
      employeeId: { _eq: $employeeId }
      recordState: { _eq: "ACTIVE" }
    }
    orderBy: { createdAt: DESC }
    limit: 1
  ) {
    currencyRef
  }
}
`
