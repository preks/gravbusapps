import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopRevenueContact {
  id: string
  firstName: string
  lastName: string
  email: string
  accountName: string
  totalRevenue: number
  wonOpportunities: number
}

export const useTopRevenueEarners = (accessToken: string, currencyCode?: string) => {
  const [contacts, setContacts] = useState<TopRevenueContact[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Build currency filter if provided
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        const query = `
          query GetTopRevenueContacts {
            contacts: Contact(where: { isDeleted: { _eq: false }, accountId: { _neq: null } }, orderBy: [{ createdAt: DESC }]) { id firstName lastName email accountId account { id name } }
            opportunities: Opportunity(where: { isDeleted: { _eq: false }, accountId: { _neq: null }${currencyFilter} }) { id name estimatedAmount stage status accountId }
          }
        `
        const result = await graphqlClient.request<any>(query)
        const c = result.contacts || []
        const o = result.opportunities || []
        const list = c
          .map((contact: any) => {
            const accOpps = o.filter((opp: any) => opp.accountId === contact.accountId)
            const won = accOpps.filter((opp: any) => opp.status === 'won' || opp.stage === 'won')
            const totalRevenue = won.reduce((s: number, opp: any) => s + (opp.estimatedAmount || 0), 0)
            return {
              id: contact.id,
              firstName: contact.firstName || 'Unknown',
              lastName: contact.lastName || 'Contact',
              email: contact.email || 'No email',
              accountName: contact.account?.name || 'No Account',
              totalRevenue,
              wonOpportunities: won.length
            } as TopRevenueContact
          })
          .filter((x: TopRevenueContact) => x.totalRevenue > 0)
          .sort((a: TopRevenueContact, b: TopRevenueContact) => b.totalRevenue - a.totalRevenue)
          .slice(0, 10)
        setContacts(list)
      } finally {
        setIsLoading(false)
      }
    }
    if (accessToken) fetchData()
  }, [accessToken, graphqlClient, currencyCode])

  return { contacts, isLoading }
}
