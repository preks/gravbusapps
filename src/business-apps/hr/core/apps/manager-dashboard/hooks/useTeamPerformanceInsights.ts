import { useState, useCallback, useRef, useEffect } from 'react'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { TeamMemberPerformance } from './useTeamPerformance'
import { TeamMemberSkills } from './useTeamSkills'
import { TeamMemberFeedback } from './useTeamFeedbackOverview'
import { TeamMemberEvaluation } from './useTeamEvaluations'

const TEAM_PERFORMANCE_ANALYZER_EXPERT_ID = '69c26839397e75a824d38c59'

const CACHE_KEY_PREFIX = 'teamPerfInsights_'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export interface TeamPerformancePriority {
  priority: string
  urgency: 'high' | 'medium' | 'low'
  affected_employees: string[]
  recommended_action: string
}

export interface TeamPerformanceAction {
  action: string
  target_employees: string[]
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
}

export interface DimensionInsights {
  goals: {
    status: string
    trend: string
    highlights: string[]
    concerns: string[]
  }
  skills: {
    coverage_score: number
    gaps: string[]
    strengths: string[]
    development_needs: string[]
  }
  feedback: {
    team_sentiment: string
    avg_score: number
    highlights: string[]
    attention_needed: string[]
  }
  evaluations: {
    avg_score: number
    distribution: string
    top_performers: string[]
    needs_support: string[]
  }
}

export interface TeamPerformanceInsightsData {
  executive_summary: string
  team_health_score: number
  top_priorities: TeamPerformancePriority[]
  dimension_insights: DimensionInsights
  recommended_actions: TeamPerformanceAction[]
  team_strengths: string[]
  team_risks: string[]
}

export interface TeamPerformanceInsightsResult {
  data: TeamPerformanceInsightsData | null
  isAnalyzing: boolean
  error: string | null
  analyze: () => Promise<void>
  clear: () => void
}

interface CompileSnapshotParams {
  goals: {
    teamPerformance: TeamMemberPerformance[]
    averageTeamProgress: number
    totalGoals: number
    goalsOnTrack: number
    goalsAtRisk: number
    goalsBehindTarget: number
    goalsAchieved: number
  }
  skills: {
    members: TeamMemberSkills[]
    teamSkillCoverage: number
    topSkillGaps: Array<{ skillName: string; employeeName: string; requiredLevel: number; currentLevel: number | null }>
    topTeamStrengths: string[]
  }
  feedback: {
    members: TeamMemberFeedback[]
    teamAvgRating: number | null
    totalReceivedCount: number
    totalGivenCount: number
    feedbackCoverage: number
    recognitionRatio: number | null
    membersWithNoRecentFeedback: string[]
  }
  evaluations: {
    members: TeamMemberEvaluation[]
    teamAvgScore: number | null
    teamCompanyValuesAvg: number | null
    teamSkillsAvg: number | null
    pendingEvaluations: number
    completedEvaluations: number
  }
  managerName: string
  teamSize: number
  /** Selected performance cycle — expert must analyze only this evaluation window */
  performanceCycle: {
    id: string
    name: string
    /** ISO timestamps from `performance_cycle.evaluation_period_*` (fallback: cycle start/end when unset) */
    evaluation_period_start_date: string
    evaluation_period_end_date: string
  }
}

function formatAnalysisPeriodForPrompt(locale: string, cycle: CompileSnapshotParams['performanceCycle']): string {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
  const start = new Date(cycle.evaluation_period_start_date)
  const end = new Date(cycle.evaluation_period_end_date)
  const fmt = new Intl.DateTimeFormat(locale, opts)
  const range =
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? `${cycle.evaluation_period_start_date} – ${cycle.evaluation_period_end_date}`
      : `${fmt.format(start)} – ${fmt.format(end)}`
  return `Performance cycle "${cycle.name}" · evaluation period ${range} (see team_data_snapshot.analysis_scope for evaluation_period_start_date and evaluation_period_end_date)`
}

