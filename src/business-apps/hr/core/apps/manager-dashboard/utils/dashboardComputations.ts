import type { TeamMemberEvaluation, EvaluationDimensionScore } from '../hooks/useTeamEvaluations'
import type { TeamMemberPerformance } from '../hooks/useTeamPerformance'
import type { TeamMemberFeedback } from '../hooks/useTeamFeedbackOverview'
import type { TeamMemberSkills } from '../hooks/useTeamSkills'

export interface DashboardAlert {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  severity: 'high' | 'medium' | 'low'
  reason: string
  context: string
  suggestedAction: string
  category:
    | 'score-drop'
    | 'goals-blocked'
    | 'no-feedback'
    | 'alignment-gap'
    | 'skill-gap'
    | 'stagnation'
    | 'growth-signal'
}

export type EmployeeSignalType =
  | 'strong-momentum'
  | 'growth-candidate'
  | 'development-momentum'
  | 'plateau-risk'
  | 'low-recognition'
  | 'low-feedback-participation'
  | 'declining-trajectory'
  | 'blocked-execution'
  | 'alignment-gap'

export type TeamSignalType =
  | 'growth-concentration-risk'
  | 'uneven-feedback-coverage'
  | 'team-execution-risk'
  | 'capability-gap'
  | 'values-alignment-gap'
  | 'standout-growth-cluster'
  | 'recognition-gap'

export type SignalCategory = 'positive' | 'attention' | 'warning'

export interface EmployeeSignal {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  signalType: EmployeeSignalType
  category: SignalCategory
  description: string
  supportingData: string[]
  suggestedAction: string
  isPrimary: boolean
}

export interface TeamSignal {
  signalType: TeamSignalType
  category: SignalCategory
  description: string
  supportingData: string[]
  suggestedAction: string
}

/** @deprecated Use EmployeeSignal instead */
export interface TalentSignal {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  signalType: EmployeeSignalType
  description: string
  supportingData: string[]
}

export interface ScoreDistributionBand {
  band: string
  count: number
  employees: string[]
}

export interface TrendDataPoint {
  cycleName: string
  overall: number | null
  companyValues: number | null
  skills: number | null
}

export interface DimensionAverage {
  name: string
  teamAvg: number | null
  selfAvg: number | null
  peerAvg: number | null
  managerAvg: number | null
}

export interface AlignmentGap {
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  selfAvg: number | null
  peerAvg: number | null
  managerAvg: number | null
  gap: number
}

export function computeScoreDistribution(
  members: TeamMemberEvaluation[],
  ratingScaleLimit: number = 5
): ScoreDistributionBand[] {
  const step = ratingScaleLimit / 5
  const bands: ScoreDistributionBand[] = [
    { band: 'Low', count: 0, employees: [] },
    { band: 'Developing', count: 0, employees: [] },
    { band: 'Solid', count: 0, employees: [] },
    { band: 'Strong', count: 0, employees: [] },
    { band: 'Top', count: 0, employees: [] }
  ]

  for (const m of members) {
    if (m.latestScore == null) continue
    const name = `${m.firstName} ${m.lastName}`
    const idx = Math.min(Math.floor(m.latestScore / step), 4)
    bands[idx].count++
    bands[idx].employees.push(name)
  }

  return bands
}

