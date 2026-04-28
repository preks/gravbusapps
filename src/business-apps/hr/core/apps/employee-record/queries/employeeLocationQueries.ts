/**
 * Query to fetch employee site/office location from Employee -> employeePosition -> siteLocation.
 *
 * NOTE: SiteLocation does not yet carry latitude / longitude columns — that work is in
 * progress on the backend. Once those columns and the corresponding GraphQL fields ship,
 * add `latitude` and `longitude` to the `siteLocation` selection here. Until then, the
 * clock-in geo service treats office coords as missing and shows the
 * "address needs review" warning in the location card (this is by design).
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
 * Mirrors the address structure used in GET_EMPLOYEE_DATA. The latitude / longitude
 * columns are populated by the change-employee-address form via Geoapify autocomplete;
 * legacy rows that pre-date that work will simply return null and the clock-in geo
 * service will skip the "is near home" comparison for those employees.
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
        latitude
        longitude
        country {
          code
          value
        }
      }
    }
  }
`
