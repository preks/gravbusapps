import { graphQLClient } from '@/common/network/graphql/GraphQLClient'
import { buildOuEnrichmentMap, fetchPeopleOrgchartStructure, type RawOuNode } from './peopleDepartmentOrgchart'

function isOrgUnitNode(n: RawOuNode): boolean {
  return n.type === 'organization_unit' && Boolean(n.data?.organizationalUnitData?.organizationUnitId)
}

/** Nested aggregates on `OrganizationalUnit` so tenants without root `EmployeeOrganizationalUnit*` still work. */
const PEOPLE_OU_DELETE_FEASIBILITY = `
  query PeopleOuDeleteFeasibility($structureId: uuid!, $ouId: uuid!) {
    OrganizationalUnit(
      where: {
        id: { _eq: $ouId }
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
      }
      limit: 1
    ) {
      id
      withEmployee: organizationalUnitEmployeeAggregate(
        where: { employeeId: { _isNull: false } }
      ) {
        aggregate {
          count
        }
      }
      withJobPosition: organizationalUnitEmployeeAggregate(
        where: { jobPositionId: { _isNull: false } }
      ) {
        aggregate {
          count
        }
      }
    }
  }
`

export type PeopleOuDeleteFeasibility = {
  rowsWithEmployee: number
  rowsWithJobPosition: number
  /** True when no Hasura row has an employee or job-title assignment on this OU (matches orgchart delete pre-check). */
  hasNoBlockingAssignments: boolean
  hasOrgchartNode: boolean
  /** Graph parent exists; required for the orgchart service delete path. */
  hasGraphParent: boolean
  childOrgUnitNodeCount: number
  /** Org chart structure request failed (parent/node checks may be incomplete). */
  structureLoadFailed: boolean
  /** True when the user should be allowed to attempt delete (preview); backend remains authoritative. */
  canDeleteByPreview: boolean
}

function countChildOrgUnitNodes(nodes: RawOuNode[], parentNodeId: string): number {
  return nodes.filter(n => isOrgUnitNode(n) && n.parentNode === parentNodeId).length
}

export async function fetchPeopleOuDeleteFeasibility(
  accessToken: string,
  structureId: string,
  organizationalUnitId: string
): Promise<PeopleOuDeleteFeasibility> {
  graphQLClient.setAccessToken(accessToken)

  const [gqlResult, structureResult] = await Promise.allSettled([
    graphQLClient.request<{
      OrganizationalUnit: Array<{
        id: string
        withEmployee?: { aggregate: { count: number } | null } | null
        withJobPosition?: { aggregate: { count: number } | null } | null
      } | null>
    }>(PEOPLE_OU_DELETE_FEASIBILITY, { structureId, ouId: organizationalUnitId }),
    fetchPeopleOrgchartStructure(accessToken, structureId)
  ])

  let rowsWithEmployee = 0
  let rowsWithJobPosition = 0
  if (gqlResult.status === 'fulfilled') {
    const ouRow = gqlResult.value.OrganizationalUnit?.[0]
    rowsWithEmployee = ouRow?.withEmployee?.aggregate?.count ?? 0
    rowsWithJobPosition = ouRow?.withJobPosition?.aggregate?.count ?? 0
  } else {
    throw gqlResult.reason instanceof Error ? gqlResult.reason : new Error('Feasibility query failed')
  }

  let hasOrgchartNode = false
  let hasGraphParent = false
  let childOrgUnitNodeCount = 0
  let structureLoadFailed = false
  if (structureResult.status === 'fulfilled') {
    const nodes = structureResult.value.nodes ?? []
    const map = buildOuEnrichmentMap(nodes)
    const e = map.get(organizationalUnitId)
    if (e?.nodeId) {
      hasOrgchartNode = true
      hasGraphParent = Boolean(e.parentNodeId)
      childOrgUnitNodeCount = countChildOrgUnitNodes(nodes, e.nodeId)
    }
  } else {
    structureLoadFailed = true
  }

  const hasNoBlockingAssignments = rowsWithEmployee === 0 && rowsWithJobPosition === 0
  const canDeleteByPreview = hasNoBlockingAssignments && hasOrgchartNode && hasGraphParent && !structureLoadFailed

  return {
    rowsWithEmployee,
    rowsWithJobPosition,
    hasNoBlockingAssignments,
    hasOrgchartNode,
    hasGraphParent,
    childOrgUnitNodeCount,
    structureLoadFailed,
    canDeleteByPreview
  }
}

/** Strip RestClient error prefix for matching. */
function restErrorBody(message: string): string {
  return message.replace(/^REST request failed:\s*\d+\s*-\s*/i, '').trim()
}

/**
 * Maps orgchart delete failures to localized copy; falls back to server message.
 */
export function mapOrgchartOrganizationalUnitDeleteError(
  err: unknown,
  translate: (key: string, vars?: Record<string, string | number>) => string
): string {
  let msg = ''
  if (typeof err === 'object' && err !== null && 'responseData' in err) {
    const m = (err as { responseData?: { message?: string } }).responseData?.message?.trim()
    if (m) msg = m
  }
  if (!msg && err instanceof Error) msg = restErrorBody(err.message)
  if (!msg) msg = String(err)

  if (/cannot be deleted as it currently has assigned employees or job positions/i.test(msg)) {
    return translate('department-delete-error-backend-assignments')
  }
  if (/Organizational unit not found/i.test(msg) || /ORG_UNIT_NOT_FOUND/i.test(msg)) {
    return translate('department-delete-error-org-unit-not-found')
  }
  if (/Node not found/i.test(msg)) {
    return translate('department-delete-error-node-not-found')
  }

  return msg || translate('error-load')
}
