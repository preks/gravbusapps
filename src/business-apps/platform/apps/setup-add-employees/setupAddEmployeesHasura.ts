import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

export type SetupAddEmployeesOuType = 'DEPARTMENT' | 'MANAGEMENT' | 'TEAM'

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function buildOrganizationalUnitWhere(structureId: string, search: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    structureId: { _eq: structureId },
    isDeleted: { _eq: false }
  }
  const q = search.trim()
  if (!q) return base
  const pattern = `%${escapeIlike(q)}%`
  return {
    _and: [base, { name: { _ilike: pattern } }]
  }
}

/**
 * Paged non-deleted organizational units for the structure (any `type`).
 * UI presents these uniformly as “departments”.
 */
const ORG_UNITS_FOR_STRUCTURE_PAGE = `
  query SetupAddEmployeesOrgUnitsPage($where: OrganizationalUnitBoolExp!, $limit: Int!, $offset: Int!) {
    OrganizationalUnit(where: $where, limit: $limit, offset: $offset, orderBy: { name: ASC }) {
      id
      name
      type
    }
    OrganizationalUnitAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

const MANAGER_COUNT_FOR_OU = `
  query SetupAddEmployeesManagerCount($structureId: uuid!, $organizationalUnitId: uuid!) {
    EmployeeOrganizationalUnitAggregate(
      where: {
        structureId: { _eq: $structureId }
        organizationalUnitId: { _eq: $organizationalUnitId }
        role: { _eq: "Manager" }
        employee: { isDeleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

/** Managers in an OU excluding one employee (for edit flow: allow keeping own manager role). */
const MANAGER_COUNT_FOR_OU_EXCLUDING_EMPLOYEE = `
  query SetupAddEmployeesManagerCountExcluding($structureId: uuid!, $organizationalUnitId: uuid!, $excludeEmployeeId: uuid!) {
    EmployeeOrganizationalUnitAggregate(
      where: {
        structureId: { _eq: $structureId }
        organizationalUnitId: { _eq: $organizationalUnitId }
        role: { _eq: "Manager" }
        employeeId: { _neq: $excludeEmployeeId }
        employee: { isDeleted: { _eq: false } }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export type SetupAddEmployeesOuRow = { id: string; name: string; type?: string | null }

export type FetchOrganizationalUnitsPageParams = {
  limit: number
  offset: number
  /** Filter by name (case-insensitive partial match). */
  search?: string
}

export async function fetchOrganizationalUnitsForStructurePage(
  accessToken: string,
  structureId: string,
  params: FetchOrganizationalUnitsPageParams
): Promise<{ rows: SetupAddEmployeesOuRow[]; totalCount: number }> {
  const { limit, offset, search = '' } = params
  graphQLClient.setAccessToken(accessToken)
  const where = buildOrganizationalUnitWhere(structureId, search)
  const data = await graphQLClient.request<{
    OrganizationalUnit: SetupAddEmployeesOuRow[]
    OrganizationalUnitAggregate: { aggregate: { count: number } | null } | null
  }>(ORG_UNITS_FOR_STRUCTURE_PAGE, {
    where,
    limit,
    offset
  })
  return {
    rows: data.OrganizationalUnit ?? [],
    totalCount: data.OrganizationalUnitAggregate?.aggregate?.count ?? 0
  }
}

/** Loads up to 500 departments in one request (legacy callers). Prefer {@link fetchOrganizationalUnitsForStructurePage} for paging. */
export async function fetchOrganizationalUnitsForStructure(
  accessToken: string,
  structureId: string
): Promise<SetupAddEmployeesOuRow[]> {
  const { rows } = await fetchOrganizationalUnitsForStructurePage(accessToken, structureId, {
    limit: 500,
    offset: 0,
    search: ''
  })
  return rows
}

export async function countManagersForOrganizationalUnit(
  accessToken: string,
  structureId: string,
  organizationalUnitId: string
): Promise<number> {
  graphQLClient.setAccessToken(accessToken)
  const data = await graphQLClient.request<{
    EmployeeOrganizationalUnitAggregate: { aggregate: { count: number } | null } | null
  }>(MANAGER_COUNT_FOR_OU, { structureId, organizationalUnitId })
  return data.EmployeeOrganizationalUnitAggregate?.aggregate?.count ?? 0
}

export async function countManagersForOrganizationalUnitExcludingEmployee(
  accessToken: string,
  structureId: string,
  organizationalUnitId: string,
  excludeEmployeeId: string
): Promise<number> {
  graphQLClient.setAccessToken(accessToken)
  const data = await graphQLClient.request<{
    EmployeeOrganizationalUnitAggregate: { aggregate: { count: number } | null } | null
  }>(MANAGER_COUNT_FOR_OU_EXCLUDING_EMPLOYEE, {
    structureId,
    organizationalUnitId,
    excludeEmployeeId
  })
  return data.EmployeeOrganizationalUnitAggregate?.aggregate?.count ?? 0
}
