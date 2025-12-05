import { useState, useCallback } from 'react'
import { OrgDirectoryClient, OrgUserBasic } from '@/common/network/org-directory/OrgDirectoryClient'

export type DimensionType = 'organization_unit' | 'matrix_team' | 'location' | 'legal_entity' | 'capability'

export interface DimensionOption {
  id: string
  name: string
  type?: string // For org units (DEPARTMENT, TEAM, etc.)
}

export interface DimensionWithMembers extends DimensionOption {
  memberCount?: number
}

export interface UseOrganizationalDimensionsResult {
  // Dimension options
  organizationalUnits: DimensionOption[]
  matrixTeams: DimensionOption[]
  locations: DimensionOption[]
  legalEntities: DimensionOption[]
  capabilities: DimensionOption[]

  // Loading states
  isLoadingDimensions: boolean
  isLoadingMembers: boolean

  // Error state
  error: string | null

  // Members from selected dimension
  selectedMembers: OrgUserBasic[]

  // Actions
  loadDimensions: () => Promise<void>
  loadMembersByDimension: (type: DimensionType, dimensionId: string) => Promise<OrgUserBasic[]>
  clearMembers: () => void
}

/**
 * Hook to fetch organizational dimensions (org units, matrix teams, locations, legal entities, capabilities)
 * and their members for group chat creation
 */
export const useOrganizationalDimensions = (accessToken: string): UseOrganizationalDimensionsResult => {
  const [organizationalUnits, setOrganizationalUnits] = useState<DimensionOption[]>([])
  const [matrixTeams, setMatrixTeams] = useState<DimensionOption[]>([])
  const [locations, setLocations] = useState<DimensionOption[]>([])
  const [legalEntities, setLegalEntities] = useState<DimensionOption[]>([])
  const [capabilities, setCapabilities] = useState<DimensionOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<OrgUserBasic[]>([])
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Load all dimension options (org units, matrix teams, locations, legal entities, capabilities)
   */
  const loadDimensions = useCallback(async () => {
    if (!accessToken) {
      setError('No access token provided')
      return
    }

    setIsLoadingDimensions(true)
    setError(null)

    try {
      const client = new OrgDirectoryClient(accessToken)

      // Fetch all dimensions in parallel
      const [units, teams, locs, companies, caps] = await Promise.all([
        client.getOrganizationalUnits(),
        client.getMatrixTeams(),
        client.getSiteLocations(),
        client.getCompanies(),
        client.getCapabilities()
      ])

      // Sort by name
      const sortByName = (a: DimensionOption, b: DimensionOption) => a.name.localeCompare(b.name)

      setOrganizationalUnits(units.sort(sortByName))
      setMatrixTeams(teams.sort(sortByName))
      setLocations(locs.sort(sortByName))
      setLegalEntities(companies.sort(sortByName))
      setCapabilities(caps.sort(sortByName))
    } catch (err) {
      console.error('Error loading organizational dimensions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load organizational dimensions')
    } finally {
      setIsLoadingDimensions(false)
    }
  }, [accessToken])

  /**
   * Load members by dimension type and ID
   */
  const loadMembersByDimension = useCallback(
    async (type: DimensionType, dimensionId: string): Promise<OrgUserBasic[]> => {
      if (!accessToken || !dimensionId) {
        return []
      }

      setIsLoadingMembers(true)
      setError(null)

      try {
        const client = new OrgDirectoryClient(accessToken)
        let members: OrgUserBasic[] = []

        switch (type) {
          case 'organization_unit':
            members = await client.getUsersByOrganizationalUnit(dimensionId)
            break
          case 'matrix_team':
            members = await client.getUsersByMatrixTeam(dimensionId)
            break
          case 'location':
            members = await client.getUsersBySiteLocation(dimensionId)
            break
          case 'legal_entity':
            members = await client.getUsersByCompany(dimensionId)
            break
          case 'capability':
            members = await client.getUsersByCapability(dimensionId)
            break
        }

        // Sort by name
        members.sort((a, b) => a.name.localeCompare(b.name))
        setSelectedMembers(members)
        return members
      } catch (err) {
        console.error(`Error loading members for ${type}:`, err)
        setError(err instanceof Error ? err.message : `Failed to load members for ${type}`)
        return []
      } finally {
        setIsLoadingMembers(false)
      }
    },
    [accessToken]
  )

  /**
   * Clear selected members
   */
  const clearMembers = useCallback(() => {
    setSelectedMembers([])
  }, [])

  return {
    organizationalUnits,
    matrixTeams,
    locations,
    legalEntities,
    capabilities,
    isLoadingDimensions,
    isLoadingMembers,
    error,
    selectedMembers,
    loadDimensions,
    loadMembersByDimension,
    clearMembers
  }
}
