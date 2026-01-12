import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface UseAllowanceCodeUsageCheckProps {
  accessToken: string
  allowanceCodes: any[]
}

export const useAllowanceCodeUsageCheck = ({ accessToken, allowanceCodes }: UseAllowanceCodeUsageCheckProps) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [allowanceCodeUsageMap, setAllowanceCodeUsageMap] = useState<Record<string, boolean>>({})

  const checkAllowanceCodeUsage = useCallback(
    async (codeIds: string[]) => {
      if (codeIds.length === 0) return {}

      try {
        const query = `
          query CheckAllAllowanceCodeUsage($allowanceCodeIds: [uuid!]!) {
            planItems: ExpensePlanItem(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) {
              expenseRuleAllowanceCodeId
            }
            items: ExpenseItem(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) {
              expenseRuleAllowanceCodeId
            }
            positions: ExpensePosition(
              where: { expenseRuleAllowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) {
              expenseRuleAllowanceCodeId
            }
            setups: ExpenseRuleAllowanceSetup(
              where: { allowanceCodeId: { _in: $allowanceCodeIds }, isDeleted: { _eq: false } }
            ) {
              allowanceCodeId
            }
          }
        `

        const result = await graphqlClient.request<any>(query, { allowanceCodeIds: codeIds })

        const usedIds = new Set<string>()
        result.planItems?.forEach((item: any) => usedIds.add(item.expenseRuleAllowanceCodeId))
        result.items?.forEach((item: any) => usedIds.add(item.expenseRuleAllowanceCodeId))
        result.positions?.forEach((item: any) => usedIds.add(item.expenseRuleAllowanceCodeId))
        result.setups?.forEach((item: any) => usedIds.add(item.allowanceCodeId))

        const usageMap: Record<string, boolean> = {}
        codeIds.forEach(id => {
          usageMap[id] = usedIds.has(id)
        })

        return usageMap
      } catch (error) {
        console.error('Error checking allowance code usage:', error)
        return {}
      }
    },
    [graphqlClient]
  )

  // Check usage for all codes when codes change
  useEffect(() => {
    if (allowanceCodes.length > 0) {
      const codeIds = allowanceCodes.map(c => c.id)
      checkAllowanceCodeUsage(codeIds).then(setAllowanceCodeUsageMap)
    }
  }, [allowanceCodes, checkAllowanceCodeUsage])

  return {
    allowanceCodeUsageMap,
    checkAllowanceCodeUsage
  }
}
