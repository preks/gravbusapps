import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

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
    EmployeeOrganizationalUnit(
      where: { employeeId: { _eq: $employeeId }, structureId: { _eq: $structureId } }
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

export async function fetchEmployeeForEditForm(
  accessToken: string,
  employeeId: string,
  structureId: string
): Promise<EditEmployeeFormBootstrap> {
  graphQLClient.setAccessToken(accessToken)
  const data = await graphQLClient.request<{
    Employee: EditEmployeeFormBootstrap['employee'][]
    EmployeePosition: EditEmployeeFormBootstrap['employeePosition'][]
    EmployeeOrganizationalUnit: EditEmployeeFormBootstrap['employeeOrganizationalUnits']
  }>(EDIT_EMPLOYEE_FORM_DATA, { employeeId, structureId })

  return {
    employee: data.Employee?.[0] ?? null,
    employeePosition: data.EmployeePosition?.[0] ?? null,
    employeeOrganizationalUnits: data.EmployeeOrganizationalUnit ?? []
  }
}
