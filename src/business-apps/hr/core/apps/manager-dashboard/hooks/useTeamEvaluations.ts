import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  getEmployeePerformanceEvaluationsAnalysis,
  getPerformanceEvaluationAnalysisDetail
} from '../../employee-record/components/tabs/performance-evaluation/services/performanceEvaluationApi'
import type {
  PerformanceEvaluationAnalysisDetailResponse,
  PerformanceEvaluationReviewerEntry
} from '../../employee-record/components/tabs/performance-evaluation/types/performanceEvaluation.types'

export interface EvaluationDimensionScore {
  name: string
  selfScore: number | null
  peerAvgScore: number | null
  managerScore: number | null
  overallAvg: number | null
}

export interface CycleScore {
  cycleName: string
  cycleId: string
  overallScore: number | null
  companyValuesAvg: number | null
  skillsAvg: number | null
  evaluationPeriodStartDate: string | null
  evaluationPeriodEndDate: string | null
}

export interface TeamMemberEvaluation {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  latestScore: number | null
  companyValuesAvg: number | null
  skillsAvg: number | null
  changeOverall: number | null
  changeCompanyValues: number | null
  changeSkills: number | null
  ratingScaleLimit: number | null
  companyValues: EvaluationDimensionScore[]
  skills: EvaluationDimensionScore[]
  cycleScores: CycleScore[]
  cycleName: string | null
  status: string | null
  evaluationCount: number
}

export interface TeamEvaluationsResult {
  members: TeamMemberEvaluation[]
  teamAvgScore: number | null
  teamCompanyValuesAvg: number | null
  teamSkillsAvg: number | null
  pendingEvaluations: number
  completedEvaluations: number
  availableCycles: Array<{ id: string; name: string }>
  loading: boolean
  error: Error | null
}

interface UseTeamEvaluationsProps {
  accessToken: string
  managerId: string
  selectedCycleId?: string | null
}

const DIMENSION_NAME_KEYS = ['companyValueName', 'skillName', 'name', 'title', 'label', 'value']

function getDimensionName(item: Record<string, unknown>): string {
  for (const key of DIMENSION_NAME_KEYS) {
    const val = item[key]
    if (typeof val === 'string' && val.trim()) return val
  }
  return 'Unknown'
}

function getReviewerScore(entry: PerformanceEvaluationReviewerEntry | null | undefined): number | null {
  if (!entry) return null
  return entry.ratingNumericEquivalent ?? null
}

function getPeerAvgScore(peers: PerformanceEvaluationReviewerEntry[] | null | undefined): number | null {
  if (!peers || peers.length === 0) return null
  const scores = peers.map(p => getReviewerScore(p)).filter((s): s is number => s !== null)
  if (scores.length === 0) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
}

function parseDimensionEntries(entries: Record<string, unknown>[] | null | undefined): EvaluationDimensionScore[] {
  if (!entries || entries.length === 0) return []
  return entries.map(item => {
    const selfScore = getReviewerScore(item.self as PerformanceEvaluationReviewerEntry | undefined)
    const peerAvgScore = getPeerAvgScore(item.peers as PerformanceEvaluationReviewerEntry[] | undefined)
    const managerScore = getReviewerScore(item.manager as PerformanceEvaluationReviewerEntry | undefined)

    const scores = [selfScore, peerAvgScore, managerScore].filter((s): s is number => s !== null)
    const overallAvg =
      scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null

    return {
      name: getDimensionName(item),
      selfScore,
      peerAvgScore,
      managerScore,
      overallAvg
    }
  })
}

interface EmployeeCycleData {
  employeeId: string
  cycleScores: CycleScore[]
  bestEvalPerCycle: Map<string, string>
  evaluationCount: number
  pending: number
  completed: number
}

interface CachedAnalysis {
  employees: any[]
  employeeCycleData: EmployeeCycleData[]
  cycleMap: Map<string, { name: string; evalEndDate: string | null }>
}

