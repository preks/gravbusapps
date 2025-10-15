import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface SalesTeamQueryVariables {
  limit?: number
  offset?: number
  search?: string
}

export interface EmployeeOwnershipData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  picture?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name: string
    }
    pictureThumbnail?: string
    supervisor?: {
      id: string
      firstName: string
      lastName: string
      displayName: string
      picture?: string
      pictureThumbnail?: string
    }
  }
}

export interface OpportunityData {
  id: string
  estimatedAmount: number
  currencyRef: string
  opportunityStatus: {
    code: string
    value: string
  }
  ownerEmployeeId: string
}

// Get won opportunities for revenue calculation
export const GET_WON_OPPORTUNITIES = `
  query GetWonOpportunities {
    Opportunity(
      where: {
        isDeleted: { _eq: false }
        ownerEmployeeId: { _isNull: false }
        estimatedAmount: { _isNull: false }
        opportunityStatus: { code: { _eq: "WON" } }
      }
    ) {
      id
      estimatedAmount
      currencyRef
      opportunityStatus {
        code
        value
      }
      ownerEmployeeId
    }
  }
`

// Single query for employees from leads with dynamic where conditions
export const GET_EMPLOYEES_FROM_LEADS = `
  query GetEmployeesFromLeads($limit: Int, $offset: Int, $where: LeadBoolExp) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
            picture
            pictureThumbnail
          }
        }
      }
      ownerEmployeeId
    }
  }
`

// Single query for employees from accounts with dynamic where conditions
export const GET_EMPLOYEES_FROM_ACCOUNTS = `
  query GetEmployeesFromAccounts($limit: Int, $offset: Int, $where: AccountBoolExp) {
    Account(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
            picture
            pictureThumbnail
          }
        }
      }
      ownerEmployeeId
    }
  }
`

// Single query for employees from opportunities with dynamic where conditions
export const GET_EMPLOYEES_FROM_OPPORTUNITIES = `
  query GetEmployeesFromOpportunities($limit: Int, $offset: Int, $where: OpportunityBoolExp) {
    Opportunity(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
            picture
            pictureThumbnail
          }
        }
      }
      ownerEmployeeId
    }
  }
`

// Single query for employees from contacts with dynamic where conditions
export const GET_EMPLOYEES_FROM_CONTACTS = `
  query GetEmployeesFromContacts($limit: Int, $offset: Int, $where: ContactBoolExp) {
    Contact(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
        employeePosition {
          jobPosition {
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
            picture
            pictureThumbnail
          }
        }
      }
      ownerEmployeeId
    }
  }
`

