export const GET_EMPLOYEE_ABSENCES = `
    query GetEmployeeAbsences(
        $where: EmployeeAbsenceBoolExp!
        $orderBy: [EmployeeAbsenceOrderBy!]
        $limit: Int!
        $offset: Int!
        $activeUserLocale: String!
    ) {
        EmployeeAbsence(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
            description
            id
            endDate
            startDate
            status
            type {
                id
                value   
                parentEntryId
                objectValue
                translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                    localeCode
                    value
                }
            }
            workingDays
            workingHours
            calendarDays
            effectiveDays
            createdAt
            employee {
                id
                firstName
                lastName
            }
        }
        EmployeeAbsenceAggregate(where: $where) {
            aggregate {
                count
            }
        }
    }`

export const GET_EMPLOYEE_ENTITLEMENTS = `
    query GetEmployeeEntitlements($employeeId: uuid!, $activeUserLocale: String!) {
        EmployeeAbsenceEntitlement(where: {employeeId: {_eq: $employeeId}}) {
          available
          type {
            value
            objectValue
            id
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
                localeCode
                value
            }
          }
          approved
          total
          pending
          validFrom
          validTo
        }
    }`

export const GET_ABSENCE_TYPES = `
    query GetAbsenceTypes($activeUserLocale: String!) {
        CatalogEntry(
            where: { 
                catalog: { 
                    version: { _eq: "v1" }, 
                    identifier: { _eq: "AbsenceType" } 
                },
                isDeleted: { _eq: false }
            }
            orderBy: { value: ASC }
        ) {
            id
            value
            code
            objectValue
            parentEntryId
            translations(where: { localeCode: { _eq: $activeUserLocale } }) {
                localeCode
                value
            }
        }
    }`
