import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { SetupAddEmployeesOuType } from '../setup-add-employees/setupAddEmployeesHasura'

/** Row for People employees tab (sourced from `hrActiveEmployees` dataset). */
export type PeopleEmployeeRow = {
  id: string
  /** Keycloak / directory user id when synced; required for password reset and deactivate. */
  userId?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  /** Work e-mail from dataset (`work_email`); preferred over legacy communication for this list. */
  workEmail?: string | null
  /** Job title from dataset (`job_title`). */
  jobTitle?: string | null
}

export type PeoplePagedResult<T> = { rows: T[]; totalCount: number }

/** Organizational unit row for People (departments list), including assigned Manager role. */
export type PeopleOrganizationalUnitRow = {
  id: string
  name: string
  type?: string | null
  /** Display string for employee(s) with Manager role on this OU; null if none. */
  managerDisplayName: string | null
}

type PeopleOuManagerLinkGql = {
  employee?: {
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
}

function groupManagersByOrganizationalUnitId(
  rows: Array<{ organizationalUnitId?: string | null; employee?: PeopleOuManagerLinkGql['employee'] } | null>
): Map<string, PeopleOuManagerLinkGql[]> {
  const map = new Map<string, PeopleOuManagerLinkGql[]>()
  for (const row of rows) {
    if (!row?.organizationalUnitId) continue
    const ouId = row.organizationalUnitId
    const entry: PeopleOuManagerLinkGql = { employee: row.employee }
    const list = map.get(ouId) ?? []
    list.push(entry)
    map.set(ouId, list)
  }
  return map
}

function formatManagerDisplayName(links: Array<PeopleOuManagerLinkGql | null> | null | undefined): string | null {
  if (!links?.length) return null
  const names: string[] = []
  for (const link of links) {
    if (!link) continue
    const e = link.employee
    if (!e) continue
    const dn = e.displayName?.trim()
    if (dn) {
      names.push(dn)
      continue
    }
    const fn = e.firstName?.trim() ?? ''
    const ln = e.lastName?.trim() ?? ''
    const full = `${fn} ${ln}`.trim()
    if (full) names.push(full)
  }
  return names.length > 0 ? names.join(', ') : null
}

function escapeIlike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function buildOrganizationalUnitWhere(
  structureId: string,
  type: SetupAddEmployeesOuType | undefined,
  search: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    structureId: { _eq: structureId },
    isDeleted: { _eq: false }
  }
  if (type) {
    base.type = { _eq: type }
  }
  const q = search.trim()
  if (!q) return base
  const pattern = `%${escapeIlike(q)}%`
  return {
    _and: [base, { name: { _ilike: pattern } }]
  }
}

function buildOrganizationalUnitOrderBy(
  sortColumnId: string | null,
  sortDesc: boolean
): Array<Record<string, unknown>> {
  const dir = sortDesc ? 'DESC' : 'ASC'
  if (sortColumnId === 'name') {
    return [{ name: dir }]
  }
  return [{ name: 'ASC' }]
}

const PEOPLE_ORG_UNITS_PAGE = `
  query PeopleOrgUnitsPage($where: OrganizationalUnitBoolExp!, $limit: Int!, $offset: Int!, $orderBy: [OrganizationalUnitOrderBy!]!) {
    OrganizationalUnit(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
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

/** Managers for a set of OUs (no nested field on OrganizationalUnit in this Hasura schema). */
const PEOPLE_ORG_UNIT_MANAGERS = `
  query PeopleOrgUnitManagers($structureId: uuid!, $ouIds: [uuid!]!) {
    EmployeeOrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        organizationalUnitId: { _in: $ouIds }
        role: { _eq: "Manager" }
        employee: { isDeleted: { _eq: false } }
      }
      limit: 200
    ) {
      organizationalUnitId
      employee {
        displayName
        firstName
        lastName
      }
    }
  }
`

export async function fetchOrganizationalUnitsPage(
  accessToken: string,
  params: {
    structureId: string
    /** When omitted, loads all organizational unit types (presented as departments in the UI). */
    type?: SetupAddEmployeesOuType
    limit: number
    offset: number
    search: string
    sortColumnId: string | null
    sortDesc: boolean
  }
): Promise<PeoplePagedResult<PeopleOrganizationalUnitRow>> {
  const { structureId, type, limit, offset, search, sortColumnId, sortDesc } = params
  graphQLClient.setAccessToken(accessToken)
  const where = buildOrganizationalUnitWhere(structureId, type, search)
  const orderBy = buildOrganizationalUnitOrderBy(sortColumnId, sortDesc)
  const data = await graphQLClient.request<{
    OrganizationalUnit: Array<{
      id: string
      name: string
      type?: string | null
    }>
    OrganizationalUnitAggregate: { aggregate: { count: number } | null } | null
  }>(PEOPLE_ORG_UNITS_PAGE, {
    where,
    limit,
    offset,
    orderBy
  })
  const raw = data.OrganizationalUnit ?? []
  const ouIds = raw.map(ou => ou.id).filter(Boolean)

  let managersByOuId = new Map<string, PeopleOuManagerLinkGql[]>()
  if (ouIds.length > 0) {
    const mgrData = await graphQLClient.request<{
      EmployeeOrganizationalUnit: Array<{
        organizationalUnitId?: string | null
        employee?: PeopleOuManagerLinkGql['employee']
      } | null>
    }>(PEOPLE_ORG_UNIT_MANAGERS, {
      structureId,
      ouIds
    })
    managersByOuId = groupManagersByOrganizationalUnitId(mgrData.EmployeeOrganizationalUnit ?? [])
  }

  return {
    rows: raw.map(ou => ({
      id: ou.id,
      name: ou.name,
      type: ou.type,
      managerDisplayName: formatManagerDisplayName(managersByOuId.get(ou.id) ?? null)
    })),
    totalCount: data.OrganizationalUnitAggregate?.aggregate?.count ?? 0
  }
}
