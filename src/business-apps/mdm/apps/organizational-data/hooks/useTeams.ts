import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { MatrixTeamApiResponse, Team } from '../types'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export const useTeams = (context: BusinessAppContextProps) => {
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureId = useRef<string>(getCurrentActiveStructureId() ?? '')

  const orgchartClient = useOrgchartClient(context.accessToken)

  // Transform API matrix team response to UI-friendly Team interface
  const transformTeam = (apiTeam: MatrixTeamApiResponse): Team => {
    // Calculate team age
    const createdDate = new Date(apiTeam.createdAt)
    const now = new Date()
    const diffInMs = now.getTime() - createdDate.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    let age: string
    if (diffInDays < 1) {
      age = 'Today'
    } else if (diffInDays < 7) {
      age = `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      age = `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30)
      age = `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      const years = Math.floor(diffInDays / 365)
      age = `${years} year${years > 1 ? 's' : ''} ago`
    }

    // Build leader name
    const leaderName = apiTeam.leader ? `${apiTeam.leader.firstName} ${apiTeam.leader.lastName}` : undefined

    // Determine status - teams with leaders are considered active
    const status: 'Active' | 'Inactive' = apiTeam.leader ? 'Active' : 'Inactive'

    return {
      id: apiTeam.id,
      structureId: apiTeam.structureId,
      name: apiTeam.name,
      description: apiTeam.description || '',
      createdAt: apiTeam.createdAt,
      rank: apiTeam.rank,
      // Leader information
      leaderId: apiTeam.leader?.id,
      leaderName,
      leaderRole: apiTeam.leader?.role,
      leaderJobPosition: apiTeam.leader?.jobPosition?.jobPositionName,
      leaderPictureUrl: apiTeam.leader?.pictureUrl,
      leaderMatrixUnitName: apiTeam.leader?.matrixUnit?.matrixUnitName,
      leaderPercentage: apiTeam.leader?.matrixUnit?.percentage,
      // Computed fields
      hasLeader: Boolean(apiTeam.leader),
      status,
      createdDate,
      age
    }
  }

  // Fetch matrix teams from API
  const fetchTeams = useCallback(async (): Promise<Team[]> => {
    try {
      const activeId = structureId.current || getCurrentActiveStructureId()
      if (!activeId) {
        throw new Error('No active structure found')
      }
      structureId.current = activeId

      const response = await orgchartClient.getMatrixUnits<MatrixTeamApiResponse[]>(
        { structureId: structureId.current },
        {
          headers: {
            Authorization: `Bearer ${context.accessToken}`
          }
        }
      )

      // Transform API response to UI-friendly format
      const transformedTeams = response.map(transformTeam)

      // Sort by rank (ascending) then by name
      transformedTeams.sort((a, b) => {
        if (a.rank !== b.rank) {
          return a.rank - b.rank
        }
        return a.name.localeCompare(b.name)
      })

      return transformedTeams
    } catch (error) {
      console.error('Error fetching teams:', error)
      throw new Error('Failed to fetch teams from orgchart API')
    }
  }, [context.accessToken, orgchartClient])

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const teamsData = await fetchTeams()
      setTeams(teamsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading teams:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchTeams])

  // Search teams by name, description, or leader
  const searchTeams = useCallback(
    (query: string): Team[] => {
      const searchTerm = query.toLowerCase()
      return teams.filter(
        team =>
          team.name.toLowerCase().includes(searchTerm) ||
          team.description.toLowerCase().includes(searchTerm) ||
          (team.leaderName && team.leaderName.toLowerCase().includes(searchTerm)) ||
          (team.leaderJobPosition && team.leaderJobPosition.toLowerCase().includes(searchTerm))
      )
    },
    [teams]
  )

  // Filter teams by status
  const getTeamsByStatus = useCallback(
    (status: 'Active' | 'Inactive'): Team[] => {
      return teams.filter(team => team.status === status)
    },
    [teams]
  )

  // Get teams with leaders
  const getTeamsWithLeaders = useCallback((): Team[] => {
    return teams.filter(team => team.hasLeader)
  }, [teams])

  // Get teams without leaders
  const getTeamsWithoutLeaders = useCallback((): Team[] => {
    return teams.filter(team => !team.hasLeader)
  }, [teams])

  // Get team by ID
  const getTeamById = useCallback(
    (teamId: string): Team | undefined => {
      return teams.find(team => team.id === teamId)
    },
    [teams]
  )

  // Get teams by leader
  const getTeamsByLeader = useCallback(
    (leaderId: string): Team[] => {
      return teams.filter(team => team.leaderId === leaderId)
    },
    [teams]
  )

  // Sort teams by different criteria
  const getSortedTeams = useCallback(
    (sortBy: 'name' | 'rank' | 'created' | 'leader', teamsToSort?: Team[]): Team[] => {
      const sortedTeams = [...(teamsToSort || teams)]

      switch (sortBy) {
        case 'name':
          return sortedTeams.sort((a, b) => a.name.localeCompare(b.name))
        case 'rank':
          return sortedTeams.sort((a, b) => a.rank - b.rank)
        case 'created':
          return sortedTeams.sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
        case 'leader':
          return sortedTeams.sort((a, b) => {
            if (!a.leaderName && !b.leaderName) return 0
            if (!a.leaderName) return 1
            if (!b.leaderName) return -1
            return a.leaderName.localeCompare(b.leaderName)
          })
        default:
          return sortedTeams
      }
    },
    [teams]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    teams,
    structureId: structureId.current,

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Search and filter functions
    searchTeams,
    getTeamsByStatus,
    getTeamsWithLeaders,
    getTeamsWithoutLeaders,
    getTeamById,
    getTeamsByLeader,
    getSortedTeams,

    // Statistics
    totalTeams: teams.length,
    activeTeams: getTeamsByStatus('Active').length,
    inactiveTeams: getTeamsByStatus('Inactive').length,
    teamsWithLeaders: getTeamsWithLeaders().length,
    teamsWithoutLeaders: getTeamsWithoutLeaders().length
  }
}
