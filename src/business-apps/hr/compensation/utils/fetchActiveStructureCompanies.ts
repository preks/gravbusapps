import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { OrgchartClient } from '@/common/network/orgchart/OrgchartClient'

export interface StructureCompany {
  id: string
  name: string
  code: string
}

interface OrgchartCompanyNode {
  id: string
  type: string
  parentNode?: string
  data: {
    companyData: {
      id: string
      name: string
      code: string
    }
    numberOfAssignedEmployees: number
  }
}

interface OrgchartStructureResponse {
  nodes: OrgchartCompanyNode[]
  edges: Array<{ id: string; source: string; target: string }>
}

const GET_ACTIVE_STRUCTURE = `
  query GetActiveStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
      name
    }
  }
`

/**
 * Loads legal entities from the active organizational structure.
 * Uses orgchart API paths (`…/orgchart/api/v1/structures/...`), not the app root.
 */
export async function fetchActiveStructureCompanies(
  graphqlClient: GraphQLClient,
  orgchartClient: OrgchartClient
): Promise<StructureCompany[]> {
  const structureResult = await graphqlClient.request<{
    Structure: Array<{ id: string; name: string }>
  }>(GET_ACTIVE_STRUCTURE)

  const structureId = structureResult.Structure?.[0]?.id
  if (!structureId) {
    throw new Error('No active structure found')
  }

  const response = await orgchartClient.getStructure<OrgchartStructureResponse>(structureId, {
    nodeType: 'company'
  })

  return response.nodes
    .filter(node => node.type === 'company')
    .map(node => ({
      id: node.data.companyData.id,
      name: node.data.companyData.name,
      code: node.data.companyData.code || ''
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