export function computeTrendSeries(members: TeamMemberEvaluation[]): TrendDataPoint[] {
  if (members.length === 0) return []

  const cycleMap = new Map<
    string,
    {
      overallSum: number
      overallCount: number
      cvSum: number
      cvCount: number
      skillsSum: number
      skillsCount: number
      evalEndDate: string | null
    }
  >()

  for (const m of members) {
    for (const cs of m.cycleScores) {
      if (!cycleMap.has(cs.cycleName)) {
        cycleMap.set(cs.cycleName, {
          overallSum: 0,
          overallCount: 0,
          cvSum: 0,
          cvCount: 0,
          skillsSum: 0,
          skillsCount: 0,
          evalEndDate: cs.evaluationPeriodEndDate
        })
      }
      const entry = cycleMap.get(cs.cycleName)!
      if (cs.overallScore != null) {
        entry.overallSum += cs.overallScore
        entry.overallCount++
      }
      if (cs.companyValuesAvg != null) {
        entry.cvSum += cs.companyValuesAvg
        entry.cvCount++
      }
      if (cs.skillsAvg != null) {
        entry.skillsSum += cs.skillsAvg
        entry.skillsCount++
      }
    }
  }

  return Array.from(cycleMap.entries())
    .sort((a, b) => (a[1].evalEndDate ?? '').localeCompare(b[1].evalEndDate ?? ''))
    .map(([name, e]) => ({
      cycleName: name,
      overall: e.overallCount > 0 ? Math.round((e.overallSum / e.overallCount) * 10) / 10 : null,
      companyValues: e.cvCount > 0 ? Math.round((e.cvSum / e.cvCount) * 10) / 10 : null,
      skills: e.skillsCount > 0 ? Math.round((e.skillsSum / e.skillsCount) * 10) / 10 : null
    }))
}

export function generateAlerts(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  skills: TeamMemberSkills[]
): DashboardAlert[] {
  const alerts: DashboardAlert[] = []

  const goalsMap = new Map(goals.map(g => [g.employeeId, g]))
  const feedbackMap = new Map(feedback.map(f => [f.employeeId, f]))
  const skillsMap = new Map(skills.map(s => [s.employeeId, s]))

  for (const ev of evaluations) {
    const name = `${ev.firstName} ${ev.lastName}`
    const empGoals = goalsMap.get(ev.employeeId)
    const empFeedback = feedbackMap.get(ev.employeeId)
    const empSkills = skillsMap.get(ev.employeeId)

    if (ev.changeOverall != null && ev.changeOverall < -0.5) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'high',
        reason: 'Overall score dropped significantly',
        context: `Score changed by ${ev.changeOverall > 0 ? '+' : ''}${ev.changeOverall.toFixed(1)} vs previous cycle`,
        suggestedAction: 'Schedule a coaching 1:1',
        category: 'score-drop'
      })
    }

    if (empGoals && empGoals.totalGoals > 0 && empGoals.averageProgress < 30) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'high',
        reason: 'Very low goals progress',
        context: `${empGoals.averageProgress}% average progress across ${empGoals.totalGoals} goals`,
        suggestedAction: 'Review goals and remove blockers',
        category: 'goals-blocked'
      })
    }

    if (empGoals && empGoals.totalGoals > 0) {
      const troubleGoals = empGoals.goalsAtRisk + empGoals.goalsBehindTarget
      if (troubleGoals > empGoals.totalGoals * 0.5) {
        const existing = alerts.find(a => a.employeeId === ev.employeeId && a.category === 'goals-blocked')
        if (!existing) {
          alerts.push({
            employeeId: ev.employeeId,
            employeeName: name,
            pictureThumbnail: ev.pictureThumbnail,
            severity: 'medium',
            reason: 'Majority of goals at risk or behind',
            context: `${troubleGoals} of ${empGoals.totalGoals} goals need attention`,
            suggestedAction: 'Prioritize and realign goals',
            category: 'goals-blocked'
          })
        }
      }
    }

    if (empFeedback && empFeedback.feedbackReceivedCount === 0) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'medium',
        reason: 'No feedback received recently',
        context: 'No feedback in the last 30 days',
        suggestedAction: 'Encourage peer feedback or give direct feedback',
        category: 'no-feedback'
      })
    }

    if (ev.companyValues.length > 0) {
      const selfScores = ev.companyValues.filter(v => v.selfScore != null).map(v => v.selfScore!)
      const mgrScores = ev.companyValues.filter(v => v.managerScore != null).map(v => v.managerScore!)
      if (selfScores.length > 0 && mgrScores.length > 0) {
        const selfAvg = selfScores.reduce((a, b) => a + b, 0) / selfScores.length
        const mgrAvg = mgrScores.reduce((a, b) => a + b, 0) / mgrScores.length
        if (Math.abs(selfAvg - mgrAvg) > 1.0) {
          alerts.push({
            employeeId: ev.employeeId,
            employeeName: name,
            pictureThumbnail: ev.pictureThumbnail,
            severity: 'medium',
            reason: 'Self-assessment vs manager gap',
            context: `Self avg: ${selfAvg.toFixed(1)}, Manager avg: ${mgrAvg.toFixed(1)}`,
            suggestedAction: 'Align on expectations in next review',
            category: 'alignment-gap'
          })
        }
      }
    }

    if (empSkills && !empSkills.hasJobProfile) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'medium',
        reason: 'No job profile skills defined',
        context: 'Skill coverage cannot be measured',
        suggestedAction: 'Assign a job profile with required skills',
        category: 'skill-gap'
      })
    } else if (empSkills && empSkills.missingRequired.length > 2) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'medium',
        reason: 'Multiple required skills missing',
        context: `${empSkills.missingRequired.length} required skills not covered`,
        suggestedAction: 'Create a skill development plan',
        category: 'skill-gap'
      })
    }

    if (
      ev.changeOverall != null &&
      ev.changeOverall > 0.5 &&
      empGoals &&
      empGoals.goalsOnTrack > empGoals.goalsAtRisk
    ) {
      alerts.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        severity: 'low',
        reason: 'Strong positive momentum',
        context: `Score improved by +${ev.changeOverall.toFixed(1)} with goals on track`,
        suggestedAction: 'Recognize achievements and explore growth',
        category: 'growth-signal'
      })
    }
  }

  alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return alerts
}

