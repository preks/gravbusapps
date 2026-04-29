import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

/**
 * Strategy pattern for determining sub-sections within a report tab
 */
export type SubSectionStrategy = 'investmentTypes' | 'liquidFundTypes' | 'none'

/**
 * Interface for a sub-section within a report tab
 */
export interface SubSection {
  id: string // URL-friendly identifier (e.g., 'venture-capital')
  code: string // Catalog code (e.g., 'VENTURE_CAPITAL')
  value: string // Display value (e.g., 'Venture Capital')
  label: string // Same as value (for consistency)
}

/**
 * Fetch investment types for a specific investment group from the catalog
 *
 * @param groupCode - Investment group code (e.g., 'EQUITY', 'REAL_ESTATE')
 * @param accessToken - User access token
 * @returns Promise<SubSection[]> Array of investment types as sub-sections
 */
export const fetchInvestmentTypeSubSections = async (groupCode: string, accessToken: string): Promise<SubSection[]> => {
  if (!accessToken) return []

  // Set access token on the singleton GraphQL client
  graphQLClient.setAccessToken(accessToken)

  const query = `
    query GetInvestmentTypes($groupId: String!) {
      CatalogEntry(
        where: {
          catalog: { name: { _eq: "Investment Type" } }
          parentEntryId: { _eq: $groupId }
          isDeleted: { _eq: false }
        }
        limit: 50
      ) {
        id
        code
        value
        additionalValue1
      }
    }
  `

  try {
    const result = await graphQLClient.request(query, {
      groupId: `InvestmentGroup:v1:${groupCode}`
    })

    if (!result?.CatalogEntry) {
      return []
    }

    // Transform and sort by additionalValue1 (display order)
    const types: SubSection[] = result.CatalogEntry.map((entry: any) => ({
      id: entry.code.toLowerCase().replaceAll('_', '-'),
      code: entry.code,
      value: entry.value,
      label: entry.value
    })).sort((a: any, b: any) => {
      const orderA = Number.parseInt(
        result.CatalogEntry.find((e: any) => e.code === a.code)?.additionalValue1 || '0',
        10
      )
      const orderB = Number.parseInt(
        result.CatalogEntry.find((e: any) => e.code === b.code)?.additionalValue1 || '0',
        10
      )
      return orderA - orderB
    })

    return types
  } catch (err) {
    console.error(`Error fetching investment types for ${groupCode}:`, err)
    return []
  }
}

/**
 * Fetch liquid fund sub-sections from the `InvestmentLiquidFundType` catalog.
 *
 * Each catalog entry becomes its own sub-section (Bank Deposits, Fixed-Term
 * Deposits, Pension Funds, Money Market Funds, Bonds, Equity, …). This lets
 * column/filter generation read each section's own `formFields` directly,
 * keeping the model symmetric with how Real Estate's investment-type
 * sub-sections work. Adding a new liquid fund type to the catalog
 * automatically surfaces it here without code changes.
 *
 * @param accessToken - User access token
 * @returns Promise<SubSection[]> Array of liquid fund types as sub-sections
 */
export const fetchLiquidFundTypeSubSections = async (accessToken: string): Promise<SubSection[]> => {
  if (!accessToken) return []

  graphQLClient.setAccessToken(accessToken)

  const query = `
    query GetLiquidFundTypes {
      CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "InvestmentLiquidFundType" } }
          isDeleted: { _eq: false }
        }
        orderBy: { value: ASC }
        limit: 50
      ) {
        id
        code
        value
        additionalValue1
      }
    }
  `

  try {
    const result = await graphQLClient.request(query)

    if (!result?.CatalogEntry) {
      return []
    }

    const types: SubSection[] = result.CatalogEntry.map((entry: any) => ({
      id: entry.code.toLowerCase().replaceAll('_', '-'),
      code: entry.code,
      value: entry.value,
      label: entry.value
    })).sort((a: any, b: any) => {
      const orderA = Number.parseInt(
        result.CatalogEntry.find((e: any) => e.code === a.code)?.additionalValue1 || '0',
        10
      )
      const orderB = Number.parseInt(
        result.CatalogEntry.find((e: any) => e.code === b.code)?.additionalValue1 || '0',
        10
      )
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })

    return types
  } catch (err) {
    console.error('Error fetching liquid fund type sub-sections:', err)
    return []
  }
}

/**
 * Get sub-sections based on strategy
 * Unified interface for determining sub-sections across all investment groups
 *
 * @param strategy - Sub-section strategy to use
 * @param groupCode - Investment group code
 * @param accessToken - User access token
 * @returns Promise<SubSection[]> Array of sub-sections
 */
export const getSubSectionsForStrategy = async (
  strategy: SubSectionStrategy,
  groupCode: string,
  accessToken: string
): Promise<SubSection[]> => {
  switch (strategy) {
    case 'investmentTypes':
      return fetchInvestmentTypeSubSections(groupCode, accessToken)

    case 'liquidFundTypes':
      return fetchLiquidFundTypeSubSections(accessToken)

    case 'none':
      return [
        {
          id: 'overview',
          code: groupCode, // Use actual group code for proper filtering
          value: 'Overview',
          label: 'Overview'
        }
      ]

    default:
      return []
  }
}
