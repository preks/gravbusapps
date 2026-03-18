import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_MEMBERS, GET_TEAM_MEMBER_THUMBNAILS } from '../queries/queries'
import { TeamMember } from '../types/types'

interface UseTeamMembersReturn {
  members: TeamMember[]
  memberIds: string[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useTeamMembers = (context: BusinessAppContextProps): UseTeamMembersReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)

  const [coreMembers, setCoreMembers] = useState<TeamMember[]>([])
  const [thumbnailMap, setThumbnailMap] = useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const thumbnailsFetched = useRef(false)

  const fetchMembers = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setError('Supervisor ID not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    thumbnailsFetched.current = false

    try {
      const result = await graphqlClient.request<any>(GET_TEAM_MEMBERS, { supervisorId })
      const employees = result?.Employee ?? []

      const mapped: TeamMember[] = employees.map((emp: any) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        orgUnit: emp.employeePosition?.organizationalUnit?.name,
        workingHours: emp.workingHours?.[0]
          ? {
              mondayHours: emp.workingHours[0].mondayHours ?? 0,
              tuesdayHours: emp.workingHours[0].tuesdayHours ?? 0,
              wednesdayHours: emp.workingHours[0].wednesdayHours ?? 0,
              thursdayHours: emp.workingHours[0].thursdayHours ?? 0,
              fridayHours: emp.workingHours[0].fridayHours ?? 0,
              saturdayHours: emp.workingHours[0].saturdayHours ?? 0,
              sundayHours: emp.workingHours[0].sundayHours ?? 0,
              weeklyHours: emp.workingHours[0].weeklyHours,
              weeklyDays: emp.workingHours[0].weeklyDays
            }
          : undefined
      }))

      setCoreMembers(mapped)
    } catch (err) {
      console.error('Error fetching team members:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch team members')
    } finally {
      setIsLoading(false)
    }
  }, [supervisorId, graphqlClient])

  useEffect(() => {
    if (accessToken && supervisorId) {
      fetchMembers()
    }
  }, [accessToken, supervisorId, fetchMembers])

  useEffect(() => {
    if (!graphqlClient || coreMembers.length === 0 || thumbnailsFetched.current) return
    thumbnailsFetched.current = true

    const ids = coreMembers.map(m => m.id)
    graphqlClient
      .request<any>(GET_TEAM_MEMBER_THUMBNAILS, { employeeIds: ids })
      .then(result => {
        const newMap = new Map<string, string>()
        ;(result?.Employee ?? []).forEach((e: any) => {
          if (e.pictureThumbnail) newMap.set(e.id, e.pictureThumbnail)
        })
        if (newMap.size > 0) setThumbnailMap(newMap)
      })
      .catch(() => {
        // thumbnails are non-critical
      })
  }, [graphqlClient, coreMembers.length])

  const members = useMemo(() => {
    if (thumbnailMap.size === 0) return coreMembers
    return coreMembers.map(m => {
      const thumb = thumbnailMap.get(m.id)
      return thumb ? { ...m, pictureThumbnail: thumb } : m
    })
  }, [coreMembers, thumbnailMap])

  const memberIds = useMemo(() => coreMembers.map(m => m.id), [coreMembers])

  return { members, memberIds, isLoading, error, refetch: fetchMembers }
}
