import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'

export interface TeamMemberFeedback {
  employeeId: string
  firstName: string
  lastName: string
  feedbackReceivedCount: number
  feedbackGivenCount: number
  avgRating: number | null
  lastFeedbackDate: string | null
  recognitionCount: number
  developmentalCount: number
}

export interface TeamFeedbackOverviewResult {
  members: TeamMemberFeedback[]
  teamAvgRating: number | null
  totalReceivedCount: number
  totalGivenCount: number
  feedbackCoverage: number
  recognitionRatio: number | null
  membersWithNoRecentFeedback: string[]
  loading: boolean
  error: Error | null
}

interface UseTeamFeedbackOverviewProps {
  accessToken: string
  managerId: string
  /** When provided, only include feedback within this date range (ISO date strings) */
  periodStart?: string
  periodEnd?: string
}

const RECENT_FEEDBACK_THRESHOLD_DAYS = 30

const RECOGNITION_TYPE_REFS = ['recognition', 'praise', 'kudos', 'positive']

function isRecognitionType(typeRef: string | null | undefined): boolean {
  if (!typeRef) return false
  const lower = typeRef.toLowerCase()
  return RECOGNITION_TYPE_REFS.some(r => lower.includes(r))
}

const DIRECT_REPORTS_QUERY = `
  query GetDirectReportsForFeedback($managerId: uuid!) {
    Employee(
      where: {
        employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
        isDeleted: { _eq: false }
      }
    ) {
      id
      firstName
      lastName
      workingCondition {
        hireDate
      }
    }
  }
`

const FILTERED_FEEDBACK_QUERY = `
  query GetTeamFeedbackOverviewFiltered($employeeIds: [uuid!]!, $periodStart: timestamp!, $periodEnd: timestamp!) {
    received: EmployeeFeedback(
      where: {
        employeeId: { _in: $employeeIds },
        isDeleted: { _eq: false },
        feedbackDate: { _gte: $periodStart, _lte: $periodEnd }
      },
      orderBy: { feedbackDate: DESC },
      limit: 500
    ) {
      id
      feedbackDate
      rating
      typeRef
      employeeId
    }
    given: EmployeeFeedback(
      where: {
        senderEmployeeId: { _in: $employeeIds },
        isDeleted: { _eq: false },
        feedbackDate: { _gte: $periodStart, _lte: $periodEnd }
      },
      orderBy: { feedbackDate: DESC },
      limit: 500
    ) {
      id
      feedbackDate
      senderEmployeeId
    }
  }
`

const FEEDBACK_QUERY = `
  query GetTeamFeedbackOverview($employeeIds: [uuid!]!) {
    received: EmployeeFeedback(
      where: {
        employeeId: { _in: $employeeIds },
        isDeleted: { _eq: false }
      },
      orderBy: { feedbackDate: DESC },
      limit: 500
    ) {
      id
      feedbackDate
      rating
      typeRef
      employeeId
    }
    given: EmployeeFeedback(
      where: {
        senderEmployeeId: { _in: $employeeIds },
        isDeleted: { _eq: false }
      },
      orderBy: { feedbackDate: DESC },
      limit: 500
    ) {
      id
      feedbackDate
      senderEmployeeId
    }
  }
`

const emptyFeedbackOverview = {
  members: [] as TeamMemberFeedback[],
  teamAvgRating: null as number | null,
  totalReceivedCount: 0,
  totalGivenCount: 0,
  feedbackCoverage: 0,
  recognitionRatio: null as number | null,
  membersWithNoRecentFeedback: [] as string[]
}

const seededFeedbackMaps = (employeeIds: string[]) => {
  const receivedByEmployee = new Map<
    string,
    Array<{ rating: number | null; feedbackDate: string | null; typeRef: string | null }>
  >()
  const givenByEmployee = new Map<string, number>()
  for (const employeeId of employeeIds) {
    receivedByEmployee.set(employeeId, [])
    givenByEmployee.set(employeeId, 0)
  }
  return { receivedByEmployee, givenByEmployee }
}

const queryAndVariablesForFeedback = (
  employeeIds: string[],
  periodStart?: string,
  periodEnd?: string
): { query: string; variables: Record<string, unknown> } => {
  const hasPeriodFilter = !!(periodStart && periodEnd)
  if (hasPeriodFilter) {
    return {
      query: FILTERED_FEEDBACK_QUERY,
      variables: { employeeIds, periodStart, periodEnd }
    }
  }

  return {
    query: FEEDBACK_QUERY,
    variables: { employeeIds }
  }
}

