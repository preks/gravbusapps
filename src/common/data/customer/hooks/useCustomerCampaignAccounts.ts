import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_CAMPAIGN_LINKED_ACCOUNT_IDS } from '../queries/customerCampaignAccountQueries'

interface CampaignLinkedAccountIdsResponse {
  CustomerCampaignAccount: Array<{ id: string; customerAccountId: string }>
}

export interface UseCustomerCampaignLinkedAccountIdsResult {
  linkedAccountIds: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Returns the ids of customer accounts already linked (not soft-deleted) to a campaign.
 * Used to exclude already-linked accounts from selection lists.
 */
export function useCustomerCampaignLinkedAccountIds(
  context: BusinessAppContextProps,
  campaignId: string | undefined
): UseCustomerCampaignLinkedAccountIdsResult {
  const graphqlClient = useGraphQLClient(context.accessToken)
  // Start in loading state when a campaign is provided so consumers can gate on it
  // (prevents an initial fetch that runs before the exclusion list is ready).
  const [state, setState] = useState(() => ({
    linkedAccountIds: [] as string[],
    loading: Boolean(context.accessToken && campaignId),
    error: null as string | null
  }))

  const fetchLinkedIds = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setState({ linkedAccountIds: [], loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const query = GET_CAMPAIGN_LINKED_ACCOUNT_IDS()
      const result = await graphqlClient.request<CampaignLinkedAccountIdsResponse>(query, { campaignId })
      const ids = (result?.CustomerCampaignAccount ?? [])
        .map(row => row.customerAccountId)
        .filter((id): id is string => Boolean(id))
      setState({ linkedAccountIds: ids, loading: false, error: null })
    } catch (err) {
      setState({
        linkedAccountIds: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load linked accounts'
      })
    }
  }, [context.accessToken, graphqlClient, campaignId])

  useEffect(() => {
    fetchLinkedIds()
  }, [fetchLinkedIds])

  return { ...state, refetch: fetchLinkedIds }
}
