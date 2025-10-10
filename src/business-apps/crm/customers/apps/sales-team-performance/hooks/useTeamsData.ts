import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamInfo } from '../types/userRoles'

interface UseTeamsDataProps {
  accessToken: string
}

interface UseTeamsDataResult {
  teams: TeamInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

// GraphQL query to get employees with sales activities and organizational structure
// This ensures teams are only created for supervisors who actually have sales team members
const GET_SALES_EMPLOYEES_WITH_ORG_DATA = `
  query GetSalesEmployeesWithOrgData {
    # Get all employees who own leads
    leadsOwners: Lead(
      where: { 
        isDeleted: { _eq: false }
        ownerEmployeeId: { _neq: null }
      }
      limit: 100
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
          }
        }
      }
    }
    
    # Get all employees who own accounts
    accountsOwners: Account(
      where: { 
        isDeleted: { _eq: false }
        ownerEmployeeId: { _neq: null }
      }
      limit: 100
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
          }
        }
      }
    }
    
    # Get all employees who own opportunities
    opportunitiesOwners: Opportunity(
      where: { 
        isDeleted: { _eq: false }
        ownerEmployeeId: { _neq: null }
      }
      limit: 100
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
          }
        }
      }
    }
    
    # Get all employees who own contacts
    contactsOwners: Contact(
      where: { 
        isDeleted: { _eq: false }
        ownerEmployeeId: { _neq: null }
      }
      limit: 100
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
        employeePosition {
          organizationalUnit {
            id
            name
          }
          supervisor {
            id
            firstName
            lastName
            displayName
          }
        }
      }
    }
  }
`

/**
 * Hook to fetch real sales teams data by deriving them from CRM employees' organizational structure
 * Only creates teams for employees who own CRM entities (Leads, Accounts, Opportunities, Contacts)
 * This ensures teams have actual sales team members with data
 */
export const useTeamsData = ({ accessToken }: UseTeamsDataProps): UseTeamsDataResult => {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTeams = useCallback(async () => {
    if (!accessToken) {
      console.log('⚠️ useTeamsData: No access token available, waiting...')
      setError('Access token required')
      setIsLoading(false)
      return
    }

    console.log('✅ useTeamsData: Access token available, fetching teams...')
    setIsLoading(true)
    setError(null)

    try {
      console.log('useTeamsData: Fetching teams from sales employees with organizational structure...')

      const response = await graphqlClient.request<{
        leadsOwners: Array<{
          ownerEmployee: {
            id: string
            firstName: string
            lastName: string
            displayName: string
            employeePosition: {
              organizationalUnit: {
                id: string
                name: string
              }
              supervisor: {
                id: string
                firstName: string
                lastName: string
                displayName: string
              }
            }
          } | null
        }>
        accountsOwners: Array<{
          ownerEmployee: {
            id: string
            firstName: string
            lastName: string
            displayName: string
            employeePosition: {
              organizationalUnit: {
                id: string
                name: string
              }
              supervisor: {
                id: string
                firstName: string
                lastName: string
                displayName: string
              }
            }
          } | null
        }>
        opportunitiesOwners: Array<{
          ownerEmployee: {
            id: string
            firstName: string
            lastName: string
            displayName: string
            employeePosition: {
              organizationalUnit: {
                id: string
                name: string
              }
              supervisor: {
                id: string
                firstName: string
                lastName: string
                displayName: string
              }
            }
          } | null
        }>
        contactsOwners: Array<{
          ownerEmployee: {
            id: string
            firstName: string
            lastName: string
            displayName: string
            employeePosition: {
              organizationalUnit: {
                id: string
                name: string
              }
              supervisor: {
                id: string
                firstName: string
                lastName: string
                displayName: string
              }
            }
          } | null
        }>
      }>(GET_SALES_EMPLOYEES_WITH_ORG_DATA)

      // Combine all sales employees from different CRM entity types
      const allSalesEmployees: Array<{
        id: string
        firstName: string
        lastName: string
        displayName: string
        employeePosition: {
          organizationalUnit: {
            id: string
            name: string
          }
          supervisor: {
            id: string
            firstName: string
            lastName: string
            displayName: string
          }
        }
      }> = []

      // Extract employees from each CRM entity type
      ;[response.leadsOwners, response.accountsOwners, response.opportunitiesOwners, response.contactsOwners].forEach(
        owners => {
          owners.forEach(item => {
            if (item.ownerEmployee) {
              // Check if employee already exists (deduplication)
              if (!allSalesEmployees.find(emp => emp.id === item.ownerEmployee!.id)) {
                allSalesEmployees.push(item.ownerEmployee)
              }
            }
          })
        }
      )

      console.log('useTeamsData: Found sales employees from CRM entities:', {
        leadsOwners: response.leadsOwners.length,
        accountsOwners: response.accountsOwners.length,
        opportunitiesOwners: response.opportunitiesOwners.length,
        contactsOwners: response.contactsOwners.length,
        uniqueSalesEmployees: allSalesEmployees.length
      })

      // Group employees by organizational unit and supervisor to create teams
      const teamMap = new Map<
        string,
        {
          orgUnitId: string
          orgUnitName: string
          supervisorId: string
          supervisorName: string
          members: string[]
        }
      >()

      allSalesEmployees.forEach(employee => {
        const orgUnit = employee.employeePosition?.organizationalUnit
        const supervisor = employee.employeePosition?.supervisor

        // Skip employees with missing organizational data (even though we filtered, relationships can be null)
        if (!orgUnit || !supervisor || !orgUnit.id || !supervisor.id) {
          console.warn('Skipping employee with incomplete org data:', {
            employeeId: employee.id,
            hasOrgUnit: !!orgUnit,
            hasSupervisor: !!supervisor,
            orgUnitId: orgUnit?.id,
            supervisorId: supervisor?.id
          })
          return
        }

        // Create a unique team key combining org unit and supervisor
        const teamKey = `${orgUnit.id}-${supervisor.id}`

        if (!teamMap.has(teamKey)) {
          teamMap.set(teamKey, {
            orgUnitId: orgUnit.id,
            orgUnitName: orgUnit.name,
            supervisorId: supervisor.id,
            supervisorName:
              supervisor.displayName ||
              `${supervisor.firstName || ''} ${supervisor.lastName || ''}`.trim() ||
              'Unknown Supervisor',
            members: []
          })
        }

        teamMap.get(teamKey)!.members.push(employee.id)
      })

      // Convert map to TeamInfo array
      const teamsData: TeamInfo[] = Array.from(teamMap.entries()).map(([teamKey, teamData]) => ({
        id: teamKey,
        name: `${teamData.orgUnitName} (${teamData.supervisorName})`,
        managerId: teamData.supervisorId,
        memberCount: teamData.members.length,
        memberIds: teamData.members
      }))

      console.log('useTeamsData: Successfully derived', teamsData.length, 'sales teams from CRM employee data')
      console.log(
        'Sales teams found:',
        teamsData.map(t => ({ name: t.name, memberCount: t.memberCount }))
      )

      setTeams(teamsData)
    } catch (err) {
      console.error('Error fetching teams data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales teams data from CRM employee structure')
      setTeams([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  const refetch = () => {
    fetchTeams()
  }

  useEffect(() => {
    if (accessToken) {
      fetchTeams()
    } else {
      console.log('⚠️ useTeamsData: Waiting for access token...')
      setIsLoading(false)
      setTeams([])
    }
  }, [accessToken, fetchTeams])

  return {
    teams,
    isLoading,
    error,
    refetch
  }
}
