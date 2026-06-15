import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

// Sales Associate capability name used to scope performance views to sales people
export const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Shape returned by buildSalesAssociatesQuery (matches the EMPLOYEE_REF fragment)
export interface SalesAssociateEmployee {
  id: string
  code: string
  firstName: string
  lastName: string
  displayName: string
  fullName: string
  picture: string | null
  pictureThumbnail: string | null
  employeePosition: Array<{
    jobPosition: { name: string } | null
    organizationalUnit: { id: string; name: string } | null
  }>
}

/**
 * Shared query that lists every employee with the "Sales Associate" capability,
 * including the display fields from EMPLOYEE_REF.
 *
 * Used as the candidate pool for both the Top Individual Performers and
 * Employees Needing Attention cards.
 */
export const buildSalesAssociatesQuery = (): string => `
  query GetSalesAssociates {
    Employee(
      where: {
        isDeleted: { _eq: false }
        employeePosition: {
          employeeCapabilities: {
            capability: {
              name: { _eq: "${SALES_ASSOCIATE_CAPABILITY}" }
            }
          }
        }
      }
    ) {
      ${EMPLOYEE_REF}
    }
  }
`
