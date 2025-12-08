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
 * Optimized IRM Contact Insights using aggregate queries
 * Pattern: Uses distinctOn for contact types (like CRM Contacts tab)
 * No more fetching all contacts - uses aggregates for efficiency!
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

        // Step 1: Get distinct contact types and accounts with investmentAccountContact relationship
        const distinctQuery = `
          query GetDistinctInvestmentContactAttributes {
            # Get distinct contact types
            distinctContactTypes: InvestmentContact(
              where: { isDeleted: { _eq: false } }
              distinctOn: [type]
              limit: 10
            ) {
              type
            }

            # Get distinct accounts via contact relationship (top 20)
            distinctAccounts: InvestmentAccountContact(
              where: { 
                contact: { isDeleted: { _eq: false } }
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
        // Filter out NULL values to avoid GraphQL syntax errors
        const nonNullTypes = distinctContactTypes.filter((item: any) => item.type !== null)
        const nonNullAccounts = distinctAccounts.filter((acc: any) => acc.accountId !== null)

        const typeAggregates = nonNullTypes
          .map((item: any, index: number) => {
            const typeValue = item.type
            // Escape quotes in case type value contains them
            const escapedType = typeValue.replace(/"/g, String.raw`\"`)
            return `
              type_${index}: InvestmentContactAggregate(
                where: {
                  isDeleted: { _eq: false }
                  type: { _eq: "${escapedType}" }
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
              account_${index}: InvestmentContactAggregate(
                where: {
                  isDeleted: { _eq: false }
                  investmentAccountContact: { accountId: { _eq: "${acc.accountId}" } }
                }
              ) {
                aggregate { count }
              }
            `
          })
          .join('\n')

        // Step 3: Execute main aggregate query
        const query = `
          query GetInvestmentContactInsightsAggregates {
            # Total contacts
            totalContacts: InvestmentContactAggregate(
              where: { isDeleted: { _eq: false } }
            ) {
              aggregate { count }
            }

            # Contacts without accounts (no investmentAccountContact relationship)
            contactsWithoutAccounts: InvestmentContactAggregate(
              where: {
                isDeleted: { _eq: false }
                investmentAccountContact: { accountId: { _isNull: true } }
              }
            ) {
              aggregate { count }
            }

            ${typeAggregates}
            ${accountAggregates}

            # Recent contacts (only 5 - acceptable to fetch)
            recentContacts: InvestmentContact(
              where: { isDeleted: { _eq: false } }
              orderBy: [{ createdAt: DESC_NULLS_LAST }]
              limit: 5
            ) {
              id
              firstName
              lastName
              createdAt
              investmentAccountContact { account { name } }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Process results
        const totalContacts = result.totalContacts?.aggregate?.count || 0
        const contactsWithoutAccounts = result.contactsWithoutAccounts?.aggregate?.count || 0

        // Process contacts by type (non-null types from aggregates)
        const typeCounts = nonNullTypes.map((item: any, index: number) => ({
          type: item.type,
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

        // Add "No Account" category from direct aggregate
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
            accountName: c.investmentAccountContact?.[0]?.account?.name,
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
      } catch {
        // Error handling (silent for now, could add setError if needed)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactInsights()
  }, [accessToken, graphqlClient])

  return { data, isLoading }
}
