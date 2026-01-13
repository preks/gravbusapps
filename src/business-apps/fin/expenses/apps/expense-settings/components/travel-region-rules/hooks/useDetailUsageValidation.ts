import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { UsageInfo } from '../types'

interface UseDetailUsageValidationOptions {
  accessToken: string
}

export const useDetailUsageValidation = (options: UseDetailUsageValidationOptions) => {
  const { accessToken } = options
  const graphqlClient = useGraphQLClient(accessToken)

  // Check if a specific AllowanceRegionRuleDetail is used in transactions
  const checkDetailUsage = useCallback(
    async (detailId: string): Promise<UsageInfo> => {
      const query = `
      query CheckDetailUsage($detailId: uuid!) {
        expenseAllowanceCount: ExpenseAllowanceAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
        expenseRequestTripCount: ExpenseRequestTripAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
        expenseRequestTripTimeCount: ExpenseRequestTripTimeAggregate(
          where: { 
            allowanceRegionRuleDetailId: { _eq: $detailId }
            isDeleted: { _eq: false }
          }
        ) {
          aggregate { count }
        }
      }
    `

      const result = await graphqlClient.request<{
        expenseAllowanceCount: { aggregate: { count: number } }
        expenseRequestTripCount: { aggregate: { count: number } }
        expenseRequestTripTimeCount: { aggregate: { count: number } }
      }>(query, { detailId })

      const allowanceCount = result.expenseAllowanceCount?.aggregate?.count || 0
      const tripCount = result.expenseRequestTripCount?.aggregate?.count || 0
      const tripTimeCount = result.expenseRequestTripTimeCount?.aggregate?.count || 0
      const totalUsage = allowanceCount + tripCount + tripTimeCount

      if (totalUsage === 0) {
        return { isUsed: false, usedIn: {}, message: '' }
      }

      const usageDetails: string[] = []
      if (allowanceCount > 0) usageDetails.push(`${allowanceCount} expense allowance(s)`)
      if (tripCount > 0) usageDetails.push(`${tripCount} trip(s)`)
      if (tripTimeCount > 0) usageDetails.push(`${tripTimeCount} trip time(s)`)

      return {
        isUsed: true,
        usedIn: { allowanceCount, tripCount, tripTimeCount },
        message: `This detail is used in ${usageDetails.join(', ')}. Only "Valid To" can be edited.`
      }
    },
    [graphqlClient]
  )

  return {
    checkDetailUsage
  }
}