function compileTeamSnapshot(params: CompileSnapshotParams): string {
  const { goals, skills, feedback, evaluations, performanceCycle } = params

  const snapshot = {
    analysis_scope: {
      performance_cycle_id: performanceCycle.id,
      performance_cycle_name: performanceCycle.name,
      evaluation_period_start_date: performanceCycle.evaluation_period_start_date,
      evaluation_period_end_date: performanceCycle.evaluation_period_end_date
    },
    goals: {
      summary: {
        totalGoals: goals.totalGoals,
        avgProgress: goals.averageTeamProgress,
        onTrack: goals.goalsOnTrack,
        atRisk: goals.goalsAtRisk,
        behind: goals.goalsBehindTarget,
        achieved: goals.goalsAchieved
      },
      members: goals.teamPerformance.map(m => ({
        name: `${m.firstName} ${m.lastName}`,
        totalGoals: m.totalGoals,
        avgProgress: m.averageProgress,
        onTrack: m.goalsOnTrack,
        atRisk: m.goalsAtRisk,
        behind: m.goalsBehindTarget,
        achieved: m.goalsAchieved
      }))
    },
    skills: {
      summary: {
        teamSkillCoverage: skills.teamSkillCoverage,
        totalSkills: skills.members.reduce((sum, m) => sum + m.skillCount, 0),
        topGaps: skills.topSkillGaps.slice(0, 5).map(g => g.skillName),
        topStrengths: skills.topTeamStrengths
      },
      members: skills.members.map(m => ({
        name: `${m.firstName} ${m.lastName}`,
        skillCount: m.skillCount,
        avgLevel: m.avgLevel,
        missingRequired: m.missingRequired.map(s => s.name),
        belowLevel: m.belowLevel.map(s => ({
          skill: s.skillName,
          has: s.employeeLevel,
          needs: s.profileLevel
        }))
      }))
    },
    feedback: {
      summary: {
        teamAvgRating: feedback.teamAvgRating,
        totalReceived: feedback.totalReceivedCount,
        totalGiven: feedback.totalGivenCount,
        feedbackCoverage: feedback.feedbackCoverage,
        recognitionRatio: feedback.recognitionRatio,
        membersWithNoRecentFeedback: feedback.membersWithNoRecentFeedback.map(id => {
          const member = feedback.members.find(m => m.employeeId === id)
          return member ? `${member.firstName} ${member.lastName}` : id
        })
      },
      members: feedback.members.map(m => ({
        name: `${m.firstName} ${m.lastName}`,
        received: m.feedbackReceivedCount,
        given: m.feedbackGivenCount,
        avgRating: m.avgRating,
        lastFeedbackDate: m.lastFeedbackDate,
        recognitionCount: m.recognitionCount,
        developmentalCount: m.developmentalCount
      }))
    },
    evaluations: {
      summary: {
        teamAvgScore: evaluations.teamAvgScore,
        teamCompanyValuesAvg: evaluations.teamCompanyValuesAvg,
        teamSkillsAvg: evaluations.teamSkillsAvg,
        pending: evaluations.pendingEvaluations,
        completed: evaluations.completedEvaluations
      },
      members: evaluations.members.map(m => ({
        name: `${m.firstName} ${m.lastName}`,
        latestScore: m.latestScore,
        companyValuesAvg: m.companyValuesAvg,
        skillsAvg: m.skillsAvg,
        changeOverall: m.changeOverall,
        changeCompanyValues: m.changeCompanyValues,
        changeSkills: m.changeSkills,
        cycleName: m.cycleName,
        status: m.status
      }))
    }
  }

  return JSON.stringify(snapshot)
}

function cacheKey(managerId: string, performanceCycleId: string): string {
  return `${CACHE_KEY_PREFIX}${managerId}_${performanceCycleId}`
}

function getCachedInsights(managerId: string, performanceCycleId: string): TeamPerformanceInsightsData | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(managerId, performanceCycleId))
    if (!raw) return null
    const cached = JSON.parse(raw) as { timestamp: number; data: TeamPerformanceInsightsData }
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      sessionStorage.removeItem(cacheKey(managerId, performanceCycleId))
      return null
    }
    return cached.data
  } catch {
    return null
  }
}

