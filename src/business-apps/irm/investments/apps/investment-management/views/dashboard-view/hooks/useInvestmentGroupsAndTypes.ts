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

      const result = await graphqlClient.request(GET_INVESTMENT_GROUPS_AND_TYPES)

      // Process investment groups - if empty, create from investment type parent references
      let groups: InvestmentGroup[] = (result.investmentGroups || [])
        .map((group: any) => ({
          id: group.id,
          code: group.code,
          value: group.value,
          displayOrder: parseInt(group.additionalValue1 || '0', 10),
          types: []
        }))
        .sort((a: InvestmentGroup, b: InvestmentGroup) => a.displayOrder - b.displayOrder)

      // If no groups found in catalog, create them from investment type parent references
      if (groups.length === 0 && result.investmentTypes?.length > 0) {
        const parentGroupIds = new Set(
          result.investmentTypes.map((type: any) => type.parentEntryId).filter((parentId: string) => parentId)
        )

        groups = Array.from(parentGroupIds)
          .map((parentId: string) => {
            // Extract group info from parent ID (e.g., "InvestmentGroup:v1:EQUITY" -> "EQUITY")
            const parts = parentId.split(':')
            const code = parts[parts.length - 1]
            const value =
              code === 'REAL_ESTATE'
                ? 'RealEstate'
                : code === 'LIQUID_FUND'
                  ? 'Liquid Fund'
                  : code === 'EQUITY'
                    ? 'Equity'
                    : code

            return {
              id: parentId,
              code: code,
              value: value,
              displayOrder: code === 'REAL_ESTATE' ? 1 : code === 'EQUITY' ? 2 : code === 'LIQUID_FUND' ? 3 : 999,
              types: []
            }
          })
          .sort((a: InvestmentGroup, b: InvestmentGroup) => a.displayOrder - b.displayOrder)
      }

      // Process investment types and group them by parent
      const allTypes: InvestmentType[] = (result.investmentTypes || [])
        .map((type: any) => ({
          id: type.id,
          code: type.code,
          value: type.value,
          displayOrder: parseInt(type.additionalValue1 || '0', 10),
          parentGroupId: type.parentEntryId || ''
        }))
        .sort((a: InvestmentType, b: InvestmentType) => a.displayOrder - b.displayOrder)

      // Group types by their parent group ID
      const typesByGroup: Record<string, InvestmentType[]> = {}

      allTypes.forEach(type => {
        if (type.parentGroupId) {
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
