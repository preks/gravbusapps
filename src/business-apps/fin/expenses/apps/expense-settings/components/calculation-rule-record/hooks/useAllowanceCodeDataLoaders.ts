import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { transformAllowanceCodeFromAPI } from '../utils/allowanceCodeTransformers'

interface UseAllowanceCodeDataLoadersProps {
  ruleId: string
  accessToken: string
}

export const useAllowanceCodeDataLoaders = ({ ruleId, accessToken }: UseAllowanceCodeDataLoadersProps) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllowanceCodes = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetAllowanceCodes($ruleId: uuid!) {
          ExpenseRule(where: { id: { _eq: $ruleId } }) {
            id
            expenseRuleAllowanceCode(where: { isDeleted: { _eq: false } }) {
              id
              code
              name
              activeFrom
              activeTo
              additionalProperties
              businessKey
              codeOrder
              travelLocation
              reimbursable
              firstAllowanceRegionRuleId
              firstAllowanceRegionRulePercent
              secondAllowanceRegionRuleId
              secondAllowanceRegionRulePercent
              firstAllowanceRegionRule {
                id
                code
                name
                travelRegionSetRef
              }
              secondAllowanceRegionRule {
                id
                code
                name
                travelRegionSetRef
              }
              firstWageCode
              secondWageCode
              expenseGroup {
                id
                value
                code
              }
              version
              calculationRef
              calculation {
                id
                code
                value
              }
              amount
            }
          }
        }
      `

      const result = await graphqlClient.request<any>(query, { ruleId })
      const codes = result.ExpenseRule?.[0]?.expenseRuleAllowanceCode || []

      const transformedCodes = codes.map(transformAllowanceCodeFromAPI)

      console.log(
        '🔍 [AllowanceCodeTab] Fetched codes with percentage:',
        transformedCodes.map(c => ({
          code: c.code,
          firstAllowanceRegionRulePercent: c.firstAllowanceRegionRulePercent
        }))
      )

      return transformedCodes
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load allowance codes'
      setError(errorMessage)
      console.error('Error fetching allowance codes:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, ruleId])

  const fetchAllowanceRegionRules = useCallback(async () => {
    try {
      const query = `
        query GetAllowanceRegionRules {
          AllowanceRegionRule(where: { isDeleted: { _eq: false } }) {
            id
            code
            name
            travelRegionSetRef
          }
        }
      `
      const result = await graphqlClient.request<any>(query)
      return result.AllowanceRegionRule || []
    } catch (err) {
      console.error('Error fetching allowance region rules:', err)
      throw err
    }
  }, [graphqlClient])

  const fetchTravelRegionSets = useCallback(
    async (rules: any[]) => {
      const uniqueSetRefs = Array.from(new Set(rules.map(r => r.travelRegionSetRef).filter(Boolean)))

      if (uniqueSetRefs.length === 0) {
        return []
      }

      try {
        const setPromises = uniqueSetRefs.map(async setRef => {
          const [, , setCode] = (setRef as string).split(':')
          const response = await catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'TravelRegionSet', version: 'v1' },
            {
              limit: 100,
              offset: 0,
              searchCriteria: setCode
            }
          )
          return response.data?.entries || []
        })

        const setsArrays = await Promise.all(setPromises)
        return setsArrays.flat()
      } catch (err) {
        console.error('Error fetching travel region sets:', err)
        throw err
      }
    },
    [catalogClient]
  )

  const fetchCalculationMethods = useCallback(async () => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Calculation', version: 'v1' },
        { limit: 100, offset: 0 }
      )
      return response.data?.entries || []
    } catch (err) {
      console.error('Error fetching calculation methods:', err)
      throw err
    }
  }, [catalogClient])

  return {
    isLoading,
    error,
    setError,
    fetchAllowanceCodes,
    fetchAllowanceRegionRules,
    fetchTravelRegionSets,
    fetchCalculationMethods
  }
}
