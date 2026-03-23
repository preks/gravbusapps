import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

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

const ORGCHART_BASE_URL = env('NEXT_PUBLIC_ORGCHART_API_URL') ?? ''

const GET_ACTIVE_STRUCTURE = `
  query GetActiveStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
      name
    }
  }
`

/**
 * Fetches legal entities from the active organizational structure,
 * following the same pattern as payroll's useCompanyList.
 */
export function useActiveStructureCompanies(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(ORGCHART_BASE_URL)
  const [companies, setCompanies] = useState<StructureCompany[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const structureResult = await graphqlClient.request<{
          Structure: Array<{ id: string; name: string }>
        }>(GET_ACTIVE_STRUCTURE)

        const structureId = structureResult.Structure?.[0]?.id
        if (!structureId) throw new Error('No active structure found')

        const response = await restClient.get<OrgchartStructureResponse>(`/structures/${structureId}`, {
          params: { nodeType: 'company' },
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        const companyNodes = response.nodes.filter(n => n.type === 'company')

        const result: StructureCompany[] = companyNodes
          .map(node => ({
            id: node.data.companyData.id,
            name: node.data.companyData.name,
            code: node.data.companyData.code || ''
          }))
          .sort((a, b) => a.name.localeCompare(b.name))

        if (!cancelled) {
          setCompanies(result)
          setError(null)
        }
      } catch (err) {
        console.error('Failed to load companies from active structure:', err)
        if (!cancelled) {
          setCompanies([])
          setError(err instanceof Error ? err.message : 'Failed to load companies')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, restClient])

  return { companies, loading, error }
}
