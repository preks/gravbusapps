export const GET_EMPLOYEE_ADDRESS = `query fetchEmployeeAddress($id: uuid){
  Employee(where: {id: {_eq: $id}}) {
    id
    firstName
    lastName
    pictureThumbnail
  }
  EmployeePosition(where: {employeeId: {_eq: $id}}) {
    jobPosition {
      name
    }
  }
EmployeeAddress(where: {employeeId: {_eq: $id}, isDeleted: {_eq: false}}, orderBy: {type: ASC}) {
    id
    type
    addressLine
    employeeId
    country {
      value,
      id 
    }
    isPoBox
    locality
    postalCode
    region{
      value,
      id
    }
    version
    employeeDocumentId
  }
    EmployeeBankAccount(where: {employeeId: {_eq: $id}, isDeleted: {_eq: false}}){
     country{
      value,
      id 
    }
    currency{
      value,
      id 
    }
    employeeAddressId
  }
    }`

export const CATALOG_DATA_QUERY = `query fetchCatalogData($activeUserLocale: String!){
countries: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Country"}}}, orderBy: {value: ASC}) {
     id
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
  regions: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "CountryRegion"}}}, orderBy: {value: ASC}) {
    value
    id
    code
    alternativeCode
    additionalValue2
    additionalValue1
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
  counties: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "County"}}}, orderBy: {value: ASC}) {
    value
    id
    code
    alternativeCode
    additionalValue1
  }}`
