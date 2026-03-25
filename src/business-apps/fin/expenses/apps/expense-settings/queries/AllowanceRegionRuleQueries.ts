import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AllowanceRegionRuleQueryVariables {
  travelRegionSetId: string
}

export interface AllowanceRegionRuleDetail {
  id: string
  amount: number
  activeFrom: string
  activeTo?: string
  version?: number
  home?: boolean
  travelRegionRef?: string
  travelRegion?: {
    id: string
    code: string
    value: string
    parentEntryId?: string
    objectValue?: {
      destination_country_ref?: string
    }
    childEntries?: Array<{
      code: string
    }>
  }
  country?: {
    id: string
    code: string
    value: string
  }
  currency?: {
    id: string
    code: string
    value: string
  }
}

export interface AllowanceRegionRule {
  id: string
  code: string
  name: string
  activeFrom: string
  activeTo?: string
  ruleOrder?: number
  version?: number
  travelRegionSetRef?: string
  additionalProperties?: Record<string, any>
  allowanceRegionRuleDetail: AllowanceRegionRuleDetail[]
}

export interface AllowanceRegionRulesResponse {
  AllowanceRegionRule: AllowanceRegionRule[]
}

/**
 * GraphQL query to fetch allowance region rules with their details
 * Filters by travelRegionSetRef - rules must have this field set to appear in a travel region set
 */
export const GET_ALLOWANCE_REGION_RULES_WITH_DETAILS = `
  query GetAllowanceRegionRulesWithTravelRegionSet($travelRegionSetId: String!) {
    AllowanceRegionRule(
      where: { 
        isDeleted: { _eq: false },
        travelRegionSetRef: { _eq: $travelRegionSetId }
      }
      orderBy: [{ ruleOrder: ASC }, { code: ASC }]
    ) {
      id
      code
      name
      activeFrom
      activeTo
      ruleOrder
      version
      travelRegionSetRef
      additionalProperties
      allowanceRegionRuleDetail(where: { isDeleted: { _eq: false } }) {
        id
        amount
        home
        activeFrom
        activeTo
        version
        travelRegionRef
        travelRegion {
          id
          code
          value
          objectValue
          parentEntryId
          childEntries {
            code
          }
        }
        country {
          id
          code
          value
        }
        currency {
          id
          code
          value
        }
      }
    }
  }
`

/**
 * Hook to fetch allowance region rules
 */
export const useGetAllowanceRegionRules = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAllowanceRegionRules = useCallback(
    async (variables: AllowanceRegionRuleQueryVariables) => {
      try {
        const result = await graphqlClient.request<AllowanceRegionRulesResponse>(
          GET_ALLOWANCE_REGION_RULES_WITH_DETAILS,
          variables
        )
        return result
      } catch (error) {
        console.error('Error fetching allowance region rules:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchAllowanceRegionRules }
}
