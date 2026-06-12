import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_MEMBERS, GET_TEAM_MEMBER_THUMBNAILS, GET_TEAM_MEMBER_CONTRACT_FLAGS } from '../queries/queries'
import { TeamMember } from '../types/types'
import { toLocalDateKey, toComparableDateKey } from '../utils/timeUtils'

interface UseTeamMembersReturn {
  members: TeamMember[]
  memberIds: string[]
  allMembers: TeamMember[]
  allMemberIds: string[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface WorkingConditionRaw {
  hireDate?: string | null
  activeFrom?: string | null
  activeTo?: string | null
  contractType?: { objectValue?: Record<string, unknown> | null } | null
}

interface WorkingHoursRaw {
  activeFrom?: string | null
  activeTo?: string | null
  mondayHours?: number | null
  tuesdayHours?: number | null
  wednesdayHours?: number | null
  thursdayHours?: number | null
  fridayHours?: number | null
  saturdayHours?: number | null
  sundayHours?: number | null
  weeklyHours?: number
  weeklyDays?: number
}

const isContractTimeRelevant = (workingConditions: WorkingConditionRaw[] | undefined): boolean => {
  if (!workingConditions || workingConditions.length === 0) return true

  const todayKey = toLocalDateKey(new Date())
  const activeCondition = workingConditions.find(wc => {
    const from = toComparableDateKey(wc.activeFrom)
    const to = toComparableDateKey(wc.activeTo)
    if (from && from > todayKey) return false
    if (to && to < todayKey) return false
    return true
  })

  const condition = activeCondition ?? workingConditions[workingConditions.length - 1]
  const objectValue = condition?.contractType?.objectValue
  if (!objectValue || typeof objectValue !== 'object') return true

  return objectValue.time_relevant !== false
}

const getEarliestHireDate = (
  workingConditions: Array<{ hireDate?: string | null }> | undefined
): string | undefined => {
  if (!workingConditions || workingConditions.length === 0) {
    return undefined
  }

  let earliest: string | null = null

  for (const workingCondition of workingConditions) {
    const hireDateKey = toComparableDateKey(workingCondition.hireDate)
    if (!hireDateKey) {
      continue
    }

    if (!earliest || hireDateKey < earliest) {
      earliest = hireDateKey
    }
  }

  return earliest ?? undefined
}

export const useTeamMembers = (context: BusinessAppContextProps): UseTeamMembersReturn => {
  const { accessToken, userInfo } = context
  const supervisorId = userInfo?.employeeDetails?.employeeId
  const graphqlClient = useGraphQLClient(accessToken)

  const [coreMembers, setCoreMembers] = useState<TeamMember[]>([])
  const [thumbnailMap, setThumbnailMap] = useState<Map<string, string>>(new Map())
  const [timeRelevantMap, setTimeRelevantMap] = useState<Map<string, boolean>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const thumbnailsFetched = useRef(false)
  const contractFlagsFetched = useRef(false)

  const fetchMembers = useCallback(async () => {
    if (!supervisorId || !graphqlClient) {
      setError('Supervisor ID not available')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    thumbnailsFetched.current = false
    contractFlagsFetched.current = false

    try {
      const result = await graphqlClient.request<any>(GET_TEAM_MEMBERS, { supervisorId })
      const employees = result?.Employee ?? []

      const mapped: TeamMember[] = employees.map((emp: any) => {
        const workingHoursRecords = emp.workingHours as WorkingHoursRaw[] | undefined

        return {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          hireDate: getEarliestHireDate(emp.workingCondition),
          orgUnit: emp.employeePosition?.organizationalUnit?.name,
          timeRelevant: true,
          workingHours: workingHoursRecords?.map(workingHours => ({
            activeFrom: workingHours.activeFrom,
            activeTo: workingHours.activeTo,
            mondayHours: workingHours.mondayHours ?? 0,
            tuesdayHours: workingHours.tuesdayHours ?? 0,
            wednesdayHours: workingHours.wednesdayHours ?? 0,
            thursdayHours: workingHours.thursdayHours ?? 0,
            fridayHours: workingHours.fridayHours ?? 0,
            saturdayHours: workingHours.saturdayHours ?? 0,
            sundayHours: workingHours.sundayHours ?? 0,
            weeklyHours: workingHours.weeklyHours,
            weeklyDays: workingHours.weeklyDays
          }))
        }
      })

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

  useEffect(() => {
    if (!graphqlClient || coreMembers.length === 0 || contractFlagsFetched.current) return
    contractFlagsFetched.current = true

    const ids = coreMembers.map(m => m.id)
    graphqlClient
      .request<any>(GET_TEAM_MEMBER_CONTRACT_FLAGS, { employeeIds: ids })
      .then(result => {
        const newMap = new Map<string, boolean>()
        ;(result?.Employee ?? []).forEach((emp: any) => {
          newMap.set(emp.id, isContractTimeRelevant(emp.workingCondition))
        })
        if (newMap.size > 0) setTimeRelevantMap(newMap)
      })
      .catch(() => {
        // contract flags are non-critical, default to true
      })
  }, [graphqlClient, coreMembers.length])

  const enrichMember = useCallback(
    (m: TeamMember): TeamMember => {
      const thumb = thumbnailMap.get(m.id)
      const timeRelevant = timeRelevantMap.get(m.id) ?? true
      if (!thumb && timeRelevant === m.timeRelevant) return m
      return { ...m, ...(thumb ? { pictureThumbnail: thumb } : {}), timeRelevant }
    },
    [thumbnailMap, timeRelevantMap]
  )

  const members = useMemo(() => {
    const todayKey = toLocalDateKey(new Date())
    return coreMembers
      .filter(member => {
        const hireDateKey = toComparableDateKey(member.hireDate)
        if (!hireDateKey) return true
        return hireDateKey <= todayKey
      })
      .map(enrichMember)
  }, [coreMembers, enrichMember])

  const allMembers = useMemo(() => coreMembers.map(enrichMember), [coreMembers, enrichMember])

  const memberIds = useMemo(() => members.map(m => m.id), [members])
  const allMemberIds = useMemo(() => allMembers.map(m => m.id), [allMembers])

  return { members, memberIds, allMembers, allMemberIds, isLoading, error, refetch: fetchMembers }
}
