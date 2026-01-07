export const ALL_EMPLOYEE_DATA_QUERY = `
query MyQuery($structureId: uuid!) {
  Employee(where: {employeePosition: {structureId: {_eq: $structureId}}, isDeleted: {_eq: false}}) {
    userId
    firstName
    lastName
    id
  }
  
}`

export const EMPLOYEE_DATA_QUERY = `query MyQuery($employeeId: uuid!, $activeUserLocale: String!, $firstDayOfCurrentYear: timestamp!, $lastDayOfCurrentYear: timestamp!) {
  Employee(where: {id: {_eq: $employeeId}, isDeleted: {_eq: false}}) {
    id
    firstName
    lastName
    pictureThumbnail
    employeePosition{
      organizationalUnitId
      organizationalUnit {
        name
      }
      jobPosition {
        name
      }
    }
    workingCondition {
      vacationDays
    }
  }
  EmployeeAbsenceEntitlement(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}, validFrom: {_gte: $firstDayOfCurrentYear}, validTo: {_lte: $lastDayOfCurrentYear}}, orderBy: {type: {code: ASC}}) {
    id
    version
    employeeId
    type {
      objectValue
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    available
    pending
    total
    approved
  }  
      absenceType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "AbsenceType"}}, objectValue: {_contains: { checkEntitlement: true }}}, orderBy: {value: ASC}) {
    id
    value
    code
    objectValue
    additionalValue1
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
}`
