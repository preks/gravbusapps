/**
 * Query to fetch employee site/office location from Employee -> employeePosition -> siteLocation.
 *
 * `latitude` / `longitude` are populated by the change-site-location form via the
 * Geoapify autocomplete component. Legacy rows that pre-date that work (or that
 * were never re-saved) will return null for both, in which case the clock-in geo
 * service skips the "is near office" comparison and the location card surfaces an
 * "address needs review" warning so an admin / employee fixes the record.
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
          latitude
          longitude
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