const EMPLOYEE_SIGNAL_PRIORITY: EmployeeSignalType[] = [
  'declining-trajectory',
  'blocked-execution',
  'alignment-gap',
  'plateau-risk',
  'low-feedback-participation',
  'low-recognition',
  'strong-momentum',
  'growth-candidate',
  'development-momentum'
]

export function detectEmployeeSignals(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _skills: TeamMemberSkills[]
): EmployeeSignal[] {
  const goalsMap = new Map(goals.map(g => [g.employeeId, g]))
  const feedbackMap = new Map(feedback.map(f => [f.employeeId, f]))
  const allRaw: EmployeeSignal[] = []

  for (const ev of evaluations) {
    const name = `${ev.firstName} ${ev.lastName}`
    const empGoals = goalsMap.get(ev.employeeId)
    const empFeedback = feedbackMap.get(ev.employeeId)
    const scaleLimit = ev.ratingScaleLimit ?? 5
    const hasCycleHistory = ev.cycleScores.length >= 2

    // Strong Momentum
    if (
      hasCycleHistory &&
      ev.changeOverall != null &&
      ev.changeOverall > 0.5 &&
      ev.latestScore != null &&
      ev.latestScore >= scaleLimit * 0.5 &&
      empGoals &&
      empGoals.totalGoals >= 1 &&
      empGoals.goalsOnTrack > empGoals.goalsAtRisk
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'strong-momentum',
        category: 'positive',
        description: 'Consistent improvement across scores and goal execution',
        supportingData: [
          `Score improved by +${ev.changeOverall.toFixed(1)} since last cycle`,
          `${empGoals.goalsOnTrack} of ${empGoals.totalGoals} goals on track`
        ],
        suggestedAction: 'Recognize progress. Discuss stretch opportunities in next 1:1.',
        isPrimary: false
      })
    }

    // Growth Candidate
    if (
      ev.latestScore != null &&
      ev.latestScore >= scaleLimit * 0.8 &&
      empGoals &&
      empGoals.totalGoals >= 2 &&
      empGoals.averageProgress >= 70 &&
      (ev.companyValuesAvg == null || ev.companyValuesAvg >= scaleLimit * 0.6)
    ) {
      const sd = [
        `Overall score: ${ev.latestScore.toFixed(1)}/${scaleLimit}`,
        `${empGoals.averageProgress}% average goal progress`
      ]
      if (ev.companyValuesAvg != null) sd.push(`Values score: ${ev.companyValuesAvg.toFixed(1)}`)
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'growth-candidate',
        category: 'positive',
        description: 'Consistently scores high and delivers on goals — may be ready for expanded responsibilities',
        supportingData: sd,
        suggestedAction: 'Discuss career development. Consider for stretch assignments or leadership opportunities.',
        isPrimary: false
      })
    }

    // Development Momentum
    if (
      hasCycleHistory &&
      ev.changeSkills != null &&
      ev.changeSkills > 0.5 &&
      ev.changeOverall != null &&
      ev.changeOverall > 0
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'development-momentum',
        category: 'positive',
        description: 'Significant skill growth alongside improving performance',
        supportingData: [
          `Skills score improved by +${ev.changeSkills.toFixed(1)}`,
          `Overall score change: +${ev.changeOverall.toFixed(1)}`
        ],
        suggestedAction: 'Acknowledge development efforts. Identify next skill areas to focus on.',
        isPrimary: false
      })
    }

    // Plateau Risk — exclude stable high performers
    if (
      hasCycleHistory &&
      ev.changeOverall != null &&
      Math.abs(ev.changeOverall) < 0.2 &&
      ev.changeSkills != null &&
      Math.abs(ev.changeSkills) < 0.2 &&
      empFeedback &&
      empFeedback.feedbackReceivedCount < 3 &&
      !(ev.latestScore != null && ev.latestScore >= scaleLimit * 0.8)
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'plateau-risk',
        category: 'attention',
        description: 'Scores and skills have remained flat across cycles with minimal feedback activity',
        supportingData: [
          `Score change: ${ev.changeOverall.toFixed(1)}`,
          `Skills change: ${ev.changeSkills.toFixed(1)}`,
          `${empFeedback.feedbackReceivedCount} feedback received`
        ],
        suggestedAction: 'Have a development conversation. Explore whether they need new challenges or support.',
        isPrimary: false
      })
    }

    // Low Recognition
    if (
      ev.latestScore != null &&
      ev.latestScore >= scaleLimit * 0.6 &&
      empFeedback &&
      empFeedback.feedbackReceivedCount <= 1
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'low-recognition',
        category: 'attention',
        description: 'Solid performer receiving very little feedback from peers and managers',
        supportingData: [
          `Score: ${ev.latestScore.toFixed(1)}/${scaleLimit}`,
          `Only ${empFeedback.feedbackReceivedCount} feedback received this cycle`
        ],
        suggestedAction: 'Encourage peers to provide feedback. Ensure contributions are visible.',
        isPrimary: false
      })
    }

    // Low Feedback Participation — skip for very small teams
    if (
      empFeedback &&
      empFeedback.feedbackReceivedCount <= 1 &&
      empFeedback.feedbackGivenCount <= 1 &&
      evaluations.length >= 3
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'low-feedback-participation',
        category: 'attention',
        description: 'Not actively participating in the feedback culture — neither giving nor receiving',
        supportingData: [
          `${empFeedback.feedbackReceivedCount} feedback received`,
          `${empFeedback.feedbackGivenCount} feedback given`
        ],
        suggestedAction: 'Discuss the value of feedback participation. Set expectations for peer feedback.',
        isPrimary: false
      })
    }

    // Declining Trajectory
    if (
      hasCycleHistory &&
      ev.latestScore != null &&
      ev.latestScore >= scaleLimit * 0.7 &&
      ev.changeOverall != null &&
      ev.changeOverall < -0.3 &&
      empFeedback &&
      empFeedback.feedbackReceivedCount < 3
    ) {
      allRaw.push({
        employeeId: ev.employeeId,
        employeeName: name,
        pictureThumbnail: ev.pictureThumbnail,
        signalType: 'declining-trajectory',
        category: 'warning',
        description: 'Scores are dropping despite a strong baseline',
        supportingData: [
          `Score dropped by ${ev.changeOverall.toFixed(1)} from last cycle`,
          `Current score: ${ev.latestScore.toFixed(1)}/${scaleLimit}`,
          `Only ${empFeedback.feedbackReceivedCount} feedback received`
        ],
        suggestedAction: 'Schedule a 1:1 to understand context. Check for workload, blockers, or personal factors.',
        isPrimary: false
      })
    }

    // Blocked Execution
    if (empGoals && empGoals.totalGoals >= 2) {
      const blocked = empGoals.goalsBehindTarget
      if (blocked >= 2 && empGoals.averageProgress < 40) {
        allRaw.push({
          employeeId: ev.employeeId,
          employeeName: name,
          pictureThumbnail: ev.pictureThumbnail,
          signalType: 'blocked-execution',
          category: 'warning',
          description: 'Multiple goals behind target despite otherwise adequate performance',
          supportingData: [`${blocked} goals behind target`, `${empGoals.averageProgress}% average progress`],
          suggestedAction: 'Review blockers together. Reprioritize or remove obstacles.',
          isPrimary: false
        })
      }
    }

    // Alignment Gap
    const allDimensions = [...ev.companyValues, ...ev.skills]
    const selfScores = allDimensions.filter(d => d.selfScore != null).map(d => d.selfScore!)
    const peerScores = allDimensions.filter(d => d.peerAvgScore != null).map(d => d.peerAvgScore!)
    const mgrScores = allDimensions.filter(d => d.managerScore != null).map(d => d.managerScore!)
    const avgArr = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
    const selfAvg = avgArr(selfScores)
    const peerAvg = avgArr(peerScores)
    const mgrAvg = avgArr(mgrScores)
    const perspectiveValues = [selfAvg, peerAvg, mgrAvg].filter((v): v is number => v !== null)
    if (perspectiveValues.length >= 2) {
      const maxGap = Math.max(...perspectiveValues) - Math.min(...perspectiveValues)
      if (maxGap > 1.0) {
        const parts: string[] = []
        if (selfAvg != null) parts.push(`Self: ${selfAvg.toFixed(1)}`)
        if (peerAvg != null) parts.push(`Peer avg: ${peerAvg.toFixed(1)}`)
        if (mgrAvg != null) parts.push(`Manager: ${mgrAvg.toFixed(1)}`)
        allRaw.push({
          employeeId: ev.employeeId,
          employeeName: name,
          pictureThumbnail: ev.pictureThumbnail,
          signalType: 'alignment-gap',
          category: 'warning',
          description: `Significant divergence between assessment perspectives — gap of ${maxGap.toFixed(1)} points`,
          supportingData: parts,
          suggestedAction: 'Discuss perception differences. Use specific examples to align expectations.',
          isPrimary: false
        })
      }
    }
  }

  // Assign primary signal per employee (highest priority wins)
  const byEmployee = new Map<string, EmployeeSignal[]>()
  for (const s of allRaw) {
    const list = byEmployee.get(s.employeeId) ?? []
    list.push(s)
    byEmployee.set(s.employeeId, list)
  }
  const result: EmployeeSignal[] = []
  for (const [, empSignals] of byEmployee) {
    empSignals.sort(
      (a, b) => EMPLOYEE_SIGNAL_PRIORITY.indexOf(a.signalType) - EMPLOYEE_SIGNAL_PRIORITY.indexOf(b.signalType)
    )
    empSignals.forEach((s, i) => {
      s.isPrimary = i === 0
    })
    result.push(...empSignals)
  }

  return result
}

