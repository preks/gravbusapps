import { useEffect, useState, useRef } from 'react'
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

interface CachedEmployee {
  ownerEmployeeId: string
  ownerEmployee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  }
}

/**
 * Shared hook for fetching top revenue earners
 * Used by both CRM and IRM analytics modules
 *
 * @param accessToken - Authentication token
 * @param currencyCode - Optional currency code filter
 * @param entityName - Entity name ('Opportunity' for CRM, 'InvestmentOpportunity' for IRM)
 */
export const useTopRevenueEarners = (
  accessToken: string,
  currencyCode?: string,
  entityName: 'Opportunity' | 'InvestmentOpportunity' = 'Opportunity'
) => {
  const [contacts, setContacts] = useState<TopRevenueContact[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const graphqlClient = useGraphQLClient(accessToken)

  // Cache employee IDs so we don't refetch them on currency change
  const employeeCacheRef = useRef<CachedEmployee[] | null>(null)
  const entityNameRef = useRef<string>(entityName)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Build currency filter if provided
        const currencyFilter = currencyCode ? `, currency: { code: { _eq: "${currencyCode}" } }` : ''

        let employees: CachedEmployee[] = []

        // Check if entity type changed - if so, clear cache
        if (entityNameRef.current !== entityName) {
          employeeCacheRef.current = null
          entityNameRef.current = entityName
        }

        // Step 1: Get employee IDs (CACHED - only fetched once)
        if (employeeCacheRef.current === null) {
          // First time or cache cleared - fetch employee IDs
          const employeeIdsQuery = `
            query GetEmployeeIds {
              employees: ${entityName}(
                distinctOn: [ownerEmployeeId]
                where: { 
                  isDeleted: { _eq: false }
                  opportunityStatus: { code: { _eq: "WON" } }
                  ownerEmployeeId: { _isNull: false }
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

          const employeeResult = await graphqlClient.request<{
            employees: CachedEmployee[]
          }>(employeeIdsQuery)

          employees = employeeResult.employees || []

          // Cache the employee IDs for future currency changes
          employeeCacheRef.current = employees
        } else {
          // Use cached employee IDs - no query needed!
          employees = employeeCacheRef.current
        }

        if (employees.length === 0) {
          setContacts([])
          return
        }

        // Step 2: Get aggregates for each employee with currency filter
        const aggregateQueries = employees
          .map((emp, index: number) => {
            return `
            emp_${index}: ${entityName}Aggregate(
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

        const aggregateResult =
          await graphqlClient.request<
            Record<string, { aggregate: { count: number; sum: { estimatedAmount: number } } }>
          >(aggregateQuery)

        // Combine employee info with aggregates and filter out employees with no revenue in selected currency
        const list = employees
          .map((emp, index: number) => {
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
          .filter(emp => emp.totalRevenue > 0) // Only include employees with revenue in selected currency
          .sort((a, b) => b.totalRevenue - a.totalRevenue)
          .slice(0, 5)

        setContacts(list)
      } catch (error) {
        console.error('Error fetching top revenue earners:', error)
        setContacts([])
      } finally {
        setIsLoading(false)
      }
    }
    if (accessToken) fetchData()
  }, [accessToken, graphqlClient, currencyCode, entityName])

  return { contacts, isLoading }
}
