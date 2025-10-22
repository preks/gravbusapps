import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee } from '../types/employee.types'
import { getTeamMembersByManagerQuery } from '../queries/teamQueries'

// Default mock data to use when GraphQL query fails
const mockTeamMembers: TeamMember[] = [
  {
    id: 'tm001',
    fullName: 'Emily Davis',
    firstName: 'Emily',
    lastName: 'Davis',
    jobTitle: 'Marketing Specialist',
    department: 'Marketing',
    status: 'Online'
  },
  {
    id: 'tm002',
    fullName: 'David Wilson',
    firstName: 'David',
    lastName: 'Wilson',
    jobTitle: 'Software Developer',
    department: 'Engineering',
    status: 'Away'
  },
  {
    id: 'tm003',
    fullName: 'Alex Johnson',
    firstName: 'Alex',
    lastName: 'Johnson',
    jobTitle: 'UX Designer',
    department: 'Design',
    status: 'Offline'
  }
]

export interface TeamMember {
  id: string
  fullName: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  profilePicture?: string
  status?: 'Online' | 'Away' | 'Offline' // Status will be simulated for now
}

export interface UseTeamMembersResult {
  teamMembers: TeamMember[]
  loading: boolean
  error: Error | null
}

interface UseTeamMembersProps {
  accessToken: string
  employeeId: string
}

/**
 * Custom hook to fetch team members for a manager
 * @param {UseTeamMembersProps} props - Properties needed to fetch team members
 * @returns {UseTeamMembersResult} Team members, loading state, and error
 */
export const useTeamMembers = ({ accessToken, employeeId }: UseTeamMembersProps): UseTeamMembersResult => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!accessToken) {
        setError(new Error('Access token is required to fetch team members'))
        setLoading(false)
        return
      }

      if (!employeeId) {
        setError(new Error('Employee ID is required to fetch team members'))
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // During development, use mock data to avoid API calls
        // TODO: For production, remove this condition and use only the API
        if (process.env.NODE_ENV === 'development') {
          setTeamMembers(mockTeamMembers)
          setError(null)
          return
        }

        // GraphQL client is already configured with access token
        const response = await graphQLClient.request(getTeamMembersByManagerQuery, {
          managerId: employeeId
        })

        if (response?.Employee) {
          // Add simulated status to each team member
          const statuses: ('Online' | 'Away' | 'Offline')[] = ['Online', 'Away', 'Offline']
          const teamMembersWithStatus = response.Employee.map((member: Employee) => ({
            ...member,
            // Randomly assign a status for demonstration purposes
            status: statuses[Math.floor(Math.random() * statuses.length)]
          }))

          setTeamMembers(teamMembersWithStatus)
          setError(null)
        } else {
          // Fall back to mock data if API returns empty result
          setTeamMembers(mockTeamMembers)
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching team members:', err)
        // Fall back to mock data on error
        setTeamMembers(mockTeamMembers)
        setError(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamMembers()
  }, [accessToken, employeeId, graphQLClient])

  return { teamMembers, loading, error }
}
