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
          query GetTopRevenueEarners {
            opportunities: InvestmentOpportunity(
              where: { 
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "WON" } }
                ownerEmployeeId: { _neq: null }${currencyFilter}
              }
            ) { 
              id 
              name 
              estimatedAmount 
              ownerEmployee {
                id
                firstName
                lastName
                displayName
              }
            }
          }
        `
        const result = await graphqlClient.request<any>(query)
        const opportunities = result.opportunities || []

        // Group opportunities by owner employee
        const employeeMap = new Map<string, { employee: any; totalRevenue: number; wonOpportunities: number }>()

        opportunities.forEach((opp: any) => {
          const ownerId = opp.ownerEmployee?.id
          if (!ownerId) return

          if (!employeeMap.has(ownerId)) {
            employeeMap.set(ownerId, {
              employee: opp.ownerEmployee,
              totalRevenue: 0,
              wonOpportunities: 0
            })
          }

          const data = employeeMap.get(ownerId)!
          data.totalRevenue += opp.estimatedAmount || 0
          data.wonOpportunities += 1
        })

        // Convert to array and sort
        const list = Array.from(employeeMap.values())
          .map(({ employee, totalRevenue, wonOpportunities }) => ({
            id: employee.id,
            firstName: employee.firstName || 'Unknown',
            lastName: employee.lastName || 'Employee',
            email: '', // Not available in this query
            accountName: '', // Not relevant for employee-based ranking
            totalRevenue,
            wonOpportunities
          }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
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
