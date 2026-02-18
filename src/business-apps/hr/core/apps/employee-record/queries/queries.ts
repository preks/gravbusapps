// Catalog entry by id (for employment region label and parent-country check)
export const GET_CATALOG_ENTRY_BY_ID = `
  query GetCatalogEntryById($entryId: String!, $activeUserLocale: String!) {
    CatalogEntry(where: { id: { _eq: $entryId } }) {
      id
      value
      additionalValue3
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
  }
`

// GraphQL queries for absences and entitlements
export const GET_EMPLOYEE_ABSENCES = `
  query GetEmployeeAbsences($employeeId: uuid!, $activeUserLocale: String!) {
    EmployeeAbsence(where: { employee: { id: { _eq: $employeeId } } }) {
      description
      id
      endDate
      startDate
      status
      type {
        id
        value   
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
      }
      workingDays
      workingHours
      createdAt
    }
  }
`