function setCachedInsights(managerId: string, performanceCycleId: string, data: TeamPerformanceInsightsData): void {
  try {
    sessionStorage.setItem(cacheKey(managerId, performanceCycleId), JSON.stringify({ timestamp: Date.now(), data }))
  } catch {
    // Session storage full or unavailable
  }
}

function parseInsightsResponse(content: unknown): TeamPerformanceInsightsData {
  if (typeof content !== 'string') {
    return content as TeamPerformanceInsightsData
  }

  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const open = '```'
    const openJson = '```json'
    const idxJson = trimmed.indexOf(openJson)
    const idxPlain = trimmed.indexOf(open)
    let startIdx: number
    if (idxJson >= 0 && (idxPlain < 0 || idxJson <= idxPlain)) {
      startIdx = idxJson + openJson.length
    } else if (idxPlain >= 0) {
      startIdx = idxPlain + open.length
    } else {
      throw new Error('Invalid insights response format')
    }
    const afterOpen = trimmed.slice(startIdx).trimStart()
    const closeIdx = afterOpen.indexOf(open)
    if (closeIdx < 0) throw new Error('Invalid insights response format')
    return JSON.parse(afterOpen.slice(0, closeIdx).trim())
  }
}

interface UseTeamPerformanceInsightsProps {
  accessToken: string
  managerId: string
  snapshotParams: CompileSnapshotParams | null
  /** Must match selected performance cycle so cache and prompts stay aligned */
  performanceCycleId: string | null
}

export const useTeamPerformanceInsights = ({
  accessToken,
  managerId,
  snapshotParams,
  performanceCycleId
}: UseTeamPerformanceInsightsProps): TeamPerformanceInsightsResult => {
  const [data, setData] = useState<TeamPerformanceInsightsData | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const client = usePromptManagerClient(accessToken)
  const abortRef = useRef(false)

  useEffect(() => {
    if (!managerId || !performanceCycleId) {
      setData(null)
      return
    }
    setData(getCachedInsights(managerId, performanceCycleId))
    setError(null)
  }, [managerId, performanceCycleId])

  const analyze = useCallback(async () => {
    if (!snapshotParams || !accessToken || !managerId || !performanceCycleId) {
      setError('Missing data for analysis')
      return
    }

    abortRef.current = false
    setIsAnalyzing(true)
    setError(null)

    try {
      const snapshot = compileTeamSnapshot(snapshotParams)
      const locale = getCurrentActiveUserLocale()
      const language = new Intl.DisplayNames([locale], { type: 'language' }).of(locale.split('-')[0]) ?? locale

      const periodDescription = formatAnalysisPeriodForPrompt(locale, snapshotParams.performanceCycle)

      const response = await client.executePromptWithOptions(TEAM_PERFORMANCE_ANALYZER_EXPERT_ID, {
        userParams: {
          manager_name: snapshotParams.managerName,
          team_size: String(snapshotParams.teamSize),
          period: periodDescription,
          team_data_snapshot: snapshot,
          language
        }
      })

      if (abortRef.current) return

      const parsed = parseInsightsResponse(response.content)
      setData(parsed)
      setCachedInsights(managerId, performanceCycleId, parsed)
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to analyze team performance'
        setError(message)
        console.error('Team performance insights error:', err)
      }
    } finally {
      if (!abortRef.current) {
        setIsAnalyzing(false)
      }
    }
  }, [snapshotParams, accessToken, managerId, performanceCycleId, client])

  const clear = useCallback(() => {
    abortRef.current = true
    setData(null)
    setError(null)
    setIsAnalyzing(false)
    if (managerId && performanceCycleId) {
      try {
        sessionStorage.removeItem(cacheKey(managerId, performanceCycleId))
      } catch {
        // ignore
      }
    }
  }, [managerId, performanceCycleId])

  return { data, isAnalyzing, error, analyze, clear }
}
