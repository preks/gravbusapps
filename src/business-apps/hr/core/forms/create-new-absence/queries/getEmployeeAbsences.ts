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
        translations {
          value
          localeCode
        }
      }
    }
  }
`

export const getEmployeeAbsenceBalance = `
  query GetEmployeeAbsenceBalance($employeeId: uuid!, $typeRef: String!) {
    EmployeeAbsenceBalance(
      where: {
        employeeId: { _eq: $employeeId },
        typeRef: { _eq: $typeRef }
      }
    ) {
      id
      employeeId
      typeRef
      annualTotal
      remaining
      approved
      validFrom
      validTo
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
        translations {
          value
          localeCode
        }
      }
    }
  }
`
