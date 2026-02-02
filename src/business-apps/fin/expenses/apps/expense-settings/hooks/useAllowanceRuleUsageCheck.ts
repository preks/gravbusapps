import { useCallback, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UsageInfo {
  isUsed: boolean
  usedIn: {
    expenseRuleAllowanceCodes: Array<{
      id: string
      code: string
      name: string
      expenseRuleId: string
      expenseRuleCode: string
      expenseRuleName: string
    }>
    expensePlans: number
    expenseRequests: number
    expensePlanItems: number
    expenseItems: number
    expensePositions: number
  }
  message: string
}

// Query to check if an AllowanceRegionRule is used in any ExpenseRuleAllowanceCode
const GET_ALLOWANCE_RULE_USAGE = `
  query GetAllowanceRuleUsage($allowanceRegionRuleId: uuid!) {
    ExpenseRuleAllowanceCode(
      where: { 
        firstAllowanceRegionRuleId: { _eq: $allowanceRegionRuleId }
        isDeleted: { _eq: false }
      }
    ) {
      id
      code
      name
      expenseRuleId
      expenseRule {
        id
        code
        name
      }
    }
  }
`

// Query to check if an ExpenseRule is used in expense transactions
const GET_EXPENSE_RULE_TRANSACTION_USAGE = `
  query GetExpenseRuleTransactionUsage($expenseRuleIds: [uuid!]!) {
    expensePlansCount: ExpensePlanAggregate(
      where: { 
        expenseRuleId: { _in: $expenseRuleIds }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    expenseRequestsCount: ExpenseRequestAggregate(
      where: { 
        expenseRuleId: { _in: $expenseRuleIds }
        isDeleted: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
    
    planItemsViaAllowance: ExpensePlanItemAggregate(
      where: {
        isDeleted: { _eq: false }
        expenseRuleAllowanceCode: {
          expenseRuleId: { _in: $expenseRuleIds }
        }
      }
    ) {
      aggregate {
        count
      }
    }
    
    itemsViaAllowance: ExpenseItemAggregate(
      where: {
        isDeleted: { _eq: false }
        expenseRuleAllowanceCode: {
          expenseRuleId: { _in: $expenseRuleIds }
        }
      }
    ) {
      aggregate {
        count
      }
    }
    
    positionsViaAllowance: ExpensePositionAggregate(
      where: {
        isDeleted: { _eq: false }
        expenseRuleAllowanceCode: {
          expenseRuleId: { _in: $expenseRuleIds }
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

interface AllowanceRuleUsageResponse {
  ExpenseRuleAllowanceCode: Array<{
    id: string
    code: string
    name: string
    expenseRuleId: string
    expenseRule: {
      id: string
      code: string
      name: string
    }
  }>
}

interface ExpenseRuleTransactionUsageResponse {
  expensePlansCount: { aggregate: { count: number } }
  expenseRequestsCount: { aggregate: { count: number } }
  planItemsViaAllowance: { aggregate: { count: number } }
  itemsViaAllowance: { aggregate: { count: number } }
  positionsViaAllowance: { aggregate: { count: number } }
}

export const useAllowanceRuleUsageCheck = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [isChecking, setIsChecking] = useState(false)

  const checkAllowanceRuleUsage = useCallback(
    async (allowanceRegionRuleId: string): Promise<UsageInfo> => {
      setIsChecking(true)

      try {
        // Step 1: Check if this AllowanceRegionRule is referenced in ExpenseRuleAllowanceCode
        const usageResult = await graphqlClient.request<AllowanceRuleUsageResponse>(
          GET_ALLOWANCE_RULE_USAGE,
          { allowanceRegionRuleId }
        )

        const allowanceCodes = usageResult.ExpenseRuleAllowanceCode || []

        // If not referenced in any allowance code, it's safe to edit
        if (allowanceCodes.length === 0) {
          return {
            isUsed: false,
            usedIn: {
              expenseRuleAllowanceCodes: [],
              expensePlans: 0,
              expenseRequests: 0,
              expensePlanItems: 0,
              expenseItems: 0,
              expensePositions: 0
            },
            message: ''
          }
        }

        // Step 2: Get expense rule IDs from allowance codes
        const expenseRuleIds = [...new Set(allowanceCodes.map((ac) => ac.expenseRuleId))]

        // Step 3: Check if these expense rules are used in any transactions
        const transactionUsage = await graphqlClient.request<ExpenseRuleTransactionUsageResponse>(
          GET_EXPENSE_RULE_TRANSACTION_USAGE,
          { expenseRuleIds }
        )

        const expensePlans = transactionUsage.expensePlansCount?.aggregate?.count || 0
        const expenseRequests = transactionUsage.expenseRequestsCount?.aggregate?.count || 0
        const expensePlanItems = transactionUsage.planItemsViaAllowance?.aggregate?.count || 0
        const expenseItems = transactionUsage.itemsViaAllowance?.aggregate?.count || 0
        const expensePositions = transactionUsage.positionsViaAllowance?.aggregate?.count || 0

        const totalTransactions = expensePlans + expenseRequests + expensePlanItems + expenseItems + expensePositions
        const isUsed = totalTransactions > 0

        // Build descriptive message
        let message = ''
        if (isUsed) {
          const usageDetails: string[] = []
          if (expensePlans > 0) usageDetails.push(`${expensePlans} expense plan(s)`)
          if (expenseRequests > 0) usageDetails.push(`${expenseRequests} expense request(s)`)
          if (expensePlanItems > 0) usageDetails.push(`${expensePlanItems} planned item(s)`)
          if (expenseItems > 0) usageDetails.push(`${expenseItems} expense item(s)`)
          if (expensePositions > 0) usageDetails.push(`${expensePositions} expense position(s)`)

          const expenseRuleCodes = allowanceCodes
            .map((ac) => ac.expenseRule?.code || ac.expenseRuleId)
            .join(', ')

          message = `This rule is used in expense rule(s) [${expenseRuleCodes}] which is referenced in ${usageDetails.join(', ')}. Only the "Valid To" date can be edited. To make changes to other fields, create a new rule.`
        }

        return {
          isUsed,
          usedIn: {
            expenseRuleAllowanceCodes: allowanceCodes.map((ac) => ({
              id: ac.id,
              code: ac.code,
              name: ac.name,
              expenseRuleId: ac.expenseRuleId,
              expenseRuleCode: ac.expenseRule?.code || '',
              expenseRuleName: ac.expenseRule?.name || ''
            })),
            expensePlans,
            expenseRequests,
            expensePlanItems,
            expenseItems,
            expensePositions
          },
          message
        }
      } catch (error) {
        console.error('Error checking allowance rule usage:', error)
        // On error, assume it's used to be safe
        return {
          isUsed: true,
          usedIn: {
            expenseRuleAllowanceCodes: [],
            expensePlans: 0,
            expenseRequests: 0,
            expensePlanItems: 0,
            expenseItems: 0,
            expensePositions: 0
          },
          message: 'Unable to verify usage. Editing is restricted for safety.'
        }
      } finally {
        setIsChecking(false)
      }
    },
    [graphqlClient]
  )

  const isEditingRestricted = useCallback(
    async (allowanceRegionRuleId: string): Promise<boolean> => {
      const usage = await checkAllowanceRuleUsage(allowanceRegionRuleId)
      return usage.isUsed
    },
    [checkAllowanceRuleUsage]
  )

  return {
    checkAllowanceRuleUsage,
    isEditingRestricted,
    isChecking
  }
}

