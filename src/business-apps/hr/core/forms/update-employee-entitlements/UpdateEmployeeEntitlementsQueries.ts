export const ALL_EMPLOYEE_DATA_QUERY = `
query MyQuery($structureId: uuid!) {
  Employee(where: {employeePosition: {structureId: {_eq: $structureId}}, isDeleted: {_eq: false}}) {
    userId
    firstName
    lastName
    id
  }
  
}`

export const EMPLOYEE_DATA_QUERY = `query MyQuery($employeeId: uuid!, $activeUserLocale: String!) {
  Employee(where: {id: {_eq: $employeeId}, isDeleted: {_eq: false}}) {
    id
    firstName
    lastName
    pictureThumbnail
    employeePosition{
      hireDate
      organizationalUnitId
      organizationalUnit {
        name
      }
      jobPosition {
        name
      }
    }
    workingCondition(where: {isDeleted: {_neq: true}}, orderBy: [{activeFrom: DESC}, {createdAt: DESC}]) {
      hireDate
      vacationDays
      activeFrom
      activeTo
    }
  }
  EmployeeAbsenceEntitlement(
    where: {
      isDeleted: {_eq: false},
      employeeId: {_eq: $employeeId}
    },
    orderBy: {type: {code: ASC}}
  ) {
    id
    version
    employeeId
    validFrom
    validTo
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
      absenceType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "AbsenceType"}}, objectValue: {_contains: { checkEntitlement: true }}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
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
