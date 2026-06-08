import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  GET_CAMPAIGN_EVENT_ACCOUNT_BY_ID,
  GET_CAMPAIGN_EVENT_LINKED_ACCOUNT_IDS,
  type CustomerCampaignEventAccount,
  type CustomerCampaignEventAccountByIdResponse,
  type CustomerCampaignEventLinkedAccountIdsResponse
} from '../queries/customerCampaignEventAccountQueries'

export interface UseCustomerCampaignEventAccountResult {
  account: CustomerCampaignEventAccount | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCustomerCampaignEventAccount(
  accessToken: string,
  eventAccountId: string | undefined
): UseCustomerCampaignEventAccountResult {
  const graphqlClient = useGraphQLClient(accessToken)
  const [account, setAccount] = useState<CustomerCampaignEventAccount | null>(null)
  const [loading, setLoading] = useState(Boolean(eventAccountId))
  const [error, setError] = useState<string | null>(null)

  const fetchAccount = useCallback(async () => {
    if (!eventAccountId || !accessToken) {
      setAccount(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<CustomerCampaignEventAccountByIdResponse>(
        GET_CAMPAIGN_EVENT_ACCOUNT_BY_ID(),
        { id: eventAccountId }
      )
      setAccount(result?.CustomerCampaignEventAccount?.[0] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event account')
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [eventAccountId, accessToken, graphqlClient])

  useEffect(() => {
    fetchAccount()
  }, [fetchAccount])

  return { account, loading, error, refetch: fetchAccount }
}

export interface UseCustomerCampaignEventLinkedAccountIdsResult {
  linkedAccountIds: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Returns the ids of customer accounts already linked (not soft-deleted) to a campaign event.
 * Used to exclude already-linked accounts from the "add event account" selector.
 */
export function useCustomerCampaignEventLinkedAccountIds(
  context: BusinessAppContextProps,
  eventId: string | undefined
): UseCustomerCampaignEventLinkedAccountIdsResult {
  const graphqlClient = useGraphQLClient(context.accessToken)
  // Start in loading state when an event is provided so consumers can gate on it
  // (prevents an initial fetch that runs before the exclusion list is ready).
  const [state, setState] = useState(() => ({
    linkedAccountIds: [] as string[],
    loading: Boolean(context.accessToken && eventId),
    error: null as string | null
  }))

  const fetchLinkedIds = useCallback(async () => {
    if (!context.accessToken || !eventId) {
      setState({ linkedAccountIds: [], loading: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const result = await graphqlClient.request<CustomerCampaignEventLinkedAccountIdsResponse>(
        GET_CAMPAIGN_EVENT_LINKED_ACCOUNT_IDS(),
        { eventId }
      )
      const ids = (result?.CustomerCampaignEventAccount ?? [])
        .map(row => row.customerAccountId)
        .filter((id): id is string => Boolean(id))
      setState({ linkedAccountIds: ids, loading: false, error: null })
    } catch (err) {
      setState({
        linkedAccountIds: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load linked event accounts'
      })
    }
  }, [context.accessToken, graphqlClient, eventId])

  useEffect(() => {
    fetchLinkedIds()
  }, [fetchLinkedIds])

  return { ...state, refetch: fetchLinkedIds }
}
