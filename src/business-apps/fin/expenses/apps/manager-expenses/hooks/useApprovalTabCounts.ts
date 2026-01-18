import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { APPROVAL_TABS } from '../constants/approvalTabs'
import { ApprovalTabKey } from '../types'

export interface UseApprovalTabCountsResult {
  tabCounts: Record<ApprovalTabKey, number>
  isLoadingCounts: boolean
  refreshTabCounts: () => Promise<void>
}

/**
 * Fetches badge counts for each approvals tab. For specific tabs, it fetches
 * both the base and `StoreDirector` variants and sums their counts.
 */
export const useApprovalTabCounts = (context: BusinessAppContextProps): UseApprovalTabCountsResult => {
  const [tabCounts, setTabCounts] = useState<Record<ApprovalTabKey, number>>({
    'expense-plan': 0,
    'expense-request': 0,
    'advance-payment': 0,
    'handout-payment': 0,
    'transfer-payment': 0
  })
  const [isLoadingCounts, setIsLoadingCounts] = useState(true)

  const refreshTabCounts = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoadingCounts(true)
    try {
      const { FlowMetricsClient } = await import('@/common/network/flow-metrics/FlowMetricsClient')
      const flowMetricsClient = new FlowMetricsClient(context.accessToken)

      const countPromises = APPROVAL_TABS.map(async tab => {
        try {
          const baseParams = {
            cockpitPage: 'INBOX',
            size: 1, // count only
            page: 0,
            field: 'CREATION_DATE',
            direction: 'DESC',
            ...(context.userInfo?.id && { userId: context.userInfo.id })
          } as const

          const needsVariantFetch = ['approveAdvancePayment', 'approveExpenseRequest', 'approveExpensePlan'].includes(
            tab.processName
          )

          if (needsVariantFetch) {
            const [baseResponse, variantResponse] = await Promise.all([
              flowMetricsClient.getFlowExecutionTasks({
                ...baseParams,
                filterTaskName: tab.processName
              }),
              flowMetricsClient.getFlowExecutionTasks({
                ...baseParams,
                filterTaskName: `${tab.processName}StoreDirector`
              })
            ])

            const baseCount = baseResponse.totalCount || baseResponse.totalElements || 0
            const variantCount = variantResponse.totalCount || variantResponse.totalElements || 0

            return { tabKey: tab.key, count: baseCount + variantCount } as const
          }

          const response = await flowMetricsClient.getFlowExecutionTasks({
            ...baseParams,
            filterTaskName: tab.processName
          })

          const count = response.totalCount || response.totalElements || 0
          return { tabKey: tab.key, count } as const
        } catch {
          return { tabKey: tab.key, count: 0 } as const
        }
      })

      const results = await Promise.all(countPromises)
      const newCounts = results.reduce(
        (acc, { tabKey, count }) => {
          acc[tabKey as ApprovalTabKey] = count
          return acc
        },
        {} as Record<ApprovalTabKey, number>
      )

      setTabCounts(prev => ({ ...prev, ...newCounts }))
    } catch {
      // Error handled silently - counts remain at previous values
    } finally {
      setIsLoadingCounts(false)
    }
  }, [context.accessToken, context.userInfo?.id])

  useEffect(() => {
    refreshTabCounts()
  }, [refreshTabCounts])

  return { tabCounts, isLoadingCounts, refreshTabCounts }
}
