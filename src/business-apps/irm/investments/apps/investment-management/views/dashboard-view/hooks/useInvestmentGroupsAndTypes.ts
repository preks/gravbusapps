import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface InvestmentType {
  id: string
  code: string
  value: string
  displayOrder: number
  parentGroupId: string
}

export interface InvestmentGroup {
  id: string
  code: string
  value: string
  displayOrder: number
  types: InvestmentType[]
}

export interface InvestmentGroupsAndTypesData {
  groups: InvestmentGroup[]
  typesByGroup: Record<string, InvestmentType[]>
}

const GET_INVESTMENT_GROUPS_AND_TYPES = `
  query GetInvestmentGroupsAndTypes {
    # Get all investment groups
    investmentGroups: CatalogEntry(
      where: {
        catalog: { name: { _eq: "Investment Group" } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ additionalValue1: ASC }, { value: ASC }]
    ) {
      id
      code
      value
      additionalValue1
      displayOrder
    }
    
    # Get all investment types with their parent group references
    investmentTypes: CatalogEntry(
      where: {
        catalog: { name: { _eq: "Investment Type" } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ additionalValue1: ASC }, { value: ASC }]
    ) {
      id
      code
      value
      additionalValue1
      displayOrder
      parentEntryId
    }
    
    # Get investment group permissions to determine which groups are allowed
    investmentGroupPermissions: InvestmentGroupPermission {
      investmentGroupRef
    }
  }
`

export const useInvestmentGroupsAndTypes = (accessToken: string) => {
  const [data, setData] = useState<InvestmentGroupsAndTypesData>({
    groups: [],
    typesByGroup: {}
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Process investment groups directly from catalog
      const result = await graphqlClient.request(GET_INVESTMENT_GROUPS_AND_TYPES)

      // Compute permitted group set from permissions
      const investmentGroupPermissionMap: Record<string, boolean> = {}
      ;(result.investmentGroupPermissions || []).forEach((p: any) => {
        investmentGroupPermissionMap[p?.investmentGroupRef] = true
      })

      // Process and filter investment groups directly from catalog
      const groups: InvestmentGroup[] = (result.investmentGroups || [])
        .filter((g: any) => !!investmentGroupPermissionMap[g.id])
        .map((group: any) => ({
          id: group.id,
          code: group.code,
          value: group.value,
          displayOrder: group.displayOrder || parseInt(group.additionalValue1 || '0', 10),
          types: []
        }))
        .sort((a: InvestmentGroup, b: InvestmentGroup) => a.displayOrder - b.displayOrder)

      // Process investment types and group them by parent
      // Process investment types and filter to permitted parent groups only
      const allTypes: InvestmentType[] = (result.investmentTypes || [])
        .map((type: any) => ({
          id: type.id,
          code: type.code,
          value: type.value,
          displayOrder: type.displayOrder || parseInt(type.additionalValue1 || '0', 10),
          parentGroupId: type.parentEntryId || ''
        }))
        .sort((a: InvestmentType, b: InvestmentType) => a.displayOrder - b.displayOrder)

      // Group types by their parent group ID
      const typesByGroup: Record<string, InvestmentType[]> = {}

      allTypes.forEach(type => {
        if (type.parentGroupId && !!investmentGroupPermissionMap[type.parentGroupId]) {
          if (!typesByGroup[type.parentGroupId]) {
            typesByGroup[type.parentGroupId] = []
          }
          typesByGroup[type.parentGroupId].push(type)
        }
      })

      // Add types to their respective groups
      const groupsWithTypes = groups.map(group => ({
        ...group,
        types: typesByGroup[group.id] || []
      }))

      setData({
        groups: groupsWithTypes,
        typesByGroup
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch investment groups and types'
      setError(errorMessage)
      console.error('Error fetching investment groups and types:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  }
}