function buildCycleData(employees: any[], analysisResults: PromiseSettledResult<{ employeeId: string; data: any }>[]) {
  const cycleMap = new Map<string, { name: string; evalEndDate: string | null }>()

  const employeeCycleData: EmployeeCycleData[] = employees.map((emp: any) => {
    const matchingResult = analysisResults.find(r => r.status === 'fulfilled' && r.value.employeeId === emp.id)

    const cycleScores: CycleScore[] = []
    const bestEvalPerCycle = new Map<string, string>()
    let pending = 0
    let completed = 0
    let evaluationCount = 0

    if (matchingResult?.status === 'fulfilled') {
      const cycles = matchingResult.value.data?.performanceCycles || []
      evaluationCount = cycles.reduce((sum: number, c: any) => sum + (c.evaluations?.length || 0), 0)

      for (const cycle of cycles) {
        const cId = cycle.performanceCycleId
        const cName = cycle.performanceCycleName || cId
        if (!cycleMap.has(cId)) {
          cycleMap.set(cId, { name: cName, evalEndDate: cycle.evaluationPeriodEndDate ?? null })
        }

        let bestScoreInCycle: number | null = null
        let bestEvalIdInCycle: string | null = null
        for (const evalItem of cycle.evaluations || []) {
          const evalStatus = evalItem.statusRef
          if (evalStatus?.toUpperCase().includes('COMPLETED') || evalStatus?.toUpperCase().includes('CLOSED')) {
            completed++
          } else {
            pending++
          }

          const score = evalItem.overall?.averageNumeric ?? null
          if (score != null && bestScoreInCycle === null) {
            bestScoreInCycle = score
            bestEvalIdInCycle = evalItem.evaluationId
          }
        }

        if (bestEvalIdInCycle) {
          bestEvalPerCycle.set(cId, bestEvalIdInCycle)
        }

        cycleScores.push({
          cycleName: cName,
          cycleId: cId,
          overallScore: bestScoreInCycle,
          companyValuesAvg: null,
          skillsAvg: null,
          evaluationPeriodStartDate: cycle.evaluationPeriodStartDate ?? null,
          evaluationPeriodEndDate: cycle.evaluationPeriodEndDate ?? null
        })
      }
    }

    cycleScores.sort((a, b) => (b.evaluationPeriodEndDate ?? '').localeCompare(a.evaluationPeriodEndDate ?? ''))

    return { employeeId: emp.id, cycleScores, bestEvalPerCycle, evaluationCount, pending, completed }
  })

  return { employeeCycleData, cycleMap }
}

function resolveForCycle(
  cache: CachedAnalysis,
  targetCycleId: string | null | undefined,
  cycleDetailMap: Map<string, PerformanceEvaluationAnalysisDetailResponse>
) {
  let totalScore = 0
  let scoreCount = 0
  let totalCvAvg = 0
  let cvCount = 0
  let totalSkillsAvg = 0
  let skillsCount = 0
  let pendingTotal = 0
  let completedTotal = 0

  const memberData: TeamMemberEvaluation[] = cache.employees.map((emp: any, idx: number) => {
    const empCycle = cache.employeeCycleData[idx]
    const position = emp.employeePosition?.[0]
    const jobPositionName = position?.jobPosition?.name || ''

    pendingTotal += empCycle.pending
    completedTotal += empCycle.completed

    let latestScore: number | null = null
    let latestCycleId: string | null = null
    let cycleName: string | null = null
    const status: string | null = null

    for (const cs of empCycle.cycleScores) {
      const isTarget = !targetCycleId || cs.cycleId === targetCycleId
      if (isTarget && cs.overallScore != null && latestScore === null) {
        latestScore = cs.overallScore
        latestCycleId = cs.cycleId
        cycleName = cs.cycleName
      }
    }

    const latestKey = latestCycleId ? `${emp.id}:${latestCycleId}` : null
    const detail = latestKey ? cycleDetailMap.get(latestKey) : undefined

    const companyValues = parseDimensionEntries(detail?.companyValues as Record<string, unknown>[] | undefined)
    const skills = parseDimensionEntries(detail?.skills as Record<string, unknown>[] | undefined)

    const companyValuesAvg = detail?.averages?.companyValues ?? null
    const skillsAvg = detail?.averages?.skills ?? null
    const changeOverall = detail?.changesSinceLastReview?.overall ?? null
    const changeCompanyValues = detail?.changesSinceLastReview?.companyValues ?? null
    const changeSkills = detail?.changesSinceLastReview?.skills ?? null
    const ratingScaleLimit = detail?.ratingScaleLimit ?? null

    const cycleScoresWithDetails = empCycle.cycleScores.map(cs => {
      const d = cycleDetailMap.get(`${emp.id}:${cs.cycleId}`)
      return d
        ? { ...cs, companyValuesAvg: d.averages?.companyValues ?? null, skillsAvg: d.averages?.skills ?? null }
        : cs
    })

    if (latestScore != null) {
      totalScore += latestScore
      scoreCount++
    }
    if (companyValuesAvg != null) {
      totalCvAvg += companyValuesAvg
      cvCount++
    }
    if (skillsAvg != null) {
      totalSkillsAvg += skillsAvg
      skillsCount++
    }

    return {
      employeeId: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      pictureThumbnail: emp.pictureThumbnail,
      jobPositionName,
      latestScore,
      companyValuesAvg,
      skillsAvg,
      changeOverall,
      changeCompanyValues,
      changeSkills,
      ratingScaleLimit,
      companyValues,
      skills,
      cycleScores: cycleScoresWithDetails,
      cycleName,
      status,
      evaluationCount: empCycle.evaluationCount
    }
  })

  const sortedCycles = Array.from(cache.cycleMap.entries())
    .map(([id, info]) => ({ id, name: info.name }))
    .sort((a, b) => {
      const aEnd = cache.cycleMap.get(a.id)?.evalEndDate ?? ''
      const bEnd = cache.cycleMap.get(b.id)?.evalEndDate ?? ''
      return bEnd.localeCompare(aEnd)
    })

  return {
    memberData,
    teamAvgScore: scoreCount > 0 ? Math.round((totalScore / scoreCount) * 10) / 10 : null,
    teamCompanyValuesAvg: cvCount > 0 ? Math.round((totalCvAvg / cvCount) * 10) / 10 : null,
    teamSkillsAvg: skillsCount > 0 ? Math.round((totalSkillsAvg / skillsCount) * 10) / 10 : null,
    pendingEvaluations: pendingTotal,
    completedEvaluations: completedTotal,
    availableCycles: sortedCycles
  }
}

