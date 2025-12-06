import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry, BaseCatalogEntry } from '@/common/data/catalog/types/catalogTypes'

/**
 * InvestmentType extends CatalogEntry with a level property and fieldPath
 * Level 0 = InvestmentGroups
 * Level 1 = InvestmentTypes
 * Level 2 = LiquidFundInvestmentTypes
 * Future levels can be added recursively
 */
export type InvestmentType = CatalogEntry & {
  level: number
  fieldPath: string // Form field path (e.g., "investment.investmentType", "liquidFundInvestment.investmentLiquidFundType")
}

/**
 * GraphQL response interface for investment catalog data
 */
interface InvestmentCatalogDataResponse {
  investmentGroups: BaseCatalogEntry[]
  investmentTypes: BaseCatalogEntry[]
  investmentLiquidFundTypes: BaseCatalogEntry[]
}

/**
 * GraphQL query to fetch all investment catalog entries with nested childEntries
 * Optimized to fetch all three catalog types in a single query
 */
const GET_INVESTMENT_TYPES_QUERY = (): string => {
  return `
    query GetInvestmentTypes($activeUserLocale: String!) {
      investmentGroups: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentGroup"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
        childEntries(
          where: {
            catalog: {identifier: {_eq: "InvestmentType"}, version: {_eq: "v1"}}
            isDeleted: {_eq: false}
          }
          orderBy: [{displayOrder: ASC}, {value: ASC}]
        ) {
          id
          code
          value
          alternativeCode
          description
          additionalValue1
          additionalValue2
          additionalValue3
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            id
            localeCode
            value
            additionalValue1
            additionalValue2
            additionalValue3
            objectValue
          }
          type
          displayOrder
          objectValue
          activeFrom
          activeTo
          catalogId
          parentEntryId
          isDeleted
          recordState
          createdAt
          createdBy
          updatedAt
          updatedBy
          childEntries(
            where: {
              catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
              isDeleted: {_eq: false}
            }
            orderBy: [{displayOrder: ASC}, {value: ASC}]
          ) {
            id
            code
            value
            alternativeCode
            description
            additionalValue1
            additionalValue2
            additionalValue3
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              id
              localeCode
              value
              additionalValue1
              additionalValue2
              additionalValue3
              objectValue
            }
            type
            displayOrder
            objectValue
            activeFrom
            activeTo
            catalogId
            parentEntryId
            isDeleted
            recordState
            createdAt
            createdBy
            updatedAt
            updatedBy
          }
        }
      }
      
      investmentTypes: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentType"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
        childEntries(
          where: {
            catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
            isDeleted: {_eq: false}
          }
          orderBy: [{displayOrder: ASC}, {value: ASC}]
        ) {
          id
          code
          value
          alternativeCode
          description
          additionalValue1
          additionalValue2
          additionalValue3
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            id
            localeCode
            value
            additionalValue1
            additionalValue2
            additionalValue3
            objectValue
          }
          type
          displayOrder
          objectValue
          activeFrom
          activeTo
          catalogId
          parentEntryId
          isDeleted
          recordState
          createdAt
          createdBy
          updatedAt
          updatedBy
        }
      }
      
      investmentLiquidFundTypes: CatalogEntry(
        where: {
          catalog: {identifier: {_eq: "InvestmentLiquidFundType"}, version: {_eq: "v1"}}
          isDeleted: {_eq: false}
        }
        orderBy: [{displayOrder: ASC}, {value: ASC}]
      ) {
        id
        code
        value
        alternativeCode
        description
        additionalValue1
        additionalValue2
        additionalValue3
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          id
          localeCode
          value
          additionalValue1
          additionalValue2
          additionalValue3
          objectValue
        }
        type
        displayOrder
        objectValue
        activeFrom
        activeTo
        catalogId
        parentEntryId
        isDeleted
        recordState
        createdAt
        createdBy
        updatedAt
        updatedBy
      }
    }
  `
}

