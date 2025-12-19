import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getContactTypeLabel } from '@/common/data/relations/constants/contactConstants'

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
  contactsByType: { type: string; count: number; percentage: number }[]
  topAccountsByContacts: ContactInsightAccount[]
  recentContacts: ContactInsightRecent[]
}

export interface ContactInsightsConfig {
  contactEntity: string // 'Contact' or 'InvestmentContact'
  contactAggregate: string // 'ContactAggregate' or 'InvestmentContactAggregate'
  typeField: string // 'contactType' or 'type'
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
            # Get distinct contact types
            distinctContactTypes: ${config.contactEntity}(
              where: { isDeleted: { _eq: false } }
              distinctOn: [${config.typeField}]
              limit: 10
            ) {
              ${config.typeField}
            }

            # Get distinct accounts
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

        const distinctContactTypes = distinctResult.distinctContactTypes || []
        const distinctAccounts = distinctResult.distinctAccounts || []

        // Step 2: Build dynamic aggregate query for contact types and accounts
        const nonNullTypes = distinctContactTypes.filter((item: any) => item[config.typeField] !== null)
        const nonNullAccounts = distinctAccounts.filter((acc: any) => acc.accountId !== null)

        const typeAggregates = nonNullTypes
          .map((item: any, index: number) => {
            const typeValue = item[config.typeField]
            const escapedType = typeValue.replace(/"/g, String.raw`\"`)
            return `
              type_${index}: ${config.contactAggregate}(
                where: {
                  isDeleted: { _eq: false }
                  ${config.typeField}: { _eq: "${escapedType}" }
                }
              ) {
                aggregate { count }
              }
            `
          })
          .join('\n')

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

        // Step 3: Execute main aggregate query
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

            ${typeAggregates}
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

        // Process contacts by type
        const typeCounts = nonNullTypes.map((item: any, index: number) => ({
          type: item[config.typeField],
          count: result[`type_${index}`]?.aggregate?.count || 0
        }))

        // Calculate NULL/Unassigned count
        const sumOfKnownTypes = typeCounts.reduce((sum: number, item: any) => sum + item.count, 0)
        const nullTypeCount = totalContacts - sumOfKnownTypes

        const allTypeCounts = [...typeCounts, ...(nullTypeCount > 0 ? [{ type: null, count: nullTypeCount }] : [])]

        const contactsByType = allTypeCounts
          .map(item => ({
            type: getContactTypeLabel(item.type) || 'Unassigned',
            count: item.count,
            percentage: totalContacts > 0 ? Math.round((item.count / totalContacts) * 100) : 0
          }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)

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
          contactsByType,
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
    config.typeField,
    config.accountRelationEntity,
    config.accountRelationField,
    config.accountLookupWhere,
    config.accountAggregateFilter,
    config.accountMissingFilter,
    config.recentContactAccountField
  ])

  return { data, isLoading }
}