const buildFeedbackOverview = (
  employees: any[],
  employeeIds: string[],
  receivedFeedback: any[],
  givenFeedback: any[]
): typeof emptyFeedbackOverview => {
  const { receivedByEmployee, givenByEmployee } = seededFeedbackMaps(employeeIds)

  for (const feedbackEntry of receivedFeedback) {
    const employeeFeedback = receivedByEmployee.get(feedbackEntry.employeeId)
    if (!employeeFeedback) continue
    employeeFeedback.push({
      rating: feedbackEntry.rating,
      feedbackDate: feedbackEntry.feedbackDate,
      typeRef: feedbackEntry.typeRef
    })
  }

  for (const feedbackEntry of givenFeedback) {
    const current = givenByEmployee.get(feedbackEntry.senderEmployeeId) ?? 0
    givenByEmployee.set(feedbackEntry.senderEmployeeId, current + 1)
  }

  const now = new Date()
  const thresholdDate = new Date(now.getTime() - RECENT_FEEDBACK_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)
  const noRecentFeedback: string[] = []
  let totalRatingSum = 0
  let totalRatingCount = 0
  let allReceivedCount = 0
  let allGivenCount = 0
  let totalRecognition = 0
  let totalWithType = 0
  let membersWithFeedback = 0

  const members = employees.map((employee: any) => {
    const received = receivedByEmployee.get(employee.id) ?? []
    const givenCount = givenByEmployee.get(employee.id) ?? 0
    const receivedCount = received.length
    allReceivedCount += receivedCount
    allGivenCount += givenCount

    if (receivedCount > 0) membersWithFeedback++

    const ratingsWithValues = received.filter(item => item.rating != null && item.rating > 0)
    const avgRating =
      ratingsWithValues.length > 0
        ? Math.round(
            (ratingsWithValues.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratingsWithValues.length) * 10
          ) / 10
        : null

    if (avgRating !== null) {
      totalRatingSum += avgRating * ratingsWithValues.length
      totalRatingCount += ratingsWithValues.length
    }

    let recognitionCount = 0
    let developmentalCount = 0
    for (const feedbackItem of received) {
      if (!feedbackItem.typeRef) continue
      totalWithType++
      if (isRecognitionType(feedbackItem.typeRef)) {
        recognitionCount++
        totalRecognition++
      } else {
        developmentalCount++
      }
    }

    const lastDate = received[0]?.feedbackDate ?? null
    if (!lastDate || new Date(lastDate) < thresholdDate) {
      noRecentFeedback.push(employee.id)
    }

    return {
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      feedbackReceivedCount: receivedCount,
      feedbackGivenCount: givenCount,
      avgRating,
      lastFeedbackDate: lastDate,
      recognitionCount,
      developmentalCount
    }
  })

  const teamAvgRating = totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : null
  const feedbackCoverage = employees.length > 0 ? Math.round((membersWithFeedback / employees.length) * 100) : 0
  const recognitionRatio = totalWithType > 0 ? Math.round((totalRecognition / totalWithType) * 100) / 100 : null

  return {
    members,
    teamAvgRating,
    totalReceivedCount: allReceivedCount,
    totalGivenCount: allGivenCount,
    feedbackCoverage,
    recognitionRatio,
    membersWithNoRecentFeedback: noRecentFeedback
  }
}

export const useTeamFeedbackOverview = ({
  accessToken,
  managerId,
  periodStart,
  periodEnd
}: UseTeamFeedbackOverviewProps): TeamFeedbackOverviewResult => {
  const [members, setMembers] = useState<TeamMemberFeedback[]>([])
  const [teamAvgRating, setTeamAvgRating] = useState<number | null>(null)
  const [totalReceivedCount, setTotalReceivedCount] = useState(0)
  const [totalGivenCount, setTotalGivenCount] = useState(0)
  const [feedbackCoverage, setFeedbackCoverage] = useState(0)
  const [recognitionRatio, setRecognitionRatio] = useState<number | null>(null)
  const [membersWithNoRecentFeedback, setMembersWithNoRecentFeedback] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamFeedback = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const drResponse = await graphQLClient.request(DIRECT_REPORTS_QUERY, { managerId })
      const employees = filterEmployeesByStartedEmployment(drResponse?.Employee || [])

      if (employees.length === 0) {
        setMembers(emptyFeedbackOverview.members)
        setTeamAvgRating(emptyFeedbackOverview.teamAvgRating)
        setTotalReceivedCount(emptyFeedbackOverview.totalReceivedCount)
        setTotalGivenCount(emptyFeedbackOverview.totalGivenCount)
        setFeedbackCoverage(emptyFeedbackOverview.feedbackCoverage)
        setRecognitionRatio(emptyFeedbackOverview.recognitionRatio)
        setMembersWithNoRecentFeedback(emptyFeedbackOverview.membersWithNoRecentFeedback)
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: any) => emp.id)
      const { query, variables } = queryAndVariablesForFeedback(employeeIds, periodStart, periodEnd)
      const fbResponse = await graphQLClient.request(query, variables)
      const receivedFeedback = fbResponse?.received ?? []
      const givenFeedback = fbResponse?.given ?? []
      const overview = buildFeedbackOverview(employees, employeeIds, receivedFeedback, givenFeedback)

      setMembers(overview.members)
      setTeamAvgRating(overview.teamAvgRating)
      setTotalReceivedCount(overview.totalReceivedCount)
      setTotalGivenCount(overview.totalGivenCount)
      setFeedbackCoverage(overview.feedbackCoverage)
      setRecognitionRatio(overview.recognitionRatio)
      setMembersWithNoRecentFeedback(overview.membersWithNoRecentFeedback)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team feedback overview'))
      console.error('Error fetching team feedback overview:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient, periodStart, periodEnd])

  useEffect(() => {
    fetchTeamFeedback()
  }, [fetchTeamFeedback])

  return {
    members,
    teamAvgRating,
    totalReceivedCount,
    totalGivenCount,
    feedbackCoverage,
    recognitionRatio,
    membersWithNoRecentFeedback,
    loading,
    error
  }
}