export function detectTeamSignals(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  employeeSignals: EmployeeSignal[]
): TeamSignal[] {
  const signals: TeamSignal[] = []
  const teamSize = evaluations.length
  if (teamSize < 3) return signals

  // Growth Concentration Risk
  if (teamSize >= 4) {
    const skillChanges = evaluations
      .filter(ev => ev.changeSkills != null && ev.changeSkills > 0)
      .map(ev => ({ id: ev.employeeId, change: ev.changeSkills! }))
    const totalGrowth = skillChanges.reduce((sum, e) => sum + e.change, 0)
    if (totalGrowth > 0.2) {
      skillChanges.sort((a, b) => b.change - a.change)
      const topQuarter = Math.max(1, Math.ceil(skillChanges.length * 0.25))
      const topGrowth = skillChanges.slice(0, topQuarter).reduce((s, e) => s + e.change, 0)
      if (topGrowth / totalGrowth >= 0.7) {
        signals.push({
          signalType: 'growth-concentration-risk',
          category: 'attention',
          description: `${Math.round((topGrowth / totalGrowth) * 100)}% of team skill improvement came from ${topQuarter} of ${skillChanges.length} team members`,
          supportingData: [`Top ${topQuarter} contributor${topQuarter > 1 ? 's' : ''} account for most growth`],
          suggestedAction: 'Distribute development opportunities more broadly. Review training and mentoring plans.'
        })
      }
    }
  }

  // Uneven Feedback Coverage
  const feedbackCounts = feedback.map(f => f.feedbackReceivedCount)
  const totalFeedback = feedbackCounts.reduce((s, c) => s + c, 0)
  if (totalFeedback >= 5) {
    const membersWithFeedback = feedbackCounts.filter(c => c > 0).length
    const coverage = (membersWithFeedback / teamSize) * 100
    if (coverage < 60) {
      signals.push({
        signalType: 'uneven-feedback-coverage',
        category: 'attention',
        description: `Only ${membersWithFeedback} of ${teamSize} team members have received feedback this cycle`,
        supportingData: [`${Math.round(coverage)}% coverage`],
        suggestedAction: 'Encourage a culture of regular feedback. Set team-wide feedback norms.'
      })
    }
  }

  // Team Execution Risk
  const membersWithBlockedGoals = goals.filter(
    g => g.totalGoals > 0 && (g.goalsBehindTarget > 0 || g.goalsAtRisk > g.goalsOnTrack)
  ).length
  if (goals.length >= 3 && membersWithBlockedGoals / goals.length >= 0.4) {
    signals.push({
      signalType: 'team-execution-risk',
      category: 'warning',
      description: `${membersWithBlockedGoals} of ${goals.length} team members have goals behind target or at risk`,
      supportingData: [`${Math.round((membersWithBlockedGoals / goals.length) * 100)}% of team affected`],
      suggestedAction: 'Review team-wide blockers. Consider reprioritization or resource reallocation.'
    })
  }

  // Capability Gap
  const skillDimMap = new Map<string, number[]>()
  for (const ev of evaluations) {
    for (const s of ev.skills) {
      if (s.overallAvg != null) {
        const arr = skillDimMap.get(s.name) ?? []
        arr.push(s.overallAvg)
        skillDimMap.set(s.name, arr)
      }
    }
  }
  const scaleLimit = evaluations[0]?.ratingScaleLimit ?? 5
  for (const [skillName, scores] of skillDimMap) {
    if (scores.length >= 3) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg < scaleLimit * 0.4) {
        signals.push({
          signalType: 'capability-gap',
          category: 'attention',
          description: `${skillName} averages ${avg.toFixed(1)}/${scaleLimit} across the team — the lowest of all skills`,
          supportingData: [`${scores.length} team members evaluated`, `Team average: ${avg.toFixed(1)}`],
          suggestedAction: 'Plan targeted team development. Consider workshops, coaching, or hiring for the gap.'
        })
      }
    }
  }

  // Values Alignment Gap
  const valueDimMap = new Map<string, number[]>()
  for (const ev of evaluations) {
    for (const v of ev.companyValues) {
      if (v.overallAvg != null) {
        const arr = valueDimMap.get(v.name) ?? []
        arr.push(v.overallAvg)
        valueDimMap.set(v.name, arr)
      }
    }
  }
  for (const [valueName, scores] of valueDimMap) {
    if (scores.length >= 3) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      if (avg < scaleLimit * 0.5) {
        signals.push({
          signalType: 'values-alignment-gap',
          category: 'attention',
          description: `${valueName} averages ${avg.toFixed(1)}/${scaleLimit} — below the expected baseline`,
          supportingData: [`${scores.length} team members evaluated`],
          suggestedAction: 'Reinforce the value through team discussions and role modeling.'
        })
      }
    }
  }

  // Standout Growth Cluster (depends on employee signals)
  const growthSignalCount = employeeSignals.filter(
    s => s.isPrimary && (s.signalType === 'strong-momentum' || s.signalType === 'development-momentum')
  ).length
  if (teamSize >= 5 && growthSignalCount >= 3) {
    signals.push({
      signalType: 'standout-growth-cluster',
      category: 'positive',
      description: `${growthSignalCount} of ${teamSize} team members are showing strong performance or skill growth this cycle`,
      supportingData: [],
      suggestedAction: "Celebrate team progress. Identify what's working and reinforce it."
    })
  }

  // Recognition Gap for Strong Performers
  const lowRecognitionCount = employeeSignals.filter(s => s.signalType === 'low-recognition').length
  if (lowRecognitionCount >= 2) {
    signals.push({
      signalType: 'recognition-gap',
      category: 'attention',
      description: `${lowRecognitionCount} strong performers have received little or no feedback this cycle`,
      supportingData: [],
      suggestedAction: 'Create visibility for strong contributors. Prompt peer feedback and recognition.'
    })
  }

  // Sort: warning first, then attention, then positive
  const categoryOrder: Record<SignalCategory, number> = { warning: 0, attention: 1, positive: 2 }
  signals.sort((a, b) => categoryOrder[a.category] - categoryOrder[b.category])

  return signals
}

