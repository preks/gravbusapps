/**
 * Org-wide entitlements overview query for the Time & Absence Hub Entitlements view.
 *
 * Mirrors the same shape as the existing `GetDetailedEntitlements` in EntitlementsDetails,
 * but joined with employee + organizationalUnit + siteLocation so we can show a flat
 * org-wide table with department / location columns.
 */

export const GET_ORG_ENTITLEMENTS_OVERVIEW = `
  query GetOrgEntitlementsOverview(
    $where: EmployeeAbsenceEntitlementBoolExp!
    $offset: Int!
    $limit: Int!
    $orderBy: [EmployeeAbsenceEntitlementOrderBy!]
  ) {
    EmployeeAbsenceEntitlement(
      where: $where
      offset: $offset
      limit: $limit
      orderBy: $orderBy
    ) {
      id
      employeeId
      total
      available
      approved
      pending
      validFrom
      validTo
      type {
        id
        value
        parentEntryId
      }
      employee {
        id
        firstName
        lastName
        displayName
        pictureThumbnail
        employeePosition {
          organizationalUnit {
            id
            name
          }
          company {
            id
            name
          }
          siteLocation {
            id
            name
          }
        }
      }
    }
    EmployeeAbsenceEntitlementAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ENTITLEMENT_EMPLOYEES_BY_IDS = `
  query GetEntitlementEmployeesByIds($employeeIds: [uuid!]!) {
    Employee(where: { _and: [{ id: { _in: $employeeIds } }, { isDeleted: { _eq: false } }] }) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        organizationalUnit {
          id
          name
        }
        company {
          id
          name
        }
        siteLocation {
          id
          name
        }
      }
    }
  }
`

export interface OrgEntitlementRow {
  id: string
  employeeId?: string | null
  total?: number | null
  available?: number | null
  approved?: number | null
  pending?: number | null
  validFrom?: string | null
  validTo?: string | null
  type?: { id: string; value: string; parentEntryId?: string | null } | null
  employee?: {
    id: string
    firstName: string
    lastName: string
    displayName?: string | null
    pictureThumbnail?: string | null
    employeePosition?: {
      organizationalUnit?: { id: string; name: string } | null
      company?: { id: string; name: string } | null
      siteLocation?: { id: string; name: string } | null
    } | null
  } | null
}
