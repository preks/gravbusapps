/**
 * Query to fetch employee site/office location from Employee -> employeePosition -> siteLocation
 */
export const GET_EMPLOYEE_SITE_LOCATION = /*sql*/ `
  query GetEmployeeSiteLocation($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }, limit: 1) {
      id
      employeePosition {
        siteLocation {
          code
          addressLine
          countryRef
          name
          postalCode
          regionRef
          structureId
        }
      }
    }
  }
`

/**
 * Query to fetch the employee's PRIMARY (home) address.
 * Mirrors the address structure used in GET_EMPLOYEE_DATA.
 */
export const GET_EMPLOYEE_HOME_ADDRESS = /*sql*/ `
  query GetEmployeeHomeAddress($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }, limit: 1) {
      id
      addresses(
        where: { type: { _eq: "PRIMARY" } }
        orderBy: { version: DESC }
        limit: 1
      ) {
        id
        version
        addressLine
        postalCode
        locality
        type
        country {
          code
          value
        }
      }
    }
  }
`
