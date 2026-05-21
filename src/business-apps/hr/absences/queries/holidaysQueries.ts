/**
 * GraphQL queries for fetching public holidays from EmploymentRegionHoliday catalog
 */

/**
 * Fetch holidays for specific employment regions
 *
 * @example
 * const variables = {
 *   activeUserLocale: 'en-US',
 *   regionIds: ['REGION_ID_1', 'REGION_ID_2']
 * }
 */
export const GET_EMPLOYMENT_REGION_HOLIDAYS = `
  query GetEmploymentRegionHolidays($activeUserLocale: String!, $regionIds: [String!]!) {
    holidays: CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegionHoliday" } }
        additionalValue2: { _in: $regionIds }
        isDeleted: { _eq: false }
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

/**
 * Fetch employee's employment region to get relevant holidays
 *
 * @example
 * const variables = {
 *   employeeId: 'uuid-of-employee',
 *   activeUserLocale: 'en-US'
 * }
 */
export const GET_EMPLOYEE_REGION = `
  query GetEmployeeRegion($employeeId: uuid!, $activeUserLocale: String!, $today: timestamptz!) {
    employee: Employee(where: { id: { _eq: $employeeId }, isDeleted: { _eq: false } }) {
      id
      workingCondition(
        where: {
          isDeleted: { _eq: false }
          _or: [
            { activeFrom: { _isNull: true }, activeTo: { _isNull: true } }
            {
              activeFrom: { _lte: $today }
              _or: [{ activeTo: { _isNull: true } }, { activeTo: { _gte: $today } }]
            }
          ]
        }
        orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
        limit: 1
      ) {
        region {
          id
          value
          translations(where: { localeCode: { _eq: $activeUserLocale } }) {
            value
          }
          catalog {
            defaultLocale
          }
        }
      }
    }
  }
`