export const useTeamEvaluations = ({
  accessToken,
  managerId,
  selectedCycleId
}: UseTeamEvaluationsProps): TeamEvaluationsResult => {
  const [members, setMembers] = useState<TeamMemberEvaluation[]>([])
  const [teamAvgScore, setTeamAvgScore] = useState<number | null>(null)
  const [teamCompanyValuesAvg, setTeamCompanyValuesAvg] = useState<number | null>(null)
  const [teamSkillsAvg, setTeamSkillsAvg] = useState<number | null>(null)
  const [pendingEvaluations, setPendingEvaluations] = useState(0)
  const [completedEvaluations, setCompletedEvaluations] = useState(0)
  const [availableCycles, setAvailableCycles] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)
  const cacheRef = useRef<CachedAnalysis | null>(null)
  const detailCacheRef = useRef(new Map<string, PerformanceEvaluationAnalysisDetailResponse>())

  const fetchBaseAnalysis = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const directReportsQuery = `
        query GetDirectReportsForEvals($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
              }
            }
          }
        }
      `

      const drResponse = await graphQLClient.request(directReportsQuery, { managerId })
      const employees = drResponse?.Employee || []

      if (employees.length === 0) {
        cacheRef.current = null
        setMembers([])
        setTeamAvgScore(null)
        setTeamCompanyValuesAvg(null)
        setTeamSkillsAvg(null)
        setPendingEvaluations(0)
        setCompletedEvaluations(0)
        setAvailableCycles([])
        setLoading(false)
        return
      }

      const analysisResults = await Promise.allSettled(
        employees.map((emp: any) =>
          getEmployeePerformanceEvaluationsAnalysis(accessToken, emp.id).then(result => ({
            employeeId: emp.id,
            data: result
          }))
        )
      )

      const { employeeCycleData, cycleMap } = buildCycleData(employees, analysisResults)
      cacheRef.current = { employees, employeeCycleData, cycleMap }
      detailCacheRef.current = new Map()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team evaluations'))
      setLoading(false)
    }
  }, [managerId, accessToken, graphQLClient])

  const fetchDetailsForCycle = useCallback(async () => {
    const cache = cacheRef.current
    if (!cache || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const evalIdsToFetch: Array<{ employeeId: string; evaluationId: string; cycleId: string }> = []

      for (const empCycle of cache.employeeCycleData) {
        for (const cs of empCycle.cycleScores) {
          const isTarget = !selectedCycleId || cs.cycleId === selectedCycleId
          if (isTarget && cs.overallScore != null) {
            const evalId = empCycle.bestEvalPerCycle.get(cs.cycleId)
            const key = `${empCycle.employeeId}:${cs.cycleId}`
            if (evalId && !detailCacheRef.current.has(key)) {
              evalIdsToFetch.push({ employeeId: empCycle.employeeId, evaluationId: evalId, cycleId: cs.cycleId })
            }
            break
          }
        }
      }

      if (evalIdsToFetch.length > 0) {
        const detailResults = await Promise.allSettled(
          evalIdsToFetch.map(({ employeeId, evaluationId, cycleId }) =>
            getPerformanceEvaluationAnalysisDetail(accessToken, evaluationId, {
              employeeId,
              includePeerReviewerIdentity: false
            }).then(detail => ({ employeeId, cycleId, detail }))
          )
        )

        for (const result of detailResults) {
          if (result.status === 'fulfilled') {
            detailCacheRef.current.set(`${result.value.employeeId}:${result.value.cycleId}`, result.value.detail)
          }
        }
      }

      const resolved = resolveForCycle(cache, selectedCycleId, detailCacheRef.current)

      setMembers(resolved.memberData)
      setTeamAvgScore(resolved.teamAvgScore)
      setTeamCompanyValuesAvg(resolved.teamCompanyValuesAvg)
      setTeamSkillsAvg(resolved.teamSkillsAvg)
      setPendingEvaluations(resolved.pendingEvaluations)
      setCompletedEvaluations(resolved.completedEvaluations)
      setAvailableCycles(resolved.availableCycles)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch evaluation details'))
    } finally {
      setLoading(false)
    }
  }, [accessToken, selectedCycleId])

  useEffect(() => {
    let cancelled = false
    fetchBaseAnalysis().then(() => {
      if (!cancelled && cacheRef.current) {
        fetchDetailsForCycle()
      }
    })
    return () => {
      cancelled = true
    }
  }, [fetchBaseAnalysis, fetchDetailsForCycle])

  useEffect(() => {
    if (cacheRef.current) {
      fetchDetailsForCycle()
    }
  }, [selectedCycleId, fetchDetailsForCycle])

  return {
    members,
    teamAvgScore,
    teamCompanyValuesAvg,
    teamSkillsAvg,
    pendingEvaluations,
    completedEvaluations,
    availableCycles,
    loading,
    error
  }
}
