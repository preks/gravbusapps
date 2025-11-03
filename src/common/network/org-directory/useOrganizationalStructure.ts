import { useState, useEffect } from 'react'
import { OrgDirectoryClient } from './OrgDirectoryClient'

interface OrganizationalUnit {
  id: string
  name: string
  type: string
}

interface MatrixTeam {
  id: string
  name: string
}

interface UseOrganizationalStructureResult {
  organizationalUnits: OrganizationalUnit[]
  matrixTeams: MatrixTeam[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching organizational structure (departments and matrix teams) via GraphQL
 * Uses the same queries as custom-flow-engine for consistency
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing organizational data, loading state, error state, and refetch function
 */
export const useOrganizationalStructure = (accessToken: string): UseOrganizationalStructureResult => {
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [matrixTeams, setMatrixTeams] = useState<MatrixTeam[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStructure = async () => {
    if (!accessToken) {
      console.log('useOrganizationalStructure: No access token, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('useOrganizationalStructure: Fetching organizational structure from GraphQL...')
      const client = new OrgDirectoryClient(accessToken)

      // Fetch both organizational units and matrix teams in parallel
      const [units, teams] = await Promise.all([client.getOrganizationalUnits(), client.getMatrixTeams()])

      console.log(
        'useOrganizationalStructure: Successfully fetched',
        units.length,
        'organizational units and',
        teams.length,
        'matrix teams'
      )
      setOrganizationalUnits(units)
      setMatrixTeams(teams)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organizational structure'
      console.error('useOrganizationalStructure: Error fetching structure:', errorMessage)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStructure()
  }, [accessToken])

  return {
    organizationalUnits,
    matrixTeams,
    loading,
    error,
    refetch: () => void fetchStructure()
  }
}
