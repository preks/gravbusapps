import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactInsightAccount {
  accountName: string
  contactCount: number
}

export interface ContactInsightRecent {
  id: string
  name: string
  accountName?: string
  createdDate: string
  daysSinceCreated: number
}

export interface ContactInsightsData {
  totalContacts: number
  contactsByType: { type: string; count: number; percentage: number }[]
  topAccountsByContacts: ContactInsightAccount[]
  recentContacts: ContactInsightRecent[]
}

/**
 * Optimized Contact Insights using aggregate queries
 * Pattern: Uses distinctOn for contact types (like Accounts tab)
 */
export const useContactInsights = (accessToken: string) => {
  const [data, setData] = useState<ContactInsightsData>({
    totalContacts: 0,
    contactsByType: [],
    topAccountsByContacts: [],
    recentContacts: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchContactInsights = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Step 1: Get distinct contact types and accounts
        const distinctQuery = `
          query GetDistinctContactAttributes {
            # Get distinct contact types (limit 10 - enough for all enum values)
            distinctContactTypes: Contact(
              where: { isDeleted: { _eq: false } }
              distinctOn: [contactType]
              limit: 10
            ) {
              contactType
            }

            # Get distinct accounts (top 20 - filter out NULL accountId)
            distinctAccounts: Contact(
              where: { 
                isDeleted: { _eq: false }
                accountId: { _isNull: false }
              }
              distinctOn: [accountId]
              limit: 20
              orderBy: [{ accountId: ASC }]
            ) {
              accountId
              account { id name }
            }
          }
        `

        const distinctResult = await graphqlClient.request<any>(distinctQuery)

        const distinctContactTypes = distinctResult.distinctContactTypes || []
        const distinctAccounts = distinctResult.distinctAccounts || []

        // Step 2: Build dynamic aggregate query for contact types and accounts
        // Filter out NULL values to avoid GraphQL UUID/String syntax errors
        const nonNullTypes = distinctContactTypes.filter((item: any) => item.contactType !== null)
        const nonNullAccounts = distinctAccounts.filter((acc: any) => acc.accountId !== null)

        const typeAggregates = nonNullTypes
          .map((item: any, index: number) => {
            const typeValue = item.contactType
            // Escape quotes in case type value contains them
            const escapedType = typeValue.replace(/"/g, String.raw`\"`)
            return `
              type_${index}: ContactAggregate(
                where: {
                  isDeleted: { _eq: false }
                  contactType: { _eq: "${escapedType}" }
                }
              ) {
                aggregate { count }
              }
            `
          })
          .join('\n')

        const accountAggregates = nonNullAccounts
          .map((acc: any, index: number) => {
            return `
              account_${index}: ContactAggregate(
                where: {
                  isDeleted: { _eq: false }
                  accountId: { _eq: "${acc.accountId}" }
                }
              ) {
                aggregate { count }
              }
            `
          })
          .join('\n')

        // Step 3: Execute main aggregate query
        const query = `
          query GetContactInsightsAggregates {
            # Total contacts
            totalContacts: ContactAggregate(
              where: { isDeleted: { _eq: false } }
            ) {
              aggregate { count }
            }

            # Contacts without accounts (using _isNull for UUID field - works!)
            contactsWithoutAccounts: ContactAggregate(
              where: {
                isDeleted: { _eq: false }
                accountId: { _isNull: true }
              }
            ) {
              aggregate { count }
            }

            ${typeAggregates}
            ${accountAggregates}

            # Recent contacts (only 5 - acceptable to fetch)
            recentContacts: Contact(
              where: { isDeleted: { _eq: false } }
              orderBy: [{ createdAt: DESC_NULLS_LAST }]
              limit: 5
            ) {
              id
              firstName
              lastName
              createdAt
              account { name }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Process results
        const totalContacts = result.totalContacts?.aggregate?.count || 0
        const contactsWithoutAccounts = result.contactsWithoutAccounts?.aggregate?.count || 0

        // Process contacts by type (non-null types from aggregates)
        const typeCounts = nonNullTypes.map((item: any, index: number) => ({
          type: item.contactType,
          count: result[`type_${index}`]?.aggregate?.count || 0
        }))

        // Calculate NULL/Unassigned count by subtracting all known types from total
        const sumOfKnownTypes = typeCounts.reduce((sum: number, item: any) => sum + item.count, 0)
        const nullTypeCount = totalContacts - sumOfKnownTypes

        // Combine all types including NULL
        const allTypeCounts = [...typeCounts, ...(nullTypeCount > 0 ? [{ type: null, count: nullTypeCount }] : [])]

        const contactsByType = allTypeCounts
          .map(item => ({
            type: item.type || 'Unassigned',
            count: item.count,
            percentage: totalContacts > 0 ? Math.round((item.count / totalContacts) * 100) : 0
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

        // Process top accounts by contacts (maintain index mapping with aggregate results)
        const accountsWithCounts = nonNullAccounts.map((acc: any, index: number) => ({
          accountId: acc.accountId,
          accountName: acc.account?.name || 'Unknown',
          contactCount: result[`account_${index}`]?.aggregate?.count || 0
        }))

        // Filter and sort accounts
        const topAccountsByContacts = accountsWithCounts
          .filter((acc: any) => acc.contactCount > 0) // Only show accounts with contacts
          .sort((a: any, b: any) => b.contactCount - a.contactCount)
          .slice(0, 10)
          .map(({ accountName, contactCount }: any) => ({ accountName, contactCount })) // Remove accountId from final result

        // Add "No Account" category from direct aggregate (no calculation needed!)
        if (contactsWithoutAccounts > 0) {
          topAccountsByContacts.push({
            accountName: 'No Account',
            contactCount: contactsWithoutAccounts
          })
        }

        // Process recent contacts
        const currentDate = new Date()
        const recentContacts = (result.recentContacts || []).map((c: any) => {
          const createdDate = new Date(c.createdAt)
          const daysSinceCreated = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
          return {
            id: c.id,
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            accountName: c.account?.name,
            createdDate: c.createdAt,
            daysSinceCreated
          } as ContactInsightRecent
        })

        setData({
          totalContacts,
          contactsByType,
          topAccountsByContacts,
          recentContacts
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contact insights')
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactInsights()
  }, [accessToken, graphqlClient])

  return { data, isLoading }
}
