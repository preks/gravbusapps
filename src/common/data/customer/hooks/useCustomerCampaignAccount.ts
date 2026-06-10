import { useCallback, useEffect, useState } from 'react'
import type { CustomerCampaignAccount } from '../types/customerCampaignAccountTypes'
import {
  GET_CAMPAIGN_ACCOUNT_BY_ID,
  GET_CAMPAIGN_ACCOUNT_BY_CAMPAIGN_AND_CUSTOMER_ACCOUNT
} from '../queries/customerCampaignAccountQueries'
import type { CustomerCampaignAccountByIdResponse } from '../queries/customerCampaignAccountQueries'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface UseCustomerCampaignAccountOptions {
  campaignId?: string
  /** Used when junction id lookup returns no row (e.g. flow passed CustomerAccount id). */
  customerAccountId?: string
}

export interface UseCustomerCampaignAccountResult {
  account: CustomerCampaignAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const extractFirst = (response: CustomerCampaignAccountByIdResponse | null | undefined) =>
  response?.CustomerCampaignAccount?.[0] ?? null

export function useCustomerCampaignAccount(
  accessToken: string,
  junctionId: string | undefined,
  options?: UseCustomerCampaignAccountOptions
): UseCustomerCampaignAccountResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [account, setAccount] = useState<CustomerCampaignAccount | null>(null)
  const [loading, setLoading] = useState(Boolean(junctionId))
  const [error, setError] = useState<string | null>(null)

  const campaignId = options?.campaignId
  const customerAccountId = options?.customerAccountId

  const fetchAccount = useCallback(async () => {
    if (!junctionId || !accessToken) {
      setAccount(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const byIdResult = await graphqlClient.request<CustomerCampaignAccountByIdResponse>(
        GET_CAMPAIGN_ACCOUNT_BY_ID(),
        { id: junctionId }
      )
      let resolved = extractFirst(byIdResult)

      if (!resolved && campaignId && customerAccountId) {
        const byCampaignResult = await graphqlClient.request<CustomerCampaignAccountByIdResponse>(
          GET_CAMPAIGN_ACCOUNT_BY_CAMPAIGN_AND_CUSTOMER_ACCOUNT(),
          { campaignId, customerAccountId }
        )
        resolved = extractFirst(byCampaignResult)
      }

      setAccount(resolved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign account')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [junctionId, accessToken, graphqlClient, campaignId, customerAccountId])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  return { account, loading, error, refetch: fetchAccount }
}
