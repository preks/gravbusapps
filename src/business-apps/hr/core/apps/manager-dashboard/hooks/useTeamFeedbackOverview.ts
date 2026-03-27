import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

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
      const directReportsQuery = `
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
          }
        }
      `

      const drResponse = await graphQLClient.request(directReportsQuery, { managerId })
      const employees = drResponse?.Employee || []

      if (employees.length === 0) {
        setMembers([])
        setTeamAvgRating(null)
        setTotalReceivedCount(0)
        setTotalGivenCount(0)
        setFeedbackCoverage(0)
        setRecognitionRatio(null)
        setMembersWithNoRecentFeedback([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: any) => emp.id)

      const hasPeriodFilter = !!(periodStart && periodEnd)

      const feedbackQuery = hasPeriodFilter
        ? `
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
        : `
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

      const fbVariables = hasPeriodFilter ? { employeeIds, periodStart, periodEnd } : { employeeIds }
      const fbResponse = await graphQLClient.request(feedbackQuery, fbVariables)
      const receivedFeedback = fbResponse?.received || []
      const givenFeedback = fbResponse?.given || []

      const receivedByEmployee = new Map<
        string,
        Array<{ rating: number | null; feedbackDate: string | null; typeRef: string | null }>
      >()
      const givenByEmployee = new Map<string, number>()

      for (const empId of employeeIds) {
        receivedByEmployee.set(empId, [])
        givenByEmployee.set(empId, 0)
      }

      for (const fb of receivedFeedback) {
        const empFeedback = receivedByEmployee.get(fb.employeeId)
        if (empFeedback) {
          empFeedback.push({ rating: fb.rating, feedbackDate: fb.feedbackDate, typeRef: fb.typeRef })
        }
      }

      for (const fb of givenFeedback) {
        const current = givenByEmployee.get(fb.senderEmployeeId) ?? 0
        givenByEmployee.set(fb.senderEmployeeId, current + 1)
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

      const memberData: TeamMemberFeedback[] = employees.map((emp: any) => {
        const received = receivedByEmployee.get(emp.id) || []
        const givenCount = givenByEmployee.get(emp.id) || 0
        const receivedCount = received.length
        allReceivedCount += receivedCount
        allGivenCount += givenCount

        if (receivedCount > 0) membersWithFeedback++

        const ratingsWithValues = received.filter((f: any) => f.rating != null && f.rating > 0)
        const avgRating =
          ratingsWithValues.length > 0
            ? Math.round(
                (ratingsWithValues.reduce((sum: number, f: any) => sum + f.rating, 0) / ratingsWithValues.length) * 10
              ) / 10
            : null

        if (avgRating != null) {
          totalRatingSum += avgRating * ratingsWithValues.length
          totalRatingCount += ratingsWithValues.length
        }

        let recognitionCount = 0
        let developmentalCount = 0
        for (const fb of received) {
          if (fb.typeRef) {
            totalWithType++
            if (isRecognitionType(fb.typeRef)) {
              recognitionCount++
              totalRecognition++
            } else {
              developmentalCount++
            }
          }
        }

        const lastDate = received.length > 0 ? received[0].feedbackDate : null

        if (!lastDate || new Date(lastDate) < thresholdDate) {
          noRecentFeedback.push(emp.id)
        }

        return {
          employeeId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          feedbackReceivedCount: receivedCount,
          feedbackGivenCount: givenCount,
          avgRating,
          lastFeedbackDate: lastDate,
          recognitionCount,
          developmentalCount
        }
      })

      const overallAvgRating = totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : null
      const coverage = employees.length > 0 ? Math.round((membersWithFeedback / employees.length) * 100) : 0
      const recRatio = totalWithType > 0 ? Math.round((totalRecognition / totalWithType) * 100) / 100 : null

      setMembers(memberData)
      setTeamAvgRating(overallAvgRating)
      setTotalReceivedCount(allReceivedCount)
      setTotalGivenCount(allGivenCount)
      setFeedbackCoverage(coverage)
      setRecognitionRatio(recRatio)
      setMembersWithNoRecentFeedback(noRecentFeedback)
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
