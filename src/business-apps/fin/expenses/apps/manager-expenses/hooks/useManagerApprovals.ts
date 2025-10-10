import { useCallback, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { MANAGER_APPROVE_OR_REJECT } from '../queries/ManagerApproveOrReject'

export interface ManagerApprovalsParams {
  approverId: string
}

export const useManagerApprovals = (context: BusinessAppContextProps, { approverId }: ManagerApprovalsParams) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approveOrReject = useCallback(
    async (args: {
      planApproveIds?: string[]
      planRejectIds?: string[]
      planComments?: string
      requestApproveIds?: string[]
      requestRejectIds?: string[]
      requestComments?: string
    }) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await graphqlClient.request(MANAGER_APPROVE_OR_REJECT, {
          approverId,
          timestamp: new Date().toISOString(),
          planApproveIds: args.planApproveIds ?? [],
          planRejectIds: args.planRejectIds ?? [],
          planComments: args.planComments ?? null,
          requestApproveIds: args.requestApproveIds ?? [],
          requestRejectIds: args.requestRejectIds ?? [],
          requestComments: args.requestComments ?? null
        })
        return res
      } catch (e: any) {
        setError(e?.message || 'Approval action failed')
        throw e
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, approverId]
  )

  return { approveOrReject, isLoading, error }
}
