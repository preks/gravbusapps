export const getEmployeeAbsences = `
  query GetEmployeeAbsences($employeeId: uuid!, $startDate: timestamp!, $endDate: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        _and: [
          { endDate: { _gte: $startDate } },
          { startDate: { _lte: $endDate } }
        ]
      }
      orderBy: { startDate: ASC }
    ) {
      id
      employeeId
      typeRef
      startDate
      endDate
      status
      description
      type {
        id
        parentEntryId
        objectValue
        translations {
          value
          localeCode
        }
      }
    }
  }
`

export const getEmployeeAbsenceEntitlement = `
  query GetEmployeeAbsenceEntitlement($employeeId: uuid!, $typeRef: String!) {
    EmployeeAbsenceEntitlement(
      where: {
        employeeId: { _eq: $employeeId },
        type: { id: { _eq: $typeRef } },
        isDeleted: { _eq: false }
      }
    ) {
      id
      employeeId
      available
      pending
      approved
      total
      validFrom
      validTo
      type {
        id
        objectValue
      }
    }
  }
`

export const getTodayAbsences = `
  query GetTodayAbsences($employeeId: uuid!, $today: timestamp!) {
    EmployeeAbsence(
      where: {
        employeeId: { _eq: $employeeId },
        isDeleted: { _eq: false },
        startDate: { _lte: $today },
        endDate: { _gte: $today }
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      employeeId
      typeRef
      startDate
      endDate
      status
      description
      substituteEmployee {
        id
        firstName
        lastName
        displayName
      }
      type {
        id
        parentEntryId
        objectValue
        translations {
          value
          localeCode
        }
      }
    }
  }
`

export const employeeRegionLookupQuery = `
  query GetEmployeeRegion($employeeId: uuid!, $activeUserLocale: String!) {
    employee: Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingCondition {
        region {
          id
          value
          translations(where: { localeCode: { _eq: $activeUserLocale } }) { value }
          catalog { defaultLocale }
        }
      }
    }
  }
`

export const employmentRegionHolidaysQuery = `
  query GetEmploymentRegionHolidays($activeUserLocale: String!, $regionIds: [String!]!) {
    holidays: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegionHoliday" } }
        additionalValue2: { _in: $regionIds }
      }
      orderBy: { value: ASC }
    ) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      additionalValue3
      objectValue
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
      catalog {
        defaultLocale
      }
    }
  }
`

export const employeeWorkingHoursQuery = `
  query GetEmployeeWorkingHours($employeeId: uuid!) {
    employee: Employee(where: { isDeleted: { _eq: false }, id: { _eq: $employeeId } }) {
      id
      workingHours {
        id
        mondayHours
        tuesdayHours
        wednesdayHours
        thursdayHours
        fridayHours
        saturdayHours
        sundayHours
        weeklyHours
        weeklyDays
      }
    }
  }
`
