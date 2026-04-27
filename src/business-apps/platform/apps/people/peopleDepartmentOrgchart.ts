import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'

function orgchartApiRoot(): string {
  return ORGCHART_API_URL.replace(/\/$/, '')
}

export type RawOuNode = {
  id?: string
  type?: string
  parentNode?: string
  data?: {
    rank?: number
    organizationalUnitData?: {
      organizationUnitId?: string
      name?: string
      description?: string
      type?: string
      company?: { companyId?: string | null; companyName?: string | null }
      costCenter?: { costCenterId?: string | null; costCenterName?: string | null }
    }
  }
}

export type PeopleOrgchartOuEnrichment = {
  nodeId: string
  parentNodeId?: string | null
  description: string
  companyId?: string | null
  costCenterId?: string | null
  costCenterName?: string | null
  /** Value from orgchart `organizationalUnitData.type` (e.g. DEPARTMENT, TEAM, MANAGEMENT). */
  orgchartUnitType: string
  rank: number
}

export type CreateDepartmentParentContext = {
  parentNodeId: string
  rank: number
}

export async function fetchPeopleOrgchartStructure(
  accessToken: string,
  structureId: string
): Promise<{ nodes: RawOuNode[] }> {
  const url = `${orgchartApiRoot()}/structures/${encodeURIComponent(structureId)}`
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to load structure (${response.status})`)
  }
  const data = (await response.json()) as { nodes?: RawOuNode[] }
  return { nodes: data.nodes ?? [] }
}

function isOrgUnitNode(n: RawOuNode): boolean {
  return n.type === 'organization_unit' && Boolean(n.data?.organizationalUnitData?.organizationUnitId)
}

export function buildOuEnrichmentMap(nodes: RawOuNode[]): Map<string, PeopleOrgchartOuEnrichment> {
  const map = new Map<string, PeopleOrgchartOuEnrichment>()
  for (const n of nodes) {
    if (!isOrgUnitNode(n) || !n.id) continue
    const ou = n.data!.organizationalUnitData!
    const ouId = ou.organizationUnitId!
    const rank = typeof n.data?.rank === 'number' ? n.data.rank : 0
    map.set(ouId, {
      nodeId: n.id,
      parentNodeId: n.parentNode ?? null,
      description: ou.description ?? '',
      companyId: ou.company?.companyId ?? null,
      costCenterId: ou.costCenter?.costCenterId ?? null,
      costCenterName: ou.costCenter?.costCenterName ?? null,
      orgchartUnitType: (ou.type ?? 'DEPARTMENT').toString(),
      rank
    })
  }
  return map
}

/**
 * Resolves parent graph node id and sibling rank for creating a new department/team
 * under management (or the best-effort root org-unit node).
 */
export function resolveCreateDepartmentParentContext(nodes: RawOuNode[]): CreateDepartmentParentContext | null {
  const orgNodes = nodes.filter(isOrgUnitNode)
  if (orgNodes.length === 0) return null

  const managementNodes = orgNodes.filter(
    n => String(n.data?.organizationalUnitData?.type ?? '').toUpperCase() === 'MANAGEMENT'
  )

  const pickParent =
    managementNodes.find(n => !n.parentNode) ?? managementNodes[0] ?? orgNodes.find(n => !n.parentNode) ?? orgNodes[0]

  if (!pickParent?.id) return null

  const parentId = pickParent.id
  const siblings = orgNodes.filter(n => n.parentNode === parentId)
  const rank = siblings.filter(s => typeof s.data?.rank === 'number' && (s.data!.rank as number) >= 0).length
  return { parentNodeId: parentId, rank }
}
