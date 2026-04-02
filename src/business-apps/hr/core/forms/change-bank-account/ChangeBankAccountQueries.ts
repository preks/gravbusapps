export const EMPLOYEE_DATA_QUERY = `query fetchEmployeeData($idEmployee: uuid!) {
  EmployeeBankAccount(where: {employeeId: {_eq: $idEmployee}, isDeleted: {_eq: false}}) {
    accountHolder
    accountNumber
    accountNumberType
    accountType
    bankName
    iban
    swift
    notes
    country{
      value
      id 
    }
    currency{
      value
      id 
    }
    employeeAddressId
    routingNumber
    routingNumberType
    version
    id
  }
   EmployeeAddress(where: {employeeId: {_eq: $idEmployee}, isDeleted: {_eq: false}}, orderBy: {type: ASC}) {
    id
    type
    addressLine
    country {
      value
      id 
    }
    isPoBox
    locality
    postalCode
    region{
      value
      id,
      alternativeCode
    }
  }
  Employee(where: {id: {_eq: $idEmployee}}) {
      id
      firstName
      preferredName
      lastName
      userId
      picture
      pictureThumbnail
  }
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}) {
    jobPosition {
      name
    }
  }
}
`

export const CATALOG_DATA_QUERY = `query fetchCatalogData($activeUserLocale: String!) {
     countries: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Country"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}){
   id
    code
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
  routingNumber: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "BankRoutingNumberType"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}){
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
  }
  `
