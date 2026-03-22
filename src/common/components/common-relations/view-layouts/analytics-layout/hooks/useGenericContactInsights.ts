import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactInsightAccount {
  accountId: string
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
  topAccountsByContacts: ContactInsightAccount[]
  recentContacts: ContactInsightRecent[]
}

export interface ContactInsightsConfig {
  contactEntity: string // 'Contact' or 'InvestmentContact'
  contactAggregate: string // 'ContactAggregate' or 'InvestmentContactAggregate'
  accountRelationEntity: string // 'Contact' or 'InvestmentAccountContact'
  accountRelationField: string // 'accountId' or 'contact'
  accountLookupWhere: string // 'accountId: { _isNull: false }' or 'contact: { isDeleted: { _eq: false } }, accountId: { _isNull: false }'
  accountAggregateFilter: string // 'accountId: { _eq: "${accountId}" }' or 'investmentAccountContact: { accountId: { _eq: "${accountId}" } }'
  accountMissingFilter: string // 'accountId: { _isNull: true }' or 'investmentAccountContact: { accountId: { _isNull: true } }'
  recentContactAccountField: string // 'account' or 'investmentAccountContact'
}

/**
 * Generic Contact Insights Hook using aggregate queries
 * Pattern: Uses distinctOn for contact types
 * Configurable for both CRM and IRM
 */
export const useGenericContactInsights = (accessToken: string, config: ContactInsightsConfig) => {
  const [data, setData] = useState<ContactInsightsData>({
    totalContacts: 0,
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

        // Step 1: Get distinct accounts
        const distinctQuery = `
          query GetDistinctContactAttributes {
            distinctAccounts: ${config.accountRelationEntity}(
              where: { 
                ${config.accountLookupWhere}
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

        const distinctAccounts = distinctResult.distinctAccounts || []
        const nonNullAccounts = distinctAccounts.filter((acc: any) => acc.accountId !== null)

        const accountAggregates = nonNullAccounts
          .map((acc: any, index: number) => {
            const accountFilter = config.accountAggregateFilter.replace('${accountId}', acc.accountId)
            return `
              account_${index}: ${config.contactAggregate}(
                where: {
                  isDeleted: { _eq: false }
                  ${accountFilter}
                }
              ) {
                aggregate { count }
              }
            `
          })
          .join('\n')

        // Step 2: Execute main aggregate query
        const query = `
          query GetContactInsightsAggregates {
            # Total contacts
            totalContacts: ${config.contactAggregate}(
              where: { isDeleted: { _eq: false } }
            ) {
              aggregate { count }
            }

            # Contacts without accounts
            contactsWithoutAccounts: ${config.contactAggregate}(
              where: {
                isDeleted: { _eq: false }
                ${config.accountMissingFilter}
              }
            ) {
              aggregate { count }
            }

            ${accountAggregates}

            # Recent contacts (only 5 - acceptable to fetch)
            recentContacts: ${config.contactEntity}(
              where: { isDeleted: { _eq: false } }
              orderBy: [{ createdAt: DESC_NULLS_LAST }]
              limit: 5
            ) {
              id
              firstName
              lastName
              createdAt
              ${config.recentContactAccountField} { ${config.recentContactAccountField === 'account' ? 'name' : 'account { name }'} }
            }
          }
        `

        const result = await graphqlClient.request<any>(query)

        // Process results
        const totalContacts = result.totalContacts?.aggregate?.count || 0
        const contactsWithoutAccounts = result.contactsWithoutAccounts?.aggregate?.count || 0

        // Process top accounts by contacts
        const accountsWithCounts = nonNullAccounts.map((acc: any, index: number) => ({
          accountId: acc.accountId,
          accountName: acc.account?.name || 'Unknown',
          contactCount: result[`account_${index}`]?.aggregate?.count || 0
        }))

        const topAccountsByContacts = accountsWithCounts
          .filter((acc: any) => acc.contactCount > 0)
          .sort((a: any, b: any) => b.contactCount - a.contactCount)
          .slice(0, 10)
          .map(({ accountId, accountName, contactCount }: any) => ({ accountId, accountName, contactCount }))

        // Add "No Account" category
        if (contactsWithoutAccounts > 0) {
          topAccountsByContacts.push({
            accountId: '',
            accountName: 'No Account',
            contactCount: contactsWithoutAccounts
          })
        }

        // Process recent contacts
        const currentDate = new Date()
        const recentContacts = (result.recentContacts || []).map((c: any) => {
          const createdDate = new Date(c.createdAt)
          const daysSinceCreated = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))

          // Handle different account field structures
          let accountName: string | undefined
          if (config.recentContactAccountField === 'account') {
            accountName = c.account?.name
          } else {
            accountName = c.investmentAccountContact?.[0]?.account?.name
          }

          return {
            id: c.id,
            name: `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            accountName,
            createdDate: c.createdAt,
            daysSinceCreated
          } as ContactInsightRecent
        })

        setData({
          totalContacts,
          topAccountsByContacts,
          recentContacts
        })
      } catch (err) {
        console.error('Error fetching contact insights:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContactInsights()
  }, [
    accessToken,
    graphqlClient,
    config.contactEntity,
    config.contactAggregate,
    config.accountRelationEntity,
    config.accountRelationField,
    config.accountLookupWhere,
    config.accountAggregateFilter,
    config.accountMissingFilter,
    config.recentContactAccountField
  ])

  return { data, isLoading }
}
