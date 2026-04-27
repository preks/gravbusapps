import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

/**
 * OU assignments via `Employee.organizationalUnitEmployees` (nw_employee → nw_orgchart.organizational_unit_employee).
 * Avoids root `EmployeeOrganizationalUnit` / `OrganizationalUnitEmployee`, which differ across tenants.
 */
const EDIT_EMPLOYEE_FORM_DATA = `
  query EditEmployeeFormData($employeeId: uuid!, $structureId: uuid!) {
    Employee(where: { id: { _eq: $employeeId }, isDeleted: { _eq: false } }, limit: 1) {
      id
      version
      firstName
      lastName
      fullName
      displayName
      preferredName
      code
      hrReferenceCode
      userId
      status
      communication(where: { isDeleted: { _eq: false } }) {
        id
        version
        purpose
        channelRef
        value
        valueExtension
      }
      organizationalUnitEmployees(
        where: { structureId: { _eq: $structureId } }
        limit: 10
      ) {
        id
        role
        organizationalUnitId
        jobPositionId
        employeeId
        structureId
      }
    }
    EmployeePosition(
      where: { employeeId: { _eq: $employeeId }, structureId: { _eq: $structureId } }
      limit: 1
    ) {
      jobPositionId
      organizationalUnitId
      structureId
      jobPosition {
        id
        name
      }
      organizationalUnit {
        id
        name
      }
    }
  }
`

export type EditEmployeeCommunicationRow = {
  id: string
  version?: number | null
  purpose?: string | null
  channelRef?: string | null
  value?: string | null
  valueExtension?: string | null
}

export type EditEmployeeFormBootstrap = {
  employee: {
    id: string
    version?: number | null
    firstName?: string | null
    lastName?: string | null
    fullName?: string | null
    displayName?: string | null
    preferredName?: string | null
    code?: string | null
    hrReferenceCode?: string | null
    userId?: string | null
    status?: string | null
    communication: EditEmployeeCommunicationRow[]
  } | null
  employeePosition: {
    jobPositionId?: string | null
    organizationalUnitId?: string | null
    structureId?: string | null
    jobPosition?: { id?: string | null; name?: string | null } | null
    organizationalUnit?: { id?: string | null; name?: string | null } | null
  } | null
  /** Org-chart assignment rows for this employee in the structure (ids used for REST updates). */
  employeeOrganizationalUnits: Array<{
    id: string
    role?: string | null
    organizationalUnitId?: string | null
    jobPositionId?: string | null
    employeeId?: string | null
    structureId?: string | null
  }>
}

type EditEmployeeEmployeeGqlRow = NonNullable<EditEmployeeFormBootstrap['employee']> & {
  organizationalUnitEmployees?: EditEmployeeFormBootstrap['employeeOrganizationalUnits']
}

export async function fetchEmployeeForEditForm(
  accessToken: string,
  employeeId: string,
  structureId: string
): Promise<EditEmployeeFormBootstrap> {
  graphQLClient.setAccessToken(accessToken)
  const data = await graphQLClient.request<{
    Employee: Array<EditEmployeeEmployeeGqlRow | null>
    EmployeePosition: EditEmployeeFormBootstrap['employeePosition'][]
  }>(EDIT_EMPLOYEE_FORM_DATA, { employeeId, structureId })

  const raw = data.Employee?.[0] ?? null
  if (!raw) {
    return {
      employee: null,
      employeePosition: data.EmployeePosition?.[0] ?? null,
      employeeOrganizationalUnits: []
    }
  }
  const { organizationalUnitEmployees: ouAssignments = [], ...employeeRest } = raw
  return {
    employee: employeeRest as EditEmployeeFormBootstrap['employee'],
    employeePosition: data.EmployeePosition?.[0] ?? null,
    employeeOrganizationalUnits: ouAssignments
  }
}