/**
 * Convert BaseCatalogEntry to CatalogEntry with computed fields
 * Note: childEntries are handled separately in processEntries
 */
const toCatalogEntry = (entry: BaseCatalogEntry, level: number, childEntries?: CatalogEntry[]): CatalogEntry => {
  const displayValue = entry.value || entry.code || entry.id || ''
  const translations = entry.translations || []
  const translatedValue = translations.find(t => t.localeCode)?.value || displayValue

  // Create entry without childEntries first
  const entryWithoutChildren = { ...entry }
  delete entryWithoutChildren.childEntries

  return {
    ...entryWithoutChildren,
    displayValue: translatedValue || displayValue,
    hasChildren: (childEntries?.length || 0) > 0,
    level,
    searchableText: [
      entry.value,
      entry.code,
      entry.alternativeCode,
      entry.description,
      entry.additionalValue1,
      entry.additionalValue2,
      entry.additionalValue3
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
    childEntries
  }
}

/**
 * Get field path for a type based on level and group code
 */
const getFieldPathForType = (level: number, groupCode?: string | null): string => {
  if (level === 0) {
    return 'investment.investmentGroup'
  }
  if (level === 1) {
    return 'investment.investmentType'
  }
  if (level === 2) {
    // Level 2 depends on group code
    if (groupCode === 'LIQUID_FUND') {
      return 'liquidFundInvestment.investmentLiquidFundType'
    }
    // For other groups, level 2 might not exist, return empty string
    return ''
  }
  // Future levels - would need to be configured
  return ''
}

/**
 * Get group code from parent entry ID
 */
const getGroupCodeFromParentId = (parentId: string | null | undefined, allTypes: InvestmentType[]): string | null => {
  if (!parentId) return null

  // Find parent in allTypes
  const parent = allTypes.find(t => t.id === parentId)
  if (!parent) return null

  // If parent is level 0, extract code from ID
  if (parent.level === 0) {
    return parent.code || parent.id.split(':').pop() || null
  }

  // If parent is level 1, find its parent (group)
  if (parent.level === 1 && parent.parentEntryId) {
    return getGroupCodeFromParentId(parent.parentEntryId, allTypes)
  }

  return null
}

/**
 * Recursively process catalog entries and assign levels and fieldPaths
 */
const processEntries = (
  entries: BaseCatalogEntry[],
  level: number,
  allTypes: InvestmentType[],
  parentGroupCode?: string | null
): InvestmentType[] => {
  const result: InvestmentType[] = []

  for (const entry of entries) {
    // Determine group code for this level
    let currentGroupCode = parentGroupCode
    if (level === 0) {
      // Level 0 is the group itself, extract code
      currentGroupCode = entry.code || entry.id.split(':').pop() || null
    }

    // Process child entries recursively first
    let childCatalogEntries: CatalogEntry[] | undefined
    if (entry.childEntries && entry.childEntries.length > 0) {
      const childLevel = level + 1
      const childTypes = processEntries(entry.childEntries, childLevel, allTypes, currentGroupCode)
      // Convert childTypes to CatalogEntry[] for childEntries
      childCatalogEntries = childTypes.map(child => {
        const childChildren = child.childEntries
        const childWithoutChildren = { ...child }
        delete childWithoutChildren.childEntries
        delete childWithoutChildren.fieldPath
        return toCatalogEntry(childWithoutChildren as BaseCatalogEntry, childLevel, childChildren)
      })
      result.push(...childTypes)
    }

    // Create catalog entry with processed children
    const catalogEntry = toCatalogEntry(entry, level, childCatalogEntries)

    // Determine field path
    const fieldPath = getFieldPathForType(level, currentGroupCode)

    const investmentType: InvestmentType = {
      ...catalogEntry,
      level,
      fieldPath
    }

    result.push(investmentType)
  }

  return result
}

/**
 * Build unified tree hierarchy from GraphQL response
 */
const buildInvestmentTypesTree = (data: InvestmentCatalogDataResponse): InvestmentType[] => {
  const allTypes: InvestmentType[] = []

  // Process InvestmentGroups (level 0) with nested children
  if (data.investmentGroups) {
    const groupTypes = processEntries(data.investmentGroups, 0, allTypes, null)
    allTypes.push(...groupTypes)
  }

  // Process InvestmentTypes (level 1) that might not be in groups
  if (data.investmentTypes) {
    // For standalone types, we need to find their group code from parentEntryId
    const typeTypes = data.investmentTypes
      .map(entry => {
        const groupCode = getGroupCodeFromParentId(entry.parentEntryId, allTypes)
        return processEntries([entry], 1, allTypes, groupCode)
      })
      .flat()

    // Only add types that aren't already added as children of groups
    const existingIds = new Set(allTypes.map(t => t.id))
    const newTypes = typeTypes.filter(t => !existingIds.has(t.id))
    allTypes.push(...newTypes)
  }

  // Process LiquidFundInvestmentTypes (level 2) that might not be in types
  if (data.investmentLiquidFundTypes) {
    // For standalone liquid fund types, we need to find their group code through parent chain
    const liquidFundTypes = data.investmentLiquidFundTypes
      .map(entry => {
        const groupCode = getGroupCodeFromParentId(entry.parentEntryId, allTypes)
        return processEntries([entry], 2, allTypes, groupCode)
      })
      .flat()

    // Only add types that aren't already added as children
    const existingIds = new Set(allTypes.map(t => t.id))
    const newTypes = liquidFundTypes.filter(t => !existingIds.has(t.id))
    allTypes.push(...newTypes)
  }

  return allTypes
}

/**
 * Hook return interface
 */
export interface UseInvestmentTypesReturn {
  types: InvestmentType[]
  loading: boolean
  error: string | null
  getTypesByLevel: (level: number) => InvestmentType[]
  getTypesByParent: (parentId: string) => InvestmentType[]
  refetch: () => Promise<void>
}

/**
 * Hook to fetch and manage investment types as a unified tree hierarchy
 *
 * @param context - Business app context with access token
 * @returns Investment types with helper functions
 *
 * @example
 * ```tsx
 * const { types, getTypesByLevel, getTypesByParent } = useInvestmentTypes(businessAppContext)
 *
 * // Get all groups (level 0)
 * const groups = getTypesByLevel(0)
 *
 * // Get types by parent ID
 * const types = getTypesByParent(groupId)
 * ```
 */
export const useInvestmentTypes = (context: BusinessAppContextProps): UseInvestmentTypesReturn => {
  const [types, setTypes] = useState<InvestmentType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTypes = useCallback(async (): Promise<void> => {
    if (!context.accessToken) {
      setTypes([])
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const activeUserLocale = getCurrentActiveUserLocale() || 'en'
      const query = GET_INVESTMENT_TYPES_QUERY()

      const result = await graphqlClient.request<InvestmentCatalogDataResponse>(query, {
        activeUserLocale
      })

      const investmentTypes = buildInvestmentTypesTree(result)
      setTypes(investmentTypes)
    } catch (err) {
      console.error('Error fetching investment types:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setTypes([])
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    fetchInvestmentTypes()
  }, [fetchInvestmentTypes])

  // Helper function to get types by level
  const getTypesByLevel = useCallback(
    (level: number): InvestmentType[] => {
      return types.filter(type => type.level === level)
    },
    [types]
  )

  // Helper function to get types by parent ID
  const getTypesByParent = useCallback(
    (parentId: string): InvestmentType[] => {
      return types.filter(type => type.parentEntryId === parentId)
    },
    [types]
  )

  return {
    types,
    loading,
    error,
    getTypesByLevel,
    getTypesByParent,
    refetch: fetchInvestmentTypes
  }
}
