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
 * Get hardcoded liquid fund sub-sections
 * Liquid Fund uses special sub-sections based on liquid fund types, not investment types
 *
 * @returns SubSection[] Array of liquid fund sub-sections
 */
export const getLiquidFundSubSections = (): SubSection[] => {
  return [
    {
      id: 'bank-deposits',
      code: 'BANK_DEPOSITE', // Note: catalog has this typo
      value: 'Bank Deposits',
      label: 'Bank Deposits'
    },
    {
      id: 'fixed-term-deposits',
      code: 'FIXED_TERM_DEPOSIT',
      value: 'Fixed-Term Deposits',
      label: 'Fixed-Term Deposits'
    },
    {
      id: 'multiple-types',
      code: 'MONEY_MARKET_FUNDS',
      value: 'Multiple Types',
      label: 'Multiple Types'
    }
  ]
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
      return getLiquidFundSubSections()

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
