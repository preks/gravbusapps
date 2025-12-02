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

        // Step 1: Get distinct employee IDs who have won opportunities
        const employeeIdsQuery = `
          query GetEmployeeIds {
            opportunities: Opportunity(
              distinctOn: [ownerEmployeeId]
              where: { 
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "WON" } }
                ownerEmployeeId: { _isNull: false }${currencyFilter}
              }
            ) { 
              ownerEmployeeId
              ownerEmployee {
                id
                firstName
                lastName
                displayName
              }
            }
          }
        `
        const employeeIdsResult = await graphqlClient.request<any>(employeeIdsQuery)
        const employees = employeeIdsResult.opportunities || []

        if (employees.length === 0) {
          setContacts([])
          return
        }

        // Step 2: Get aggregates for each employee using separate aliases
        const aggregateQueries = employees
          .map((emp: any, index: number) => {
            return `
            emp_${index}: OpportunityAggregate(
              where: {
                isDeleted: { _eq: false }
                opportunityStatus: { code: { _eq: "WON" } }
                ownerEmployeeId: { _eq: "${emp.ownerEmployeeId}" }${currencyFilter}
              }
            ) {
              aggregate {
                count
                sum { estimatedAmount }
              }
            }
          `
          })
          .join('\n')

        const aggregateQuery = `
          query GetEmployeeAggregates {
            ${aggregateQueries}
          }
        `

        const aggregateResult = await graphqlClient.request<any>(aggregateQuery)

        // Step 3: Combine employee info with aggregates
        const list = employees
          .map((emp: any, index: number) => {
            const aggData = aggregateResult[`emp_${index}`]
            return {
              id: emp.ownerEmployee?.id || '',
              firstName: emp.ownerEmployee?.firstName || 'Unknown',
              lastName: emp.ownerEmployee?.lastName || 'Employee',
              email: '',
              accountName: '',
              totalRevenue: aggData?.aggregate?.sum?.estimatedAmount || 0,
              wonOpportunities: aggData?.aggregate?.count || 0
            }
          })
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
