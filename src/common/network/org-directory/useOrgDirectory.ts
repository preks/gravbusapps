import { useState, useEffect } from 'react'
import { OrgDirectoryClient, OrgUser } from './OrgDirectoryClient'

/**
 * Consolidated organizational data types
 */
export interface OrganizationalUnit {
  id: string
  name: string
  type: string
}

export interface MatrixTeam {
  id: string
  name: string
}

export interface Company {
  id: string
  name: string
}

export interface CostCenter {
  id: string
  name: string
}

export interface SiteLocation {
  id: string
  name: string
}

export interface Capability {
  id: string
  name: string
}

export interface OrgDirectoryData {
  users: OrgUser[]
  organizationalUnits: OrganizationalUnit[]
  matrixTeams: MatrixTeam[]
  companies: Company[]
  costCenters: CostCenter[]
  siteLocations: SiteLocation[]
  capabilities: Capability[]
}

export interface UseOrgDirectoryResult {
  data: OrgDirectoryData | null
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Consolidated hook for fetching ALL organizational data in a single efficient call
 * This replaces the need to use multiple separate hooks and reduces API calls from 7 to 1
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing all organizational data, loading state, error state, and refetch function
 */
export const useOrgDirectory = (accessToken: string): UseOrgDirectoryResult => {
  const [data, setData] = useState<OrgDirectoryData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAllData = async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const client = new OrgDirectoryClient(accessToken)

      // Use the optimized method that fetches positions once and extracts all data
      const allData = await client.getAllOrganizationalData()

      setData(allData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch organizational data'
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAllData()
  }, [accessToken])

  return {
    data,
    loading,
    error,
    refetch: () => void fetchAllData()
  }
}