export const useSalesTeamQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchSalesTeamEmployees = useCallback(
    async (variables: SalesTeamQueryVariables = {}) => {
      try {
        // Build base where conditions for all queries
        const buildWhereCondition = (entityConditions: any = {}) => {
          const baseWhere = {
            isDeleted: { _eq: false },
            ownerEmployeeId: { _neq: null },
            ...entityConditions
          }

          // Add search conditions if search term provided
          if (variables.search?.trim()) {
            const searchPattern = `%${variables.search.trim()}%`
            const searchConditions = [
              { ownerEmployee: { firstName: { _ilike: searchPattern } } },
              { ownerEmployee: { lastName: { _ilike: searchPattern } } },
              { ownerEmployee: { displayName: { _ilike: searchPattern } } },
              {
                ownerEmployee: {
                  employeePosition: {
                    jobPosition: { name: { _ilike: searchPattern } }
                  }
                }
              },
              {
                ownerEmployee: {
                  employeePosition: {
                    supervisor: { firstName: { _ilike: searchPattern } }
                  }
                }
              },
              {
                ownerEmployee: {
                  employeePosition: {
                    supervisor: { lastName: { _ilike: searchPattern } }
                  }
                }
              },
              {
                ownerEmployee: {
                  employeePosition: {
                    supervisor: { displayName: { _ilike: searchPattern } }
                  }
                }
              }
            ]

            // Combine base conditions with search using _and
            return {
              _and: [baseWhere, { _or: searchConditions }]
            }
          }

          return baseWhere
        }

        // Fetch employees from all CRM entity types in parallel using single queries
        const [leadsResult, accountsResult, opportunitiesResult, contactsResult] = await Promise.all([
          graphqlClient.request<{
            Lead: Array<{
              ownerEmployee: EmployeeOwnershipData | null
              ownerEmployeeId: string | null
            }>
          }>(GET_EMPLOYEES_FROM_LEADS, {
            limit: variables.limit,
            offset: variables.offset,
            where: buildWhereCondition()
          }),
          graphqlClient.request<{
            Account: Array<{
              ownerEmployee: EmployeeOwnershipData | null
              ownerEmployeeId: string | null
            }>
          }>(GET_EMPLOYEES_FROM_ACCOUNTS, {
            limit: variables.limit,
            offset: variables.offset,
            where: buildWhereCondition()
          }),
          graphqlClient.request<{
            Opportunity: Array<{
              ownerEmployee: EmployeeOwnershipData | null
              ownerEmployeeId: string | null
            }>
          }>(GET_EMPLOYEES_FROM_OPPORTUNITIES, {
            limit: variables.limit,
            offset: variables.offset,
            where: buildWhereCondition()
          }),
          graphqlClient.request<{
            Contact: Array<{
              ownerEmployee: EmployeeOwnershipData | null
              ownerEmployeeId: string | null
            }>
          }>(GET_EMPLOYEES_FROM_CONTACTS, {
            limit: variables.limit,
            offset: variables.offset,
            where: buildWhereCondition()
          })
        ])

        // De-duplicate employees by ID using a Map
        const employeeMap = new Map<string, EmployeeOwnershipData>()

        // Process leads
        leadsResult.Lead?.forEach(lead => {
          if (lead.ownerEmployee && lead.ownerEmployeeId) {
            employeeMap.set(lead.ownerEmployeeId, lead.ownerEmployee)
          }
        })

        // Process accounts
        accountsResult.Account?.forEach(account => {
          if (account.ownerEmployee && account.ownerEmployeeId) {
            employeeMap.set(account.ownerEmployeeId, account.ownerEmployee)
          }
        })

        // Process opportunities
        opportunitiesResult.Opportunity?.forEach(opportunity => {
          if (opportunity.ownerEmployee && opportunity.ownerEmployeeId) {
            employeeMap.set(opportunity.ownerEmployeeId, opportunity.ownerEmployee)
          }
        })

        // Process contacts
        contactsResult.Contact?.forEach(contact => {
          if (contact.ownerEmployee && contact.ownerEmployeeId) {
            employeeMap.set(contact.ownerEmployeeId, contact.ownerEmployee)
          }
        })

        // Convert map to array and sort by name
        const uniqueEmployees = Array.from(employeeMap.values()).sort((a, b) => {
          const nameA = a.displayName || `${a.firstName || ''} ${a.lastName || ''}`.trim()
          const nameB = b.displayName || `${b.firstName || ''} ${b.lastName || ''}`.trim()
          return nameA.localeCompare(nameB)
        })

        return uniqueEmployees
      } catch (error) {
        console.error('❌ Error fetching sales team employees:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )

  const fetchOpportunityTotals = useCallback(async (): Promise<OpportunityData[]> => {
    try {
      const result = await graphqlClient.request<{
        Opportunity: OpportunityData[]
      }>(GET_WON_OPPORTUNITIES)
      return result.Opportunity || []
    } catch (error) {
      console.error('❌ Error fetching opportunity totals:', error)
      throw error
    }
  }, [context.accessToken, graphqlClient])

  return {
    fetchSalesTeamEmployees,
    fetchOpportunityTotals
  }
}