/** @deprecated Use detectEmployeeSignals instead */
export function detectTalentSignals(
  evaluations: TeamMemberEvaluation[],
  goals: TeamMemberPerformance[],
  feedback: TeamMemberFeedback[],
  skills: TeamMemberSkills[]
): TalentSignal[] {
  return detectEmployeeSignals(evaluations, goals, feedback, skills).map(s => ({
    employeeId: s.employeeId,
    employeeName: s.employeeName,
    pictureThumbnail: s.pictureThumbnail,
    signalType: s.signalType,
    description: s.description,
    supportingData: s.supportingData
  }))
}

export function computeTeamDimensionAverages(
  members: TeamMemberEvaluation[],
  dimension: 'companyValues' | 'skills'
): DimensionAverage[] {
  const nameMap = new Map<
    string,
    { selfScores: number[]; peerScores: number[]; mgrScores: number[]; allScores: number[] }
  >()

  for (const m of members) {
    const entries: EvaluationDimensionScore[] = dimension === 'companyValues' ? m.companyValues : m.skills
    for (const entry of entries) {
      if (!nameMap.has(entry.name)) {
        nameMap.set(entry.name, { selfScores: [], peerScores: [], mgrScores: [], allScores: [] })
      }
      const agg = nameMap.get(entry.name)!
      if (entry.selfScore != null) agg.selfScores.push(entry.selfScore)
      if (entry.peerAvgScore != null) agg.peerScores.push(entry.peerAvgScore)
      if (entry.managerScore != null) agg.mgrScores.push(entry.managerScore)
      if (entry.overallAvg != null) agg.allScores.push(entry.overallAvg)
    }
  }

  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null

  return Array.from(nameMap.entries())
    .map(([name, agg]) => ({
      name,
      teamAvg: avg(agg.allScores),
      selfAvg: avg(agg.selfScores),
      peerAvg: avg(agg.peerScores),
      managerAvg: avg(agg.mgrScores)
    }))
    .sort((a, b) => (b.teamAvg ?? 0) - (a.teamAvg ?? 0))
}

export function computeAlignmentGaps(members: TeamMemberEvaluation[]): AlignmentGap[] {
  return members
    .map(m => {
      const allDimensions = [...m.companyValues, ...m.skills]
      const selfScores = allDimensions.filter(d => d.selfScore != null).map(d => d.selfScore!)
      const peerScores = allDimensions.filter(d => d.peerAvgScore != null).map(d => d.peerAvgScore!)
      const mgrScores = allDimensions.filter(d => d.managerScore != null).map(d => d.managerScore!)

      const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
      const selfAvg = avg(selfScores)
      const peerAvg = avg(peerScores)
      const managerAvg = avg(mgrScores)

      const values = [selfAvg, peerAvg, managerAvg].filter((v): v is number => v !== null)
      const gap = values.length >= 2 ? Math.round((Math.max(...values) - Math.min(...values)) * 10) / 10 : 0

      return {
        employeeId: m.employeeId,
        employeeName: `${m.firstName} ${m.lastName}`,
        pictureThumbnail: m.pictureThumbnail,
        selfAvg,
        peerAvg,
        managerAvg,
        gap
      }
    })
    .sort((a, b) => b.gap - a.gap)
}
