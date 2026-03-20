import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface RecentRecordItem {
  id: string
  name: string
  type: 'lead' | 'opportunity' | 'account' | 'contact'
  createdAt: string
}

export interface RecentRecordsConfig {
  leadTable: string
  opportunityTable: string
  accountTable: string
  contactTable: string
}

export interface UseRecentRecordsDataProps {
  accessToken: string
  enabled?: boolean
  config: RecentRecordsConfig
  limit?: number
}

export interface UseRecentRecordsDataReturn {
  recentRecords: RecentRecordItem[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Generic hook for fetching recent records across Lead, Opportunity, Account, and Contact
 * Module-agnostic - accepts configuration for any module
 *
 * Logic:
 * 1. Fetch last N records from each entity type (ordered by createdAt DESC)
 * 2. Combine all records into single array
 * 3. Sort combined array by createdAt DESC
 * 4. Return top N most recent records
 *
 * @param accessToken - Authentication token
 * @param enabled - Whether to automatically fetch data (defaults to true)
 * @param config - Configuration with table names
 * @param limit - Number of records to fetch per entity type (defaults to 5)
 */
export const useRecentRecordsData = ({
  accessToken,
  enabled = true,
  config,
  limit = 5
}: UseRecentRecordsDataProps): UseRecentRecordsDataReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [recentRecords, setRecentRecords] = useState<RecentRecordItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled || !accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build query to fetch last 5 of each entity type
      const recentRecordsQuery = `
        query GetRecentRecords($limit: Int!) {
          recentLeads: ${config.leadTable}(
            where: { isDeleted: { _eq: false } }
            orderBy: { createdAt: DESC }
            limit: $limit
          ) {
            id
            firstName
            lastName
            companyName
            createdAt
          }
          
          recentOpportunities: ${config.opportunityTable}(
            where: { isDeleted: { _eq: false } }
            orderBy: { createdAt: DESC }
            limit: $limit
          ) {
            id
            name
            createdAt
          }
          
          recentAccounts: ${config.accountTable}(
            where: { isDeleted: { _eq: false } }
            orderBy: { createdAt: DESC }
            limit: $limit
          ) {
            id
            name
            createdAt
          }
          
          recentContacts: ${config.contactTable}(
            where: { isDeleted: { _eq: false } }
            orderBy: { createdAt: DESC }
            limit: $limit
          ) {
            id
            firstName
            lastName
            createdAt
          }
        }
      `

      const result = await graphqlClient.request<any>(recentRecordsQuery, { limit })

      // Combine all entity types into a single array with type information
      const allRecentEntities: RecentRecordItem[] = [
        // Leads
        ...(result.recentLeads || []).map((lead: any) => ({
          id: lead.id,
          name:
            lead.firstName || lead.lastName
              ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim()
              : lead.companyName || 'Unnamed Lead',
          type: 'lead' as const,
          createdAt: lead.createdAt
        })),
        // Opportunities
        ...(result.recentOpportunities || []).map((opp: any) => ({
          id: opp.id,
          name: opp.name || 'Unnamed Opportunity',
          type: 'opportunity' as const,
          createdAt: opp.createdAt
        })),
        // Accounts
        ...(result.recentAccounts || []).map((account: any) => ({
          id: account.id,
          name: account.name || 'Unnamed Account',
          type: 'account' as const,
          createdAt: account.createdAt
        })),
        // Contacts
        ...(result.recentContacts || []).map((contact: any) => ({
          id: contact.id,
          name:
            contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : 'Unnamed Contact',
          type: 'contact' as const,
          createdAt: contact.createdAt
        }))
      ]

      // Sort all entities by createdAt (newest first) and take top 5
      const sortedRecords = allRecentEntities
        .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

      setRecentRecords(sortedRecords)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recent records'
      setError(errorMessage)
      console.error('❌ Error fetching recent records:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, enabled, config, limit, graphqlClient])

  useEffect(() => {
    if (enabled) {
      void fetchData()
    }
  }, [enabled, accessToken, config, limit, fetchData])

  return {
    recentRecords,
    isLoading,
    error,
    refetch: () => {
      fetchData()
    }
  }
}
