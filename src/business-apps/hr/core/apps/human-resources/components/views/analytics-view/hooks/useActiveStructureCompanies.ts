import { useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface ActiveStructureCompany {
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

export function useActiveStructureCompanies(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)
  const [companies, setCompanies] = useState<ActiveStructureCompany[]>([])
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

        const response = await orgchartClient.getStructure<OrgchartStructureResponse>(structureId, {
          nodeType: 'company'
        })

        const companyNodes = response.nodes.filter(n => n.type === 'company')
        const result: ActiveStructureCompany[] = companyNodes
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
  }, [accessToken, graphqlClient, orgchartClient])

  return { companies, loading, error }
}
